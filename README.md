# 🎫 Sistema de Chamados TI

Sistema completo para gerenciamento de chamados de TI, com suporte a múltiplos usuários, categorias dinâmicas, anexos e painel administrativo.

[![Status](https://img.shields.io/badge/status-concluído-brightgreen)](https://github.com/Guimelosilva/chamados-ti)
[![Versão](https://img.shields.io/badge/versão-3.0.0-blue)](https://github.com/Guimelosilva/chamados-ti)
[![Licença](https://img.shields.io/badge/licença-MIT-green)](https://github.com/Guimelosilva/chamados-ti)
[![Plataforma](https://img.shields.io/badge/plataforma-web-orange)](https://github.com/Guimelosilva/chamados-ti)

---

## 📋 Sobre o Projeto

O **Sistema de Chamados TI** é uma aplicação web completa para gerenciamento de chamados de suporte técnico, desenvolvida para atender as necessidades de equipes de TI. O sistema permite que usuários comuns abram chamados, que técnicos capturem e resolvam problemas, e que administradores gerenciem todo o fluxo com relatórios detalhados.

### 🎯 Objetivo

- **Organizar** o fluxo de atendimento de chamados de TI
- **Facilitar** a comunicação entre usuários e equipe técnica
- **Gerar** relatórios e estatísticas para tomada de decisão
- **Melhorar** a eficiência do suporte técnico

---

## ✨ Funcionalidades

### 👤 Usuário Comum
- ✅ Criar conta no sistema
- ✅ Fazer login com segurança
- ✅ Abrir chamados com categorias dinâmicas
- ✅ Anexar imagens e documentos
- ✅ Visualizar histórico de seus chamados
- ✅ Acompanhar status de cada solicitação

### 🔧 Equipe TI
- ✅ Visualizar lista de chamados com filtros
- ✅ Capturar chamados com confirmação
- ✅ Fechar chamados com descrição do serviço
- ✅ Suspender chamados com justificativa
- ✅ Visualizar detalhes completos de cada chamado
- ✅ Ver anexos enviados pelos usuários

### 👨‍💼 Administrador
- ✅ Gerenciar usuários (criar, editar, excluir)
- ✅ Alterar senhas de usuários
- ✅ Visualizar dashboard com gráficos
- ✅ Exportar dados em JSON e CSV
- ✅ Relatórios detalhados por categoria e equipe

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia | Finalidade |
|------------|------------|
| **Frontend** | HTML5, CSS3, JavaScript (ES6+) |
| **Backend** | Node.js, Express |
| **Banco de Dados** | MySQL |
| **Autenticação** | JWT (JSON Web Tokens) |
| **Estilização** | CSS3 com Glassmorphism |
| **Gráficos** | Chart.js |
| **Ícones** | Font Awesome |
| **Hospedagem** | Vercel / Localhost |

---

## 📁 Estrutura do Projeto

```
📁 sistema-chamados-ti/
│
├── 📁 backend/
│   ├── 📄 server.js          # Servidor Node.js
│   ├── 📄 db.js              # Conexão com MySQL
│   ├── 📄 .env               # Configurações de ambiente
│   └── 📄 package.json       # Dependências do backend
│
├── 📁 frontend/
│   ├── 📄 index.html         # Tela de login
│   ├── 📄 dashboard.html     # Painel principal
│   ├── 📄 estilo.css         # Estilos da aplicação
│   └── 📄 script.js          # Lógica do frontend
│
└── 📄 README.md              # Documentação
```

---

## 🔧 Instalação e Execução

### Pré-requisitos

- Node.js (versão 18 ou superior)
- MySQL (versão 8 ou superior)
- Navegador web moderno

### Passo 1: Clonar o repositório

```bash
git clone https://github.com/Guimelosilva/chamados-ti.git
cd chamados-ti
```

### Passo 2: Configurar o Banco de Dados

1. Crie um banco de dados no MySQL:
```sql
CREATE DATABASE chamados_ti;
```

2. Execute o script SQL para criar as tabelas:
```sql
USE chamados_ti;

-- Tabela de usuários
CREATE TABLE usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    ramal VARCHAR(20) NOT NULL,
    setor VARCHAR(100) NOT NULL,
    login VARCHAR(50) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    tipo ENUM('admin', 'ti', 'comum') NOT NULL DEFAULT 'comum',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de chamados
CREATE TABLE chamados (
    id INT PRIMARY KEY AUTO_INCREMENT,
    equipe VARCHAR(50) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    descricao TEXT NOT NULL,
    setor VARCHAR(100) NOT NULL,
    ramal VARCHAR(20) NOT NULL,
    solicitante_id INT NOT NULL,
    solicitante_nome VARCHAR(100) NOT NULL,
    solicitante_email VARCHAR(100) NOT NULL,
    status ENUM('aberto', 'em_andamento', 'suspenso', 'fechado') DEFAULT 'aberto',
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_fechamento TIMESTAMP NULL,
    campo_bonus VARCHAR(255) NULL,
    tecnico_responsavel VARCHAR(100) NULL,
    solucao TEXT NULL,
    houve_troca BOOLEAN DEFAULT FALSE,
    tipo_troca VARCHAR(50) NULL,
    houve_remanejamento BOOLEAN DEFAULT FALSE,
    remanejamento_origem VARCHAR(200) NULL,
    remanejamento_destino VARCHAR(200) NULL,
    ultimo_motivo_suspensao TEXT NULL,
    data_suspensao TIMESTAMP NULL,
    FOREIGN KEY (solicitante_id) REFERENCES usuarios(id)
);

-- Tabela de histórico de suspensões
CREATE TABLE historico_suspensoes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    chamado_id INT NOT NULL,
    data_suspensao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    suspenso_por VARCHAR(100) NOT NULL,
    motivo TEXT NOT NULL,
    FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE CASCADE
);

-- Inserir usuário administrador
INSERT INTO usuarios (nome, email, ramal, setor, login, senha, tipo) 
VALUES ('Administrador', 'admin@hof.com', '100', 'TI', 'administrador.hof', 'Cpd@090966', 'admin');
```

### Passo 3: Configurar o Backend

1. Entre na pasta `backend`:
```bash
cd backend
```

2. Crie o arquivo `.env`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha_aqui
DB_NAME=chamados_ti
DB_PORT=3306

PORT=3001
JWT_SECRET=chamados_ti_secret_key_2024
```

3. Instale as dependências:
```bash
npm install
```

4. Inicie o servidor:
```bash
npm run dev
```

### Passo 4: Executar o Frontend

1. Em outro terminal, navegue até a pasta `frontend`:
```bash
cd frontend
```

2. Execute o Live Server (VSCode) ou use:
```bash
npx live-server --port=3000
```

### Passo 5: Acessar o Sistema

- **URL:** `http://localhost:3000`
- **Credenciais padrão:**
  - Usuário: `administrador.hof`
  - Senha: `Cpd@090966`

---

## 🎨 Categorias Dinâmicas por Equipe

| Equipe | Categorias Disponíveis |
|--------|----------------------|
| **Suporte** | Rede, Monitor, Programa/Software, Impressora, Periféricos, CPU, Sem Categoria |
| **Sistema** | SoulMV/MVPEP, Anatomia Patologia, Cockpit, Vivace, WS |
| **Telefonia** | Ramal Mudo, Ramal Quebrado, Remanejamento de Ramal, Ramal com Ruído, Ramal Baixo |

---

## 🔐 Tipos de Usuário

| Tipo | Permissões |
|------|------------|
| **Admin** | Gerenciar usuários, ver relatórios, exportar dados, ver todos os chamados |
| **Equipe TI** | Capturar, fechar e suspender chamados, ver lista de chamados |
| **Comum** | Abrir chamados, visualizar seus próprios chamados |

---

## 📊 Funcionalidades Técnicas

| Funcionalidade | Descrição |
|----------------|-----------|
| **Autenticação JWT** | Tokens seguros para acesso à API |
| **Filtros Avançados** | Filtrar chamados por status, equipe, data, etc. |
| **Ordenação** | Ordenar chamados por número, data, assunto |
| **Modais de Ação** | Confirmação para capturar, fechar e suspender chamados |
| **Anexos** | Upload de imagens e documentos nos chamados |
| **Exportação** | Exportar dados em JSON e CSV |
| **Glassmorphism** | Design moderno com efeitos visuais |

---

## 🖥️ Interface do Sistema

### Tela de Login
- Autenticação segura
- Criação de conta para novos usuários

### Dashboard (Admin)
- Cards com estatísticas (Total, Abertos, Em Andamento, Suspensos, Fechados)
- Gráficos de distribuição por status e equipe
- Botões para exportar dados

### Meus Chamados (Usuário Comum)
- Lista de chamados abertos pelo usuário
- Status atualizado em tempo real

### Chamados (Equipe TI)
- Lista de todos os chamados com filtros
- Botões para capturar, fechar e suspender
- Modais de confirmação com campos detalhados

### Novo Chamado
- Seleção de equipe e categoria dinâmica
- Campos extras conforme categoria
- Upload de anexos

### Usuários (Admin)
- Lista de usuários cadastrados
- Criação de novos usuários
- Gestão de senhas

---

## 🚀 Deploy

### Deploy na Vercel

1. Crie uma conta em [Vercel](https://vercel.com)
2. Conecte seu repositório GitHub
3. Configure as variáveis de ambiente
4. Clique em "Deploy"

### Deploy em Servidor Local

1. Instale Node.js e MySQL
2. Clone o repositório
3. Configure o arquivo `.env`
4. Execute `npm run dev` na pasta `backend`
5. Abra o frontend com Live Server

---

## 📝 Melhorias Futuras

- [ ] Notificações em tempo real (WebSockets)
- [ ] Chat integrado entre técnico e solicitante
- [ ] Aplicativo mobile (React Native)
- [ ] Integração com e-mail para notificações
- [ ] Relatórios avançados com gráficos interativos
- [ ] Sistema de SLA (Service Level Agreement)
- [ ] Escalação automática de chamados

---

## 🤝 Contribuição

Este é um projeto independente para estudo, mas contribuições são bem-vindas!

1. Faça um **Fork** do projeto
2. Crie uma **Branch** (`git checkout -b feature/melhoria`)
3. Commit suas alterações (`git commit -m 'Adiciona melhoria'`)
4. Push para a Branch (`git push origin feature/melhoria`)
5. Abra um **Pull Request**

---

## 📄 Licença

Este projeto está sob a licença **MIT** - sinta-se livre para usar, modificar e distribuir.

```
MIT License

Copyright (c) 2024 Projeto Independente

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files...
```

---

## 👨‍💻 Autor

**Guilherme Melo**

- GitHub: [@Guimelosilva](https://github.com/Guimelosilva)
- LinkedIn: [Guilherme Melo](https://www.linkedin.com/in/guilherme-melo-645b65207)
- Email: guigomelosilva85@gmail.com

---

## 🙏 Agradecimentos

- **OpenWeatherMap** - Inspiração para o design
- **Chart.js** - Biblioteca de gráficos
- **Font Awesome** - Ícones
- **Comunidade de desenvolvedores** - Suporte e inspiração

---

## 💡 Curiosidades

- O sistema usa **Glassmorphism** para um design moderno
- As categorias são **dinâmicas** baseadas na equipe selecionada
- Os chamados podem ter **anexos** (imagens e documentos)
- O histórico de **suspensões** é mantido para auditoria
- A exportação de dados gera arquivos **JSON e CSV**

---

## 📈 Status do Projeto

✅ **CONCLUÍDO**

Todas as funcionalidades planejadas foram implementadas:
- ✅ Autenticação de usuários
- ✅ Criação e gestão de chamados
- ✅ Captura e fechamento de chamados
- ✅ Sistema de suspensão com justificativa
- ✅ Categorias dinâmicas por equipe
- ✅ Upload de anexos
- ✅ Painel administrativo
- ✅ Relatórios e exportação
- ✅ Interface Glassmorphism
- ✅ Responsividade

---

## ⭐ Avalie o Projeto

Se você gostou deste projeto, considere:
- Deixar uma ⭐ no **GitHub**
- Compartilhar com outros desenvolvedores
- Fazer um **fork** e criar sua própria versão

---

**Sistema de Chamados TI - Gerenciamento simples e eficiente** 🚀

*Última atualização: Junho de 2026*
```

---

## 📁 Como adicionar o README

1. Na pasta raiz do seu projeto, crie um arquivo chamado `README.md`
2. Copie todo o conteúdo acima
3. Salve o arquivo
4. Se estiver no GitHub, ele vai aparecer automaticamente na página inicial

---

**Agora seu projeto tem documentação profissional completa!** 🎉