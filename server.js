const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// ============================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ============================================

function autenticarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ erro: 'Token não fornecido' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ erro: 'Token inválido' });
        }
        req.user = user;
        next();
    });
}

function verificarAdmin(req, res, next) {
    if (req.user.tipo !== 'admin') {
        return res.status(403).json({ erro: 'Acesso negado. Requer privilégios de administrador.' });
    }
    next();
}

function verificarEquipeTI(req, res, next) {
    if (req.user.tipo !== 'ti' && req.user.tipo !== 'admin') {
        return res.status(403).json({ erro: 'Acesso negado. Requer usuario da equipe de TI.' });
    }
    next();
}

async function validarSenha(senhaInformada, senhaArmazenada) {
    if (!senhaArmazenada) {
        return false;
    }

    if (senhaArmazenada.startsWith('$2a$') || senhaArmazenada.startsWith('$2b$') || senhaArmazenada.startsWith('$2y$')) {
        return bcrypt.compare(senhaInformada, senhaArmazenada);
    }

    return senhaInformada === senhaArmazenada;
}

// ============================================
// ROTAS DE AUTENTICAÇÃO
// ============================================

app.post('/api/login', async (req, res) => {
    const { login, senha } = req.body;

    try {
        const loginBusca = String(login || '').trim().toLowerCase();
        const [rows] = await pool.query(
            'SELECT id, nome, email, ramal, setor, login, tipo, senha FROM usuarios WHERE login = ? OR email = ?',
            [loginBusca, loginBusca]
        );

        if (rows.length === 0) {
            return res.status(401).json({ erro: 'Usuário não encontrado' });
        }

        const user = rows[0];
        const senhaValida = await validarSenha(senha, user.senha);

        if (!senhaValida) {
            return res.status(401).json({ erro: 'Senha incorreta' });
        }

        if (!user.senha.startsWith('$2')) {
            const senhaHash = await bcrypt.hash(senha, 10);
            await pool.query('UPDATE usuarios SET senha = ? WHERE id = ?', [senhaHash, user.id]);
        }

        const token = jwt.sign(
            { id: user.id, login: user.login, tipo: user.tipo, nome: user.nome },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                nome: user.nome,
                email: user.email,
                ramal: user.ramal,
                setor: user.setor,
                login: user.login,
                tipo: user.tipo
            }
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ erro: 'Erro interno do servidor' });
    }
});

// ============================================
// ROTAS DE USUÁRIOS (ADMIN)
// ============================================

app.post('/api/cadastro', async (req, res) => {
    const { nome, email, ramal, setor, senha, tipo = 'comum' } = req.body;
    const login = String(email || '').trim().toLowerCase();

    if (!nome || !email || !ramal || !setor || !senha) {
        return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios.' });
    }

    try {
        const [existente] = await pool.query(
            'SELECT id FROM usuarios WHERE email = ? OR login = ?',
            [email, login]
        );

        if (existente.length > 0) {
            return res.status(400).json({ erro: 'Login já existe' });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const [result] = await pool.query(
            'INSERT INTO usuarios (nome, email, ramal, setor, login, senha, tipo) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nome, email, ramal, setor, login, senhaHash, tipo]
        );

        res.status(201).json({
            mensagem: 'Usuário criado com sucesso',
            user: {
                id: result.insertId,
                nome,
                email,
                ramal,
                setor,
                login,
                tipo
            }
        });
    } catch (error) {
        console.error('Erro ao criar usuário no cadastro:', error);
        res.status(500).json({ erro: 'Erro interno do servidor' });
    }
});

app.get('/api/usuarios', autenticarToken, verificarAdmin, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, nome, email, ramal, setor, login, tipo FROM usuarios'
        );
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({ erro: 'Erro interno do servidor' });
    }
});

