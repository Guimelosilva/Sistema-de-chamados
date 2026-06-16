// ============================================
// CONFIGURAÇÃO DA API
// ============================================
const API_URL = 'http://localhost:3001/api';

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let usuarios = [];
let chamados = [];
let currentUser = null;
let dashboardStatusChart = null;
let dashboardCategoriaChart = null;

// Categorias por equipe
const categoriasPorEquipe = {
    "Suporte": {
        "Rede": { campos: ["ip_computador"], label: "IP do Computador" },
        "Monitor": { campos: ["etiqueta_csu"], label: "Etiqueta CESU" },
        "Programa/Software": { campos: ["nome_app"], label: "Nome do Site/App" },
        "Impressora": { campos: ["identificacao_setor"], label: "Identificação do Setor" },
        "Periféricos": { campos: [] },
        "CPU": { campos: ["etiqueta_csu"], label: "Etiqueta CESU" },
        "Sem Categoria": { campos: [] }
    },
    "Sistema": {
        "SoulMV/MVPEP": { campos: ["versao"], label: "Versão do Sistema" },
        "Anatomia Patologia": { campos: ["exame"], label: "Tipo de Exame" },
        "Cockpit": { campos: ["modulo"], label: "Módulo" },
        "Vivace": { campos: ["funcionalidade"], label: "Funcionalidade" },
        "WS": { campos: ["servico"], label: "Serviço WS" }
    },
    "Telefonia": {
        "Ramal Mudo": { campos: ["ramal"], label: "Número do Ramal" },
        "Ramal Quebrado": { campos: ["ramal"], label: "Número do Ramal" },
        "Remanejamento de Ramal": { campos: ["ramal_origem", "ramal_destino"], labelOrigem: "Ramal de Origem", labelDestino: "Ramal de Destino" },
        "Ramal com Ruído": { campos: ["ramal"], label: "Número do Ramal" },
        "Ramal Baixo": { campos: ["ramal"], label: "Número do Ramal" }
    }
};

const equipes = ["Suporte", "Sistema", "Telefonia"];

let filtroAtual = { status: 'todos', equipe: 'todos', data: '', categoria: 'todos', numeroChamado: '', responsavel: 'todos' };
let ordenacaoAtual = { campo: 'id', ordem: 'desc' };

function escapeHTML(valor) {
    return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function normalizarChamado(chamado) {
    return {
        ...chamado,
        solicitanteId: chamado.solicitanteId ?? chamado.solicitante_id,
        solicitanteNome: chamado.solicitanteNome ?? chamado.solicitante_nome,
        tecnicoResponsavel: chamado.tecnicoResponsavel ?? chamado.tecnico_responsavel,
        dataCriacao: chamado.dataCriacao ?? chamado.data_criacao,
        dataFechamento: chamado.dataFechamento ?? chamado.data_fechamento,
        campoBonus: chamado.campoBonus ?? chamado.campo_bonus,
        ultimoMotivoSuspensao: chamado.ultimoMotivoSuspensao ?? chamado.ultimo_motivo_suspensao,
        dataSuspensao: chamado.dataSuspensao ?? chamado.data_suspensao
    };
}

// ============================================
// FUNÇÕES DE AUTENTICAÇÃO
// ============================================

function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
}

function mostrarNotificacao(mensagem) {
    const notif = document.createElement('div');
    notif.className = 'notificacao-flutuante';
    notif.textContent = mensagem;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}

// ============================================
// CARREGAMENTO DE DADOS
// ============================================

async function carregarUsuariosDaAPI() {
    try {
        const response = await fetch(`${API_URL}/usuarios`, { headers: getAuthHeaders() });
        if (response.ok) usuarios = await response.json();
    } catch (error) { console.error('Erro:', error); }
}

async function carregarChamadosDaAPI() {
    try {
        const response = await fetch(`${API_URL}/chamados`, { headers: getAuthHeaders() });
        if (response.ok) chamados = (await response.json()).map(normalizarChamado);
    } catch (error) { console.error('Erro:', error); }
}

async function carregarDados() {
    await Promise.all([carregarUsuariosDaAPI(), carregarChamadosDaAPI()]);
}

// ============================================
// AÇÕES DA API
// ============================================

async function capturarChamadoAPI(id) {
    try {
        const response = await fetch(`${API_URL}/chamados/${id}/capturar`, {
            method: 'PUT',
            headers: getAuthHeaders()
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok) {
            await carregarChamadosDaAPI();
            return { sucesso: true };
        }
        return { sucesso: false, erro: data.erro || 'Não foi possível capturar o chamado.' };
    } catch (error) {
        return { sucesso: false, erro: 'Erro ao conectar ao servidor.' };
    }
}

async function fecharChamadoAPI(id, dados) {
    try {
        const response = await fetch(`${API_URL}/chamados/${id}/fechar`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(dados)
        });
        if (response.ok) { await carregarChamadosDaAPI(); return true; }
        return false;
    } catch (error) { return false; }
}

async function suspenderChamadoAPI(id, motivo) {
    try {
        const response = await fetch(`${API_URL}/chamados/${id}/suspender`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ motivo })
        });
        if (response.ok) { await carregarChamadosDaAPI(); return true; }
        return false;
    } catch (error) { return false; }
}

async function criarChamadoAPI(dados) {
    try {
        const response = await fetch(`${API_URL}/chamados`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(dados)
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok) {
            await carregarChamadosDaAPI();
            return { sucesso: true };
        }
        return { sucesso: false, erro: data.erro || 'Erro ao criar chamado.' };
    } catch (error) {
        return { sucesso: false, erro: 'Erro ao conectar ao servidor.' };
    }
}

async function atualizarUsuarioAPI(id, dados) {
    try {
        const response = await fetch(`${API_URL}/usuarios/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(dados)
        });
        if (response.ok) {
            await carregarUsuariosDaAPI();
            return { sucesso: true };
        }
        const error = await response.json().catch(() => ({}));
        return { sucesso: false, erro: error.erro || 'Erro ao atualizar usuário.' };
    } catch (error) {
        return { sucesso: false, erro: 'Erro ao conectar ao servidor.' };
    }
}

async function criarUsuarioAPI(dados) {
    try {
        const response = await fetch(`${API_URL}/usuarios`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(dados)
        });
        if (response.ok) {
            await carregarUsuariosDaAPI();
            return { sucesso: true };
        }
        const error = await response.json().catch(() => ({}));
        return { sucesso: false, erro: error.erro || 'Erro ao criar usuário.' };
    } catch (error) {
        return { sucesso: false, erro: 'Erro ao conectar ao servidor.' };
    }
}

async function excluirUsuarioAPI(id) {
    try {
        const response = await fetch(`${API_URL}/usuarios/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (response.ok) {
            await carregarUsuariosDaAPI();
            return { sucesso: true };
        }
        const error = await response.json().catch(() => ({}));
        return { sucesso: false, erro: error.erro || 'Erro ao excluir usuário.' };
    } catch (error) {
        return { sucesso: false, erro: 'Erro ao conectar ao servidor.' };
    }
}

// ============================================
// ORDENAÇÃO
// ============================================

function ordenarChamados(arr, campo, ordem) {
    return [...arr].sort((a, b) => {
        let valA, valB;
        switch(campo) {
            case 'id': valA = a.id; valB = b.id; break;
            case 'data': valA = new Date(a.dataCriacao); valB = new Date(b.dataCriacao); break;
            case 'assunto': valA = a.categoria; valB = b.categoria; break;
            case 'responsavel': valA = a.tecnicoResponsavel || ''; valB = b.tecnicoResponsavel || ''; break;
            default: valA = a.id; valB = b.id;
        }
        if (valA < valB) return ordem === 'asc' ? -1 : 1;
        if (valA > valB) return ordem === 'asc' ? 1 : -1;
        return 0;
    });
}

// ============================================
// TELA DE LOGIN
// ============================================

function alternarAbasLogin() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`${tab}Form`).classList.add('active');
        });
    });
}

async function fazerLogin(e) {
    e.preventDefault();
    const login = document.getElementById('loginUsuario').value.trim();
    const senha = document.getElementById('loginSenha').value;
    const errorBox = document.getElementById('loginError');

    if (!login || !senha) {
        errorBox.textContent = 'Informe usuário e senha!';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, senha })
        });
        const data = await response.json();
        
        if (!response.ok) {
            errorBox.textContent = data.erro || 'Usuário ou senha inválidos!';
            return;
        }

        localStorage.setItem('token', data.token);
        sessionStorage.setItem('currentUser', JSON.stringify(data.user));
        await carregarDados();
        window.location.href = 'dashboard.html';
    } catch (error) {
        errorBox.textContent = 'Erro ao conectar ao servidor!';
    }
}

async function cadastrarUsuario(e) {
    e.preventDefault();
    const nome = document.getElementById('cadastroNome').value.trim();
    const email = document.getElementById('cadastroEmail').value.trim();
    const ramal = document.getElementById('cadastroRamal').value.trim();
    const setor = document.getElementById('cadastroSetor').value.trim();
    const senha = document.getElementById('cadastroSenha').value;
    const confirmar = document.getElementById('cadastroConfirmarSenha').value;
    const errorBox = document.getElementById('loginError');

    if (!nome || !email || !ramal || !setor || !senha) {
        errorBox.textContent = 'Preencha todos os campos!';
        return;
    }
    if (senha !== confirmar) {
        errorBox.textContent = 'As senhas não coincidem!';
        return;
    }
    if (senha.length < 4) {
        errorBox.textContent = 'A senha deve ter no mínimo 4 caracteres!';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/cadastro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, ramal, setor, senha, tipo: 'comum' })
        });
        const data = await response.json();
        
        if (!response.ok) {
            errorBox.textContent = data.erro || 'Erro ao criar conta!';
            return;
        }

        errorBox.textContent = 'Conta criada com sucesso! Faça login.';
        document.getElementById('cadastroForm').reset();
        setTimeout(() => document.querySelector('.tab-btn[data-tab="login"]').click(), 2000);
    } catch (error) {
        errorBox.textContent = 'Erro ao conectar ao servidor!';
    }
}

// ============================================
// DASHBOARD
// ============================================

async function initDashboard() {
    const userJson = sessionStorage.getItem('currentUser');
    if (!userJson) { window.location.href = 'index.html'; return; }
    
    currentUser = JSON.parse(userJson);
    await carregarDados();
    
    document.getElementById('userName').textContent = currentUser.nome;
    document.getElementById('userRoleBadge').textContent = 
        currentUser.tipo === 'admin' ? 'Administrador' : 
        currentUser.tipo === 'ti' ? 'Equipe TI' : 'Usuário Comum';
    
    // Esconder menus conforme tipo
    if (currentUser.tipo !== 'admin') {
        const menuUsuarios = document.getElementById('menuUsuarios');
        const menuRelatorios = document.getElementById('menuRelatorios');
        if (menuUsuarios) menuUsuarios.remove();
        if (menuRelatorios) menuRelatorios.remove();
    }
    if (currentUser.tipo === 'comum') {
        const menuChamados = document.getElementById('menuChamados');
        if (menuChamados) menuChamados.remove();
    }
    
    document.getElementById('btnLogout')?.addEventListener('click', () => {
        localStorage.removeItem('token');
        sessionStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });
    document.getElementById('btnMenuToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            mudarPagina(item.dataset.page);
        });
    });
    
    // Modal de usuário
    document.getElementById('btnSalvarUsuario')?.addEventListener('click', salvarUsuarioHandler);
    document.querySelectorAll('#modalUsuario .modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('modalUsuario').classList.remove('active');
        });
    });
    
    mudarPagina('dashboard');
}

function mudarPagina(page) {
    destruirGraficosDashboard();

    if (currentUser?.tipo === 'comum' && page !== 'dashboard' && page !== 'novo-chamado') {
        page = 'dashboard';
    }
    
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');
    
    const titles = { dashboard: currentUser?.tipo === 'comum' ? 'Meus Chamados' : 'Dashboard', chamados: 'Chamados', 'novo-chamado': 'Novo Chamado', usuarios: 'Usuários', relatorios: 'Relatórios' };
    document.getElementById('pageTitle').textContent = titles[page];
    
    const content = document.getElementById('pageContent');
    if (page === 'dashboard') renderDashboard(content);
    else if (page === 'chamados') renderChamados(content);
    else if (page === 'novo-chamado') renderNovoChamado(content);
    else if (page === 'usuarios' && currentUser?.tipo === 'admin') renderUsuarios(content);
    else if (page === 'relatorios' && currentUser?.tipo === 'admin') renderRelatorios(content);
}