app.post('/api/usuarios', autenticarToken, verificarAdmin, async (req, res) => {
    const { nome, email, ramal, setor, login, senha, tipo } = req.body;
    
    try {
        const [existing] = await pool.query('SELECT id FROM usuarios WHERE login = ?', [login]);
        if (existing.length > 0) {
            return res.status(400).json({ erro: 'Login já existe' });
        }
        
        const senhaHash = await bcrypt.hash(senha, 10);
        
        const [result] = await pool.query(
            'INSERT INTO usuarios (nome, email, ramal, setor, login, senha, tipo) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nome, email, ramal, setor, login, senhaHash, tipo]
        );
        
        res.status(201).json({
            id: result.insertId,
            nome, email, ramal, setor, login, tipo
        });
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({ erro: 'Erro interno do servidor' });
    }
});

app.put('/api/usuarios/:id', autenticarToken, verificarAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { nome, email, ramal, setor, login, senha, tipo } = req.body;
    
    try {
        if (senha) {
            const senhaHash = await bcrypt.hash(senha, 10);
            await pool.query(
                'UPDATE usuarios SET nome=?, email=?, ramal=?, setor=?, login=?, senha=?, tipo=? WHERE id=?',
                [nome, email, ramal, setor, login, senhaHash, tipo, id]
            );
        } else {
            await pool.query(
                'UPDATE usuarios SET nome=?, email=?, ramal=?, setor=?, login=?, tipo=? WHERE id=?',
                [nome, email, ramal, setor, login, tipo, id]
            );
        }
        
        res.json({ mensagem: 'Usuário atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ erro: 'Erro interno do servidor' });
    }
});

app.delete('/api/usuarios/:id', autenticarToken, verificarAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (id === 1) {
        return res.status(400).json({ erro: 'Não é possível excluir o administrador principal' });
    }
    
    try {
        await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);
        res.status(204).send();
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        res.status(500).json({ erro: 'Erro interno do servidor' });
    }
});

// ============================================
// ROTAS DE CHAMADOS
// ============================================

app.get('/api/chamados', autenticarToken, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT c.*, 
                   COALESCE(h.motivo, '') as ultimo_motivo_suspensao,
                   h.data_suspensao
            FROM chamados c
            LEFT JOIN historico_suspensoes h ON c.id = h.chamado_id AND h.id = (
                SELECT id FROM historico_suspensoes WHERE chamado_id = c.id ORDER BY data_suspensao DESC LIMIT 1
            )
            ORDER BY c.data_criacao DESC
        `);
        
        const chamadosComHistorico = await Promise.all(rows.map(async (chamado) => {
            const [historico] = await pool.query(
                'SELECT * FROM historico_suspensoes WHERE chamado_id = ? ORDER BY data_suspensao DESC',
                [chamado.id]
            );
            return { ...chamado, historicoSuspensoes: historico };
        }));
        
        res.json(chamadosComHistorico);
    } catch (error) {
        console.error('Erro ao buscar chamados:', error);
        res.status(500).json({ erro: 'Erro interno do servidor' });
    }
});

app.post('/api/chamados', autenticarToken, async (req, res) => {
    const { equipe, categoria, descricao, setor, ramal, campoBonus = '' } = req.body;

    if (!equipe || !categoria || !descricao || !setor || !ramal) {
        return res.status(400).json({ erro: 'Preencha todos os campos obrigatorios.' });
    }

    try {
        const [usuarios] = await pool.query(
            'SELECT id, nome, email FROM usuarios WHERE id = ?',
            [req.user.id]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({ erro: 'Usuario solicitante nao encontrado.' });
        }

        const solicitante = usuarios[0];
        const [result] = await pool.query(
            `INSERT INTO chamados
                (equipe, categoria, descricao, setor, ramal, solicitante_id, solicitante_nome, solicitante_email, campo_bonus)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                equipe,
                categoria,
                descricao,
                setor,
                ramal,
                solicitante.id,
                solicitante.nome,
                solicitante.email || req.user.login || '',
                campoBonus
            ]
        );

        res.status(201).json({ mensagem: 'Chamado criado com sucesso', id: result.insertId });
    } catch (error) {
        console.error('Erro ao criar chamado:', error);
        res.status(500).json({ erro: 'Erro interno do servidor' });
    }
});