function renderDashboard(container) {
    if (currentUser?.tipo === 'comum') {
        const meusChamados = ordenarChamados(chamados.filter(c => c.solicitanteId === currentUser.id), 'data', 'desc');
        container.innerHTML = `
            <section class="dashboard-section">
                <div class="section-header">
                    <h2>Meus Chamados</h2>
                    <button class="btn-primary" onclick="mudarPagina('novo-chamado')"><i class="fas fa-plus"></i> Novo Chamado</button>
                </div>
                ${renderTabelaChamados(meusChamados)}
            </section>
        `;
        return;
    }
    
    const total = chamados.length;
    const abertos = chamados.filter(c => c.status === 'aberto').length;
    const emAndamento = chamados.filter(c => c.status === 'em_andamento').length;
    const fechados = chamados.filter(c => c.status === 'fechado').length;
    const suspensos = chamados.filter(c => c.status === 'suspenso').length;
    const chamadosParaCapturar = ordenarChamados(
        chamados.filter(c => c.status !== 'fechado' && c.tecnicoResponsavel !== currentUser?.nome),
        'data',
        'desc'
    );
    const chamadosRecentes = ordenarChamados(chamados, 'data', 'desc').slice(0, 8);
    
    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card"><i class="fas fa-ticket-alt"></i><h3>Total</h3><div class="stat-value">${total}</div></div>
            <div class="stat-card"><i class="fas fa-clock"></i><h3>Abertos</h3><div class="stat-value">${abertos}</div></div>
            <div class="stat-card"><i class="fas fa-spinner"></i><h3>Em Andamento</h3><div class="stat-value">${emAndamento}</div></div>
            <div class="stat-card"><i class="fas fa-pause"></i><h3>Suspensos</h3><div class="stat-value">${suspensos}</div></div>
            <div class="stat-card"><i class="fas fa-check-circle"></i><h3>Fechados</h3><div class="stat-value">${fechados}</div></div>
        </div>
        <div class="export-buttons">
            <button class="btn-primary" onclick="exportarJSON()">Exportar JSON</button>
            <button class="btn-primary" onclick="exportarCSV()">Exportar CSV</button>
        </div>
        <div class="charts-row">
            <div class="chart-card">
                <h3>Status dos Chamados</h3>
                <div class="chart-box"><canvas id="graficoStatus"></canvas></div>
            </div>
            <div class="chart-card">
                <h3>Chamados por Categoria</h3>
                <div class="chart-box"><canvas id="graficoCategoria"></canvas></div>
            </div>
        </div>
        <section class="dashboard-section">
            <div class="section-header">
                <h2>Chamados para Capturar</h2>
                <span class="section-count">${chamadosParaCapturar.length}</span>
            </div>
            ${renderTabelaChamados(chamadosParaCapturar)}
        </section>
        <section class="dashboard-section">
            <div class="section-header">
                <h2>Últimos Chamados</h2>
                <button class="btn-secondary" onclick="mudarPagina('chamados')">Ver Todos</button>
            </div>
            ${renderTabelaChamados(chamadosRecentes)}
        </section>
    `;
    renderGraficosDashboard();
}

// ============================================
// TABELA DE CHAMADOS (COM BOTÕES)
// ============================================

function renderTabelaChamados(lista) {
    if (!lista || lista.length === 0) return '<div class="empty-state">Nenhum chamado encontrado.</div>';
    
    const podeAcao = currentUser?.tipo === 'ti' || currentUser?.tipo === 'admin';
    
    let html = `<div class="table-container"><table><thead><tr>
        <th>Código</th><th>Categoria</th><th>Solicitante</th><th>Setor</th>
        <th>Responsável</th><th>Status</th><th>Data/Hora</th>
        ${podeAcao ? '<th>Ações</th>' : ''}
    </tr></thead><tbody>`;
    
    lista.forEach(c => {
        let statusClass = '';
        let statusText = '';
        if (c.status === 'aberto') { statusText = 'Aberto'; statusClass = 'status-aberto'; }
        else if (c.status === 'em_andamento') { statusText = 'Em Andamento'; statusClass = 'status-em-andamento'; }
        else if (c.status === 'suspenso') { statusText = 'SUSPENSO'; statusClass = 'status-suspenso'; }
        else { statusText = 'Fechado'; statusClass = 'status-fechado'; }
        
        const dataFormatada = c.dataCriacao ? new Date(c.dataCriacao).toLocaleString('pt-BR') : 'Data não informada';
        const podeCapturar = c.status !== 'fechado' && c.tecnicoResponsavel !== currentUser?.nome && podeAcao;
        const podeFechar = c.status === 'em_andamento' && c.tecnicoResponsavel === currentUser?.nome && podeAcao;
        const podeSuspender = c.status !== 'fechado' && podeAcao;
        
        html += `<tr>
            <td>#${c.id}</td>
            <td>${c.categoria || 'N/A'}</td>
            <td>${c.solicitanteNome || 'Usuário não identificado'}</td>
            <td>${c.setor || 'Setor não informado'}</td>
            <td>${c.tecnicoResponsavel || '—'}</td>
            <td><span class="status ${statusClass}">${statusText}</span></td>
            <td>${dataFormatada}</td>`;
        
        if (podeAcao) {
            html += `<td class="acoes-cell">
                <button class="btn-acao" onclick="verChamado(${c.id})" title="Ver"><i class="fas fa-eye"></i></button>
                ${podeCapturar ? `<button class="btn-acao btn-capturar" onclick="capturarChamado(${c.id})" title="Capturar chamado"><i class="fas fa-hand-paper"></i><span>${c.status === 'em_andamento' ? 'Assumir' : 'Capturar'}</span></button>` : ''}
                ${podeFechar ? `<button class="btn-acao" onclick="abrirModalFechamento(${c.id})" title="Fechar"><i class="fas fa-check-circle"></i></button>` : ''}
                ${podeSuspender ? `<button class="btn-acao" onclick="abrirModalSuspensao(${c.id})" title="Suspender"><i class="fas fa-pause"></i></button>` : ''}
            </td>`;
        }
        html += `</tr>`;
    });
    
    html += `</tbody></table></div>`;
    return html;
}

function verChamado(id) {
    const c = chamados.find(c => c.id === id);
    if (!c) { mostrarNotificacao('Chamado não encontrado!'); return; }
    const statusMap = {
        aberto: 'Aberto',
        em_andamento: 'Em Andamento',
        suspenso: 'Suspenso',
        fechado: 'Fechado'
    };
    const dataCriacao = c.dataCriacao ? new Date(c.dataCriacao).toLocaleString('pt-BR') : 'Data não informada';
    const dataFechamento = c.dataFechamento ? new Date(c.dataFechamento).toLocaleString('pt-BR') : null;
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content chamado-detalhe-modal">
            <div class="modal-header chamado-detalhe-header">
                <div>
                    <span class="modal-kicker">Chamado #${escapeHTML(c.id)}</span>
                    <h3>${escapeHTML(c.categoria || 'Sem categoria')}</h3>
                </div>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body chamado-detalhe-body">
                <div class="detalhe-topline">
                    <span class="status ${c.status === 'aberto' ? 'status-aberto' : c.status === 'em_andamento' ? 'status-em-andamento' : c.status === 'suspenso' ? 'status-suspenso' : 'status-fechado'}">${escapeHTML(statusMap[c.status] || c.status || 'Não informado')}</span>
                    <span>${escapeHTML(dataCriacao)}</span>
                </div>
                <div class="detalhe-grid">
                    <div class="detalhe-item"><span>Equipe</span><strong>${escapeHTML(c.equipe || 'Não informada')}</strong></div>
                    <div class="detalhe-item"><span>Solicitante</span><strong>${escapeHTML(c.solicitanteNome || 'Usuário não identificado')}</strong></div>
                    <div class="detalhe-item"><span>Setor</span><strong>${escapeHTML(c.setor || 'Não informado')}</strong></div>
                    <div class="detalhe-item"><span>Ramal</span><strong>${escapeHTML(c.ramal || 'Não informado')}</strong></div>
                    <div class="detalhe-item"><span>Responsável</span><strong>${escapeHTML(c.tecnicoResponsavel || 'Sem responsável')}</strong></div>
                    <div class="detalhe-item"><span>Fechamento</span><strong>${escapeHTML(dataFechamento || 'Ainda não fechado')}</strong></div>
                </div>
                ${c.campoBonus ? `<div class="detalhe-item detalhe-wide"><span>Informação adicional</span><strong>${escapeHTML(c.campoBonus)}</strong></div>` : ''}
                <div class="detalhe-descricao">
                    <span>Descrição do problema</span>
                    <p>${escapeHTML(c.descricao || 'Sem descrição informada')}</p>
                </div>
                ${c.ultimoMotivoSuspensao ? `<div class="detalhe-descricao detalhe-alerta"><span>Motivo da suspensão</span><p>${escapeHTML(c.ultimoMotivoSuspensao)}</p></div>` : ''}
                ${c.solucao ? `<div class="detalhe-descricao detalhe-solucao"><span>Solução aplicada</span><p>${escapeHTML(c.solucao)}</p></div>` : ''}
            </div>
            <div class="modal-footer">
                <button class="btn-secondary modal-close">Fechar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelectorAll('.modal-close').forEach(btn => btn.onclick = () => modal.remove());
}

// ============================================
// MODAL DE CAPTURA
// ============================================

async function capturarChamado(id) {
    const chamado = chamados.find(c => c.id === id);
    if (!chamado) { mostrarNotificacao('Chamado não encontrado!'); return; }
    if (chamado.status === 'fechado') {
        mostrarNotificacao('Este chamado não pode ser capturado agora.');
        return;
    }
    if (chamado.tecnicoResponsavel === currentUser?.nome) {
        mostrarNotificacao('Este chamado já está com você.');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 450px;">
            <div class="modal-header"><h3>Capturar Chamado #${chamado.id}</h3><button class="modal-close">&times;</button></div>
            <div class="modal-body">
                <p><strong>Categoria:</strong> ${chamado.categoria}</p>
                <p><strong>Solicitante:</strong> ${chamado.solicitanteNome || 'Usuário não identificado'}</p>
                <p><strong>Setor:</strong> ${chamado.setor || 'Setor não informado'}</p>
                <p><strong>Descrição:</strong> ${chamado.descricao || 'Sem descrição'}</p>
                <div class="info-box"><i class="fas fa-info-circle"></i> Ao confirmar, este chamado ficará em andamento e será atribuído a ${currentUser.nome}${chamado.tecnicoResponsavel ? ` no lugar de ${chamado.tecnicoResponsavel}` : ''}.</div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary modal-close">Não, cancelar</button>
                <button class="btn-primary" id="btnConfirmarCaptura"><i class="fas fa-check"></i> Sim, capturar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('btnConfirmarCaptura').onclick = async () => {
        const resultado = await capturarChamadoAPI(id);
        if (resultado.sucesso) {
            mostrarNotificacao(`Chamado #${id} capturado por ${currentUser.nome}!`);
            recarregarPaginaAtual();
        } else {
            mostrarNotificacao(resultado.erro || `Erro ao capturar chamado #${id}`);
        }
        modal.remove();
    };
    modal.querySelectorAll('.modal-close').forEach(btn => btn.onclick = () => modal.remove());
}

// ============================================
// MODAL DE FECHAMENTO
// ============================================

function abrirModalFechamento(id) {
    const chamado = chamados.find(c => c.id === id);
    if (!chamado) { mostrarNotificacao('Chamado não encontrado!'); return; }
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 550px;">
            <div class="modal-header"><h3>Finalizar Chamado #${chamado.id}</h3><button class="modal-close">&times;</button></div>
            <div class="modal-body">
                <div class="form-group"><label>Serviço Realizado *</label>
                    <select id="servicoRealizado" required>
                        <option value="">Selecione...</option>
                        <option value="Manutenção Preventiva">Manutenção Preventiva</option>
                        <option value="Manutenção Corretiva">Manutenção Corretiva</option>
                        <option value="Instalação de Software">Instalação de Software</option>
                        <option value="Configuração de Rede">Configuração de Rede</option>
                        <option value="Troca de Equipamento">Troca de Equipamento</option>
                        <option value="Remanejamento">Remanejamento</option>
                        <option value="Treinamento do Usuário">Treinamento do Usuário</option>
                        <option value="Suporte Remoto">Suporte Remoto</option>
                        <option value="Visita Técnica">Visita Técnica</option>
                        <option value="Outros">Outros</option>
                    </select>
                </div>
                <div class="form-group"><label>Descrição do Serviço *</label>
                    <textarea id="descricaoServico" rows="3" placeholder="Descreva o que foi feito..." required></textarea>
                </div>
                <div class="form-group"><label>Houve troca de equipamento?</label>
                    <select id="houveTroca"><option value="nao">Não</option><option value="sim">Sim</option></select>
                </div>
                <div id="campoTroca" style="display:none;">
                    <div class="form-group"><label>Tipo de equipamento</label>
                        <select id="tipoTroca">
                            <option value="">Selecione...</option>
                            <option value="cabo_rede">Cabo de Rede</option>
                            <option value="mouse">Mouse</option>
                            <option value="teclado">Teclado</option>
                            <option value="cpu">CPU</option>
                            <option value="monitor">Monitor</option>
                            <option value="fonte">Fonte</option>
                            <option value="hd">HD/SSD</option>
                            <option value="memoria">Memória RAM</option>
                        </select>
                    </div>
                </div>
                <div class="form-group"><label>Houve remanejamento?</label>
                    <select id="houveRemanejamento"><option value="nao">Não</option><option value="sim">Sim</option></select>
                </div>
                <div id="campoRemanejamento" style="display:none;">
                    <div class="form-group"><label>De onde saiu</label><input type="text" id="remanejamentoOrigem" placeholder="Ex: Financeiro"></div>
                    <div class="form-group"><label>Para onde foi</label><input type="text" id="remanejamentoDestino" placeholder="Ex: TI"></div>
                </div>
                <div class="info-box"><i class="fas fa-info-circle"></i> Após finalizar, o chamado será fechado.</div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary modal-close">Cancelar</button>
                <button class="btn-primary" id="btnConfirmarFechamento">Finalizar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('houveTroca').addEventListener('change', () => {
        document.getElementById('campoTroca').style.display = document.getElementById('houveTroca').value === 'sim' ? 'block' : 'none';
    });
    document.getElementById('houveRemanejamento').addEventListener('change', () => {
        document.getElementById('campoRemanejamento').style.display = document.getElementById('houveRemanejamento').value === 'sim' ? 'block' : 'none';
    });
    
    document.getElementById('btnConfirmarFechamento').onclick = async () => {
        const servico = document.getElementById('servicoRealizado').value;
        const descricao = document.getElementById('descricaoServico').value.trim();
        
        if (!servico) { alert('Selecione o serviço realizado!'); return; }
        if (!descricao) { alert('Descreva o serviço realizado!'); return; }
        
        const dados = {
            servicoRealizado: servico,
            descricaoServico: descricao,
            solucao: descricao,
            houveTroca: document.getElementById('houveTroca').value === 'sim',
            tipoTroca: document.getElementById('houveTroca').value === 'sim' ? document.getElementById('tipoTroca').value : null,
            houveRemanejamento: document.getElementById('houveRemanejamento').value === 'sim',
            remanejamentoOrigem: document.getElementById('houveRemanejamento').value === 'sim' ? document.getElementById('remanejamentoOrigem').value : null,
            remanejamentoDestino: document.getElementById('houveRemanejamento').value === 'sim' ? document.getElementById('remanejamentoDestino').value : null
        };
        
        const sucesso = await fecharChamadoAPI(id, dados);
        if (sucesso) {
            mostrarNotificacao(`Chamado #${id} finalizado! Serviço: ${servico}`);
            recarregarPaginaAtual();
        } else {
            mostrarNotificacao(`Erro ao finalizar chamado #${id}`);
        }
        modal.remove();
    };
    modal.querySelectorAll('.modal-close').forEach(btn => btn.onclick = () => modal.remove());
}