app.put('/api/chamados/:id/capturar', autenticarToken, verificarEquipeTI, async (req, res) => {
    const id = parseInt(req.params.id);
    
    try {
        const [chamado] = await pool.query('SELECT status, tecnico_responsavel FROM chamados WHERE id = ?', [id]);
        
        if (chamado.length === 0) {
            return res.status(404).json({ erro: 'Chamado não encontrado' });
        }
        
        if (chamado[0].status === 'fechado') {
            return res.status(400).json({ erro: 'Chamado não pode ser capturado' });
        }

        if (chamado[0].tecnico_responsavel === req.user.nome) {
            return res.status(400).json({ erro: 'Este chamado já está atribuído a você' });
        }
        
        await pool.query(
            'UPDATE chamados SET status = "em_andamento", tecnico_responsavel = ? WHERE id = ?',
            [req.user.nome, id]
        );
        
        res.json({ mensagem: 'Chamado capturado com sucesso' });
    } catch (error) {
        console.error('Erro ao capturar chamado:', error);
        res.status(500).json({ erro: 'Erro interno do servidor' });
    }
});

app.put('/api/chamados/:id/fechar', autenticarToken, verificarEquipeTI, async (req, res) => {
    const id = parseInt(req.params.id);
    const { solucao, houveTroca, tipoTroca, houveRemanejamento, remanejamentoOrigem, remanejamentoDestino } = req.body;
    
    try {
        const [chamado] = await pool.query('SELECT status, tecnico_responsavel FROM chamados WHERE id = ?', [id]);
        
        if (chamado.length === 0) {
            return res.status(404).json({ erro: 'Chamado não encontrado' });
        }
        
        if (chamado[0].status !== 'em_andamento') {
            return res.status(400).json({ erro: 'Chamado não está em andamento' });
        }
        
        if (chamado[0].tecnico_responsavel !== req.user.nome) {
            return res.status(403).json({ erro: 'Você não é o responsável por este chamado' });
        }
        
        await pool.query(
            `UPDATE chamados SET 
                status = "fechado", 
                data_fechamento = NOW(), 
                solucao = ?,
                houve_troca = ?,
                tipo_troca = ?,
                houve_remanejamento = ?,
                remanejamento_origem = ?,
                remanejamento_destino = ?
             WHERE id = ?`,
            [solucao, houveTroca, tipoTroca, houveRemanejamento, remanejamentoOrigem, remanejamentoDestino, id]
        );
        
        res.json({ mensagem: 'Chamado finalizado com sucesso' });
    } catch (error) {
        console.error('Erro ao finalizar chamado:', error);
        res.status(500).json({ erro: 'Erro interno do servidor' });
    }
});

app.put('/api/chamados/:id/suspender', autenticarToken, verificarEquipeTI, async (req, res) => {
    const id = parseInt(req.params.id);
    const { motivo } = req.body;
    
    try {
        const [chamado] = await pool.query('SELECT status FROM chamados WHERE id = ?', [id]);
        
        if (chamado.length === 0) {
            return res.status(404).json({ erro: 'Chamado não encontrado' });
        }
        
        if (chamado[0].status === 'fechado') {
            return res.status(400).json({ erro: 'Chamado já está fechado' });
        }
        
        await pool.query(
            'UPDATE chamados SET status = "suspenso", tecnico_responsavel = NULL, ultimo_motivo_suspensao = ?, data_suspensao = NOW() WHERE id = ?',
            [motivo, id]
        );
        
        await pool.query(
            'INSERT INTO historico_suspensoes (chamado_id, suspenso_por, motivo) VALUES (?, ?, ?)',
            [id, req.user.nome, motivo]
        );
        
        res.json({ mensagem: 'Chamado suspenso com sucesso' });
    } catch (error) {
        console.error('Erro ao suspender chamado:', error);
        res.status(500).json({ erro: 'Erro interno do servidor' });
    }
});

// ============================================
// INICIAR SERVIDOR
// ============================================

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});

app.get('/api/teste', (req, res) => {
    res.json({ mensagem: 'Backend funcionando!' });
});