function abrirModalSuspensao(id) {
    const c = chamados.find(c => c.id === id);
    if (!c) return;
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:450px">
            <div class="modal-header"><h3>Suspender Chamado #${c.id}</h3><button class="modal-close">&times;</button></div>
            <div class="modal-body">
                <div class="form-group"><label>Motivo da Suspensão *</label><textarea id="motivoSuspensao" rows="3" placeholder="Descreva o motivo..." required></textarea></div>
                <div class="info-box"><i class="fas fa-info-circle"></i> O chamado ficará com status "SUSPENSO".</div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary modal-close">Cancelar</button>
                <button class="btn-primary" id="btnConfirmarSuspensao">Confirmar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('btnConfirmarSuspensao').onclick = async () => {
        const motivo = document.getElementById('motivoSuspensao').value.trim();
        if (!motivo) { alert('Digite o motivo!'); return; }
        const sucesso = await suspenderChamadoAPI(id, motivo);
        if (sucesso) {
            mostrarNotificacao(`Chamado #${id} suspenso!`);
            recarregarPaginaAtual();
        }
        modal.remove();
    };
    modal.querySelectorAll('.modal-close').forEach(btn => btn.onclick = () => modal.remove());
}

function recarregarPaginaAtual() {
    const page = document.querySelector('.nav-item.active')?.dataset.page || 'dashboard';
    mudarPagina(page);
}

function destruirGraficosDashboard() {
    if (dashboardStatusChart) {
        dashboardStatusChart.destroy();
        dashboardStatusChart = null;
    }
    if (dashboardCategoriaChart) {
        dashboardCategoriaChart.destroy();
        dashboardCategoriaChart = null;
    }
}

function contarPorCampo(lista, campo) {
    return lista.reduce((acc, item) => {
        const chave = item[campo] || 'Não informado';
        acc[chave] = (acc[chave] || 0) + 1;
        return acc;
    }, {});
}

function renderGraficosDashboard() {
    destruirGraficosDashboard();
    if (typeof Chart === 'undefined') return;

    const statusLabels = ['Aberto', 'Em Andamento', 'Suspenso', 'Fechado'];
    const statusValues = [
        chamados.filter(c => c.status === 'aberto').length,
        chamados.filter(c => c.status === 'em_andamento').length,
        chamados.filter(c => c.status === 'suspenso').length,
        chamados.filter(c => c.status === 'fechado').length
    ];
    const statusCanvas = document.getElementById('graficoStatus');
    if (statusCanvas) {
        dashboardStatusChart = new Chart(statusCanvas, {
            type: 'doughnut',
            data: {
                labels: statusLabels,
                datasets: [{
                    data: statusValues,
                    backgroundColor: ['#ef4444', '#f59e0b', '#8b5cf6', '#22c55e'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }

    const porCategoria = contarPorCampo(chamados, 'categoria');
    const categoriasOrdenadas = Object.entries(porCategoria)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);
    const categoriaCanvas = document.getElementById('graficoCategoria');
    if (categoriaCanvas) {
        dashboardCategoriaChart = new Chart(categoriaCanvas, {
            type: 'bar',
            data: {
                labels: categoriasOrdenadas.map(([categoria]) => categoria),
                datasets: [{
                    label: 'Chamados',
                    data: categoriasOrdenadas.map(([, total]) => total),
                    backgroundColor: '#667eea',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
                plugins: { legend: { display: false } }
            }
        });
    }
}

// ============================================
// CHAMADOS - PÁGINA PRINCIPAL
// ============================================

function renderChamados(container) {
    const categoriasUnicas = ['todos', ...new Set(chamados.map(c => c.categoria))];
    const usuariosTI = usuarios.filter(u => u.tipo === 'ti').map(u => u.nome);
    
    container.innerHTML = `
        <div class="filtros">
            <div class="filtros-grid">
                <div class="filtro-group"><label>Número</label><input type="text" id="filtroNumero" placeholder="Ex: 123"></div>
                <div class="filtro-group"><label>Status</label><select id="filtroStatus"><option value="todos">Todos</option><option value="aberto">Aberto</option><option value="em_andamento">Em Andamento</option><option value="suspenso">Suspenso</option><option value="fechado">Fechado</option></select></div>
                <div class="filtro-group"><label>Tipo</label><select id="filtroCategoria">${categoriasUnicas.map(c => `<option value="${c}">${c === 'todos' ? 'Todos' : c}</option>`).join('')}</select></div>
                <div class="filtro-group"><label>Equipe</label><select id="filtroEquipe"><option value="todos">Todas</option>${equipes.map(e => `<option value="${e}">${e}</option>`).join('')}</select></div>
                <div class="filtro-group"><label>Responsável</label><select id="filtroResponsavel"><option value="todos">Todos</option>${usuariosTI.map(r => `<option value="${r}">${r}</option>`).join('')}</select></div>
                <div class="filtro-group"><label>Data</label><input type="date" id="filtroData"></div>
            </div>
            <div class="filtros-botoes">
                <div class="ordenacao-group"><label>Ordenar:</label><select id="ordenarCampo"><option value="id">Número</option><option value="data">Data/Hora</option><option value="assunto">Assunto</option><option value="responsavel">Responsável</option></select>
                <button id="btnOrdenarAsc" class="btn-ordem">Crescente</button><button id="btnOrdenarDesc" class="btn-ordem active">Decrescente</button></div>
                <button class="btn-filtrar" id="btnFiltrar">Filtrar</button>
                <button class="btn-limpar-filtros" id="btnLimparFiltros">Limpar Filtros</button>
            </div>
        </div>
        <div id="chamadosListContainer"></div>
    `;
    
    const filtrar = () => {
        let filtrados = chamados;
        const numero = document.getElementById('filtroNumero')?.value;
        const status = document.getElementById('filtroStatus')?.value;
        const categoria = document.getElementById('filtroCategoria')?.value;
        const equipe = document.getElementById('filtroEquipe')?.value;
        const responsavel = document.getElementById('filtroResponsavel')?.value;
        const data = document.getElementById('filtroData')?.value;
        
        if (numero) filtrados = filtrados.filter(c => c.id.toString().includes(numero));
        if (status && status !== 'todos') filtrados = filtrados.filter(c => c.status === status);
        if (categoria && categoria !== 'todos') filtrados = filtrados.filter(c => c.categoria === categoria);
        if (equipe && equipe !== 'todos') filtrados = filtrados.filter(c => c.equipe === equipe);
        if (responsavel && responsavel !== 'todos') filtrados = filtrados.filter(c => c.tecnicoResponsavel === responsavel);
        if (data) filtrados = filtrados.filter(c => c.dataCriacao?.split('T')[0] === data);
        
        if (currentUser?.tipo !== 'admin') filtrados = filtrados.filter(c => c.status !== 'fechado');
        filtrados = ordenarChamados(filtrados, ordenacaoAtual.campo, ordenacaoAtual.ordem);
        
        document.getElementById('chamadosListContainer').innerHTML = renderTabelaChamados(filtrados);
    };
    
    document.getElementById('filtroStatus').value = filtroAtual.status;
    document.getElementById('filtroEquipe').value = filtroAtual.equipe;
    document.getElementById('filtroData').value = filtroAtual.data;
    document.getElementById('filtroCategoria').value = filtroAtual.categoria;
    document.getElementById('filtroNumero').value = filtroAtual.numeroChamado;
    document.getElementById('filtroResponsavel').value = filtroAtual.responsavel;
    document.getElementById('ordenarCampo').value = ordenacaoAtual.campo;
    
    document.getElementById('ordenarCampo').onchange = (e) => { ordenacaoAtual.campo = e.target.value; filtrar(); };
    document.getElementById('btnOrdenarAsc').onclick = () => { ordenacaoAtual.ordem = 'asc'; filtrar(); };
    document.getElementById('btnOrdenarDesc').onclick = () => { ordenacaoAtual.ordem = 'desc'; filtrar(); };
    document.getElementById('btnFiltrar').onclick = () => filtrar();
    document.getElementById('btnLimparFiltros').onclick = () => {
        filtroAtual = { status: 'todos', equipe: 'todos', data: '', categoria: 'todos', numeroChamado: '', responsavel: 'todos' };
        ordenacaoAtual = { campo: 'id', ordem: 'desc' };
        document.getElementById('filtroStatus').value = 'todos';
        document.getElementById('filtroEquipe').value = 'todos';
        document.getElementById('filtroData').value = '';
        document.getElementById('filtroCategoria').value = 'todos';
        document.getElementById('filtroNumero').value = '';
        document.getElementById('filtroResponsavel').value = 'todos';
        document.getElementById('ordenarCampo').value = 'id';
        filtrar();
    };
    
    filtrar();
}

// ============================================
// NOVO CHAMADO
// ============================================

function renderNovoChamado(container) {
    container.innerHTML = `
        <form id="formNovoChamado" class="form-chamado">
            <div class="form-group"><label>Equipe *</label><select id="chamadoEquipe" required>${equipes.map(e => `<option value="${e}">${e}</option>`).join('')}</select></div>
            <div class="form-group"><label>Categoria *</label><select id="chamadoCategoria" required><option value="">Selecione a equipe primeiro</option></select></div>
            <div id="camposBonus"></div>
            <div class="form-group"><label>Descrição do Problema *</label><textarea id="chamadoDescricao" rows="4" placeholder="Descreva o problema..." required></textarea></div>
            <div class="form-group"><label>Setor *</label><input type="text" id="chamadoSetor" placeholder="Ex: Financeiro" required></div>
            <div class="form-group"><label>Ramal *</label><input type="text" id="chamadoRamal" placeholder="Número do ramal" required></div>
            <button type="submit" class="btn-submit">Abrir Chamado</button>
        </form>
    `;
    
    function atualizarCategorias() {
        const equipe = document.getElementById('chamadoEquipe').value;
        const catSelect = document.getElementById('chamadoCategoria');
        if (!equipe || !categoriasPorEquipe[equipe]) {
            catSelect.innerHTML = '<option value="">Selecione a equipe primeiro</option>';
            catSelect.disabled = true;
            return;
        }
        catSelect.disabled = false;
        catSelect.innerHTML = '<option value="">Selecione...</option>' + 
            Object.keys(categoriasPorEquipe[equipe]).map(c => `<option value="${c}">${c}</option>`).join('');
        document.getElementById('camposBonus').innerHTML = '';
    }
    
    function atualizarCamposBonus() {
        const equipe = document.getElementById('chamadoEquipe').value;
        const categoria = document.getElementById('chamadoCategoria').value;
        const camposDiv = document.getElementById('camposBonus');
        if (!equipe || !categoria || !categoriasPorEquipe[equipe] || !categoriasPorEquipe[equipe][categoria]) {
            camposDiv.innerHTML = '';
            return;
        }
        const config = categoriasPorEquipe[equipe][categoria];
        if (!config.campos || config.campos.length === 0) {
            camposDiv.innerHTML = '';
            return;
        }
        let html = '';
        if (config.campos.length === 1) {
            html = `<div class="form-group"><label>${config.label}</label><input type="text" id="campoBonus" required></div>`;
        } else if (config.campos.length === 2) {
            html = `<div class="form-group"><label>${config.labelOrigem}</label><input type="text" id="campoBonusOrigem" required></div>
                    <div class="form-group"><label>${config.labelDestino}</label><input type="text" id="campoBonusDestino" required></div>`;
        }
        camposDiv.innerHTML = html;
    }
    
    document.getElementById('chamadoEquipe').addEventListener('change', () => {
        atualizarCategorias();
        atualizarCamposBonus();
    });
    document.getElementById('chamadoCategoria').addEventListener('change', atualizarCamposBonus);
    
    document.getElementById('formNovoChamado').onsubmit = async (e) => {
        e.preventDefault();
        
        const cb = document.getElementById('campoBonus');
        const cbo = document.getElementById('campoBonusOrigem');
        const cbd = document.getElementById('campoBonusDestino');
        let campoBonus = '';
        
        if (cb) campoBonus = cb.value;
        else if (cbo && cbd) campoBonus = `${cbo.value} → ${cbd.value}`;

        const dados = {
            equipe: document.getElementById('chamadoEquipe').value,
            categoria: document.getElementById('chamadoCategoria').value,
            descricao: document.getElementById('chamadoDescricao').value.trim(),
            setor: document.getElementById('chamadoSetor').value.trim(),
            ramal: document.getElementById('chamadoRamal').value.trim(),
            campoBonus: campoBonus.trim()
        };
        
        const resultado = await criarChamadoAPI(dados);
        if (resultado.sucesso) {
            mostrarNotificacao('Chamado criado com sucesso!');
            mudarPagina('dashboard');
        } else {
            mostrarNotificacao(resultado.erro || 'Erro ao criar chamado.');
        }
    };
    
    atualizarCategorias();
}

// ============================================
// USUÁRIOS (ADMIN) - COMPLETO COM EDIÇÃO
// ============================================

function renderUsuarios(container) {
    if (currentUser?.tipo !== 'admin') return;
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
            <h2>Gerenciar Usuários</h2>
            <button class="btn-primary" onclick="abrirModalNovoUsuario()">
                <i class="fas fa-user-plus"></i> Novo Usuário
            </button>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nome</th>
                        <th>Login (E-mail)</th>
                        <th>Ramal</th>
                        <th>Setor</th>
                        <th>Tipo</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody id="tabelaUsuarios">
                    ${usuarios.map(u => `
                        <tr>
                            <td>${u.id}</td>
                            <td>${escapeHTML(u.nome)}</td>
                            <td>${escapeHTML(u.login)}</td>
                            <td>${escapeHTML(u.ramal || '—')}</td>
                            <td>${escapeHTML(u.setor || '—')}</td>
                            <td>
                                <span class="status ${u.tipo === 'admin' ? 'status-suspenso' : u.tipo === 'ti' ? 'status-em-andamento' : 'status-aberto'}">
                                    ${u.tipo === 'admin' ? 'Administrador' : u.tipo === 'ti' ? 'Equipe TI' : 'Usuário Comum'}
                                </span>
                            </td>
                            <td class="acoes-cell">
                                <button class="btn-acao" onclick="editarUsuario(${u.id})" title="Editar usuário">
                                    <i class="fas fa-edit"></i>
                                </button>
                                ${u.id !== currentUser?.id ? `<button class="btn-acao" onclick="excluirUsuario(${u.id})" title="Excluir usuário" style="color: #ff6b6b;">
                                    <i class="fas fa-trash-alt"></i>
                                </button>` : '<span style="color:#ccc; font-size:12px;">(Você)</span>'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function abrirModalNovoUsuario() {
    // Reset form
    document.getElementById('usuarioId').value = '';
    document.getElementById('usuarioNome').value = '';
    document.getElementById('usuarioEmail').value = '';
    document.getElementById('usuarioRamal').value = '';
    document.getElementById('usuarioSetor').value = '';
    document.getElementById('usuarioLogin').value = '';
    document.getElementById('usuarioSenha').value = '';
    document.getElementById('usuarioTipo').value = 'comum';
    document.getElementById('modalUsuarioTitle').textContent = 'Cadastrar Usuário';
    document.getElementById('modalUsuario').classList.add('active');
}

function editarUsuario(id) {
    const user = usuarios.find(u => u.id === id);
    if (!user) {
        mostrarNotificacao('Usuário não encontrado!');
        return;
    }
    
    document.getElementById('usuarioId').value = user.id;
    document.getElementById('usuarioNome').value = user.nome;
    document.getElementById('usuarioEmail').value = user.email;
    document.getElementById('usuarioRamal').value = user.ramal || '';
    document.getElementById('usuarioSetor').value = user.setor || '';
    document.getElementById('usuarioLogin').value = user.login;
    document.getElementById('usuarioSenha').value = '';
    document.getElementById('usuarioTipo').value = user.tipo;
    document.getElementById('modalUsuarioTitle').textContent = 'Editar Usuário';
    document.getElementById('modalUsuario').classList.add('active');
}

async function excluirUsuario(id) {
    const user = usuarios.find(u => u.id === id);
    if (!user) return;
    
    if (!confirm(`Tem certeza que deseja excluir o usuário "${user.nome}"?\n\nEsta ação não pode ser desfeita.`)) {
        return;
    }
    
    const resultado = await excluirUsuarioAPI(id);
    if (resultado.sucesso) {
        mostrarNotificacao(`Usuário "${user.nome}" excluído com sucesso!`);
        recarregarPaginaAtual();
    } else {
        mostrarNotificacao(resultado.erro || 'Erro ao excluir usuário.');
    }
}

async function salvarUsuarioHandler() {
    const id = document.getElementById('usuarioId').value;
    const nome = document.getElementById('usuarioNome').value.trim();
    const email = document.getElementById('usuarioEmail').value.trim();
    const ramal = document.getElementById('usuarioRamal').value.trim();
    const setor = document.getElementById('usuarioSetor').value.trim();
    const login = document.getElementById('usuarioLogin').value.trim();
    const senha = document.getElementById('usuarioSenha').value;
    const tipo = document.getElementById('usuarioTipo').value;
    
    if (!nome || !email || !login || !tipo) {
        alert('Preencha todos os campos obrigatórios!');
        return;
    }
    
    const dados = { nome, email, ramal, setor, login, tipo };
    if (senha) dados.senha = senha;
    
    let resultado;
    if (id) {
        resultado = await atualizarUsuarioAPI(id, dados);
    } else {
        if (!senha) {
            alert('Senha é obrigatória para novo usuário!');
            return;
        }
        resultado = await criarUsuarioAPI({ ...dados, senha });
    }
    
    if (resultado.sucesso) {
        mostrarNotificacao(id ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!');
        document.getElementById('modalUsuario').classList.remove('active');
        recarregarPaginaAtual();
    } else {
        mostrarNotificacao(resultado.erro || 'Erro ao salvar usuário.');
    }
}

function renderRelatorios(container) {
    container.innerHTML = `
        <div class="export-buttons" style="margin-bottom: 20px;">
            <button class="btn-primary" onclick="exportarJSON()"><i class="fas fa-download"></i> Exportar JSON</button>
            <button class="btn-primary" onclick="exportarCSV()"><i class="fas fa-file-csv"></i> Exportar CSV</button>
        </div>
        <div class="stats-grid">
            <div class="stat-card"><i class="fas fa-users"></i><h3>Total Usuários</h3><div class="stat-value">${usuarios.length}</div></div>
            <div class="stat-card"><i class="fas fa-ticket-alt"></i><h3>Total Chamados</h3><div class="stat-value">${chamados.length}</div></div>
            <div class="stat-card"><i class="fas fa-check-circle"></i><h3>Chamados Fechados</h3><div class="stat-value">${chamados.filter(c => c.status === 'fechado').length}</div></div>
        </div>
    `;
}

function exportarJSON() {
    const data = { 
        usuarios: usuarios.map(u => ({ id: u.id, nome: u.nome, email: u.email, login: u.login, ramal: u.ramal, setor: u.setor, tipo: u.tipo })),
        chamados: chamados.map(c => ({ id: c.id, categoria: c.categoria, equipe: c.equipe, descricao: c.descricao, status: c.status, dataCriacao: c.dataCriacao, dataFechamento: c.dataFechamento }))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}

function exportarCSV() {
    const headers = ['ID', 'Categoria', 'Equipe', 'Solicitante', 'Setor', 'Ramal', 'Descrição', 'Status', 'Data', 'Técnico'];
    const rows = chamados.map(c => [c.id, c.categoria, c.equipe, c.solicitanteNome, c.setor, c.ramal, `"${(c.descricao || '').replace(/"/g, '""')}"`, c.status, new Date(c.dataCriacao).toLocaleString('pt-BR'), c.tecnicoResponsavel || '']);
    const blob = new Blob([headers.join(';') + '\n' + rows.map(r => r.join(';')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `chamados_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
}

// ============================================
// INICIALIZAÇÃO
// ============================================

const isLoginPage = window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname === '';

if (isLoginPage) {
    document.addEventListener('DOMContentLoaded', () => {
        alternarAbasLogin();
        document.getElementById('loginForm')?.addEventListener('submit', fazerLogin);
        document.getElementById('cadastroForm')?.addEventListener('submit', cadastrarUsuario);
    });
} else {
    document.addEventListener('DOMContentLoaded', () => {
        if (!sessionStorage.getItem('currentUser')) {
            window.location.replace('index.html');
        } else {
            initDashboard();
        }
    });
}