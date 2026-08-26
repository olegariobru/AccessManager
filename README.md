# AccessManager

Sistema web para gestão de acessos, estrutura organizacional e rotinas internas. O projeto centraliza usuários, perfis, grupos, cargos, solicitações de férias, holerites e auditoria em uma aplicação com autorização baseada em papéis.

> Projeto de portfólio em desenvolvimento, criado para exercitar arquitetura full stack, segurança, modelagem relacional, regras de negócio e testes automatizados.

## O problema que o projeto resolve

Processos internos frequentemente ficam espalhados entre planilhas, mensagens e cadastros sem regras consistentes. O AccessManager transforma esse cenário em fluxos rastreáveis:

- cada usuário possui perfil, cargo e grupo definidos;
- solicitações de férias seguem a hierarquia correta;
- coordenadores enxergam apenas os grupos sob sua responsabilidade;
- o RH recebe solicitações já liberadas para decisão final;
- o administrador atua como usuário master;
- alterações sensíveis ficam registradas em uma trilha de auditoria.

## Funcionalidades

### Autenticação e segurança

- Login com JWT e senhas protegidas com `bcrypt`.
- Autorização recarregada do banco a cada requisição autenticada.
- Invalidação de sessões anteriores após alteração ou redefinição de senha.
- Rate limiting específico para login e recuperação de senha.
- Proteções HTTP com Helmet e configuração explícita de CORS.
- Resposta neutra na recuperação de senha para evitar enumeração de e-mails.

### Gestão organizacional

- Perfis `USER`, `COORDINATOR`, `ADMIN` e `CLIENT`, com clientes separados dos funcionários.
- Grupos e cargos normalizados em entidades próprias.
- Histórico de vínculos organizacionais.
- Coordenadores associados a um ou mais grupos.
- Administrador master com acesso a todos os grupos ativos.
- Inativação lógica de usuários para preservação do histórico.
- Pesquisa administrativa por nome ou e-mail.

### Fluxo de férias

```mermaid
flowchart LR
  U[Funcionário solicita] --> P[Pendente do coordenador]
  P -->|Aprovada| H[Pendente do RH]
  P -->|Recusada| R[Recusada]
  C[Coordenador ou admin solicita] --> H
  H -->|Aprovada| A[Férias marcadas]
  H -->|Recusada com motivo| R
```

- Validação do período e prevenção de solicitações sobrepostas.
- Encaminhamento por grupo para o coordenador responsável.
- Coordenadores e administradores não analisam as próprias férias.
- Solicitações próprias de coordenador ou administrador seguem diretamente ao RH.
- Histórico de mudanças de status, responsável e motivo.

### Holerites e auditoria

- Cadastro de clientes pelo administrador com nome completo, CPF validado, telefone, e-mail, data de nascimento opcional e senha temporária.
- CPF mascarado nas respostas da API e troca obrigatória da senha temporária no primeiro acesso.
- Holerites organizados por usuário e competência.
- Publicação de holerites e arquivos anuais de IRPF em PDF exclusivamente por profissionais vinculados aos grupos RH ou Contabilidade.
- Publicação de boletos emitidos na plataforma Itaú exclusivamente pela Contabilidade, com vencimento, valor e linha digitável opcionais.
- Rota protegida `/cliente`, exclusiva do perfil `CLIENT`, onde o cliente apenas consulta e captura os próprios documentos publicados.
- Separação entre metadados do arquivo e armazenamento privado, sem URL pública.
- Validação do conteúdo PDF, limite de 10 MB e download autenticado/auditado.
- Auditoria com ator, nome, e-mail, descrição legível, entidade afetada e alterações em JSON.
- Preservação da identidade do ator mesmo após mudanças futuras no cadastro.

## Arquitetura

```mermaid
flowchart TB
  UI[React + Vite] -->|Axios / JSON e PDF| API[Express API]
  API --> AUTH[Autenticação e autorização]
  API --> SERVICES[Regras de negócio]
  SERVICES --> REPOS[Repositories]
  REPOS --> PRISMA[Prisma ORM]
  PRISMA --> DB[(PostgreSQL)]
```

O backend segue uma separação em camadas:

- **Routes:** definição dos endpoints e middlewares de autorização.
- **Controllers:** tradução entre HTTP e casos de uso.
- **Services:** regras de negócio e auditoria.
- **Repositories:** persistência e consultas com Prisma.
- **Prisma:** schema, constraints, índices e migrations versionadas.

Mais detalhes estão em [docs/database.md](docs/database.md).

## Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Frontend | React 19, Vite, React Router, Axios, Lucide React |
| Backend | Node.js, Express 5, JWT, bcrypt, Helmet, Nodemailer |
| Banco de dados | PostgreSQL, Prisma ORM e migrations SQL |
| Qualidade | Node Test Runner, ESLint e build de produção com Vite |

## Estrutura do repositório

```text
AccessManager/
├── backend/
│   ├── prisma/            # Schema e migrations
│   ├── src/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── repositories/
│   │   ├── routes/
│   │   └── services/
│   └── test/              # Testes automatizados
├── frontend/
│   └── src/
│       ├── components/
│       ├── context/
│       ├── pages/
│       └── services/
├── docs/                  # Documentação técnica
└── README.md
```

## Como executar localmente

### Pré-requisitos

- Node.js 20.19 ou superior.
- npm.
- PostgreSQL disponível localmente.

### 1. Clone o projeto

```bash
git clone https://github.com/olegariobru/AccessManager.git
cd AccessManager
```

### 2. Configure o backend

```bash
cd backend
npm install
```

Copie `backend/.env.example` para `backend/.env` e ajuste pelo menos:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/access_manager"
JWT_SECRET="defina-um-segredo-longo-e-aleatorio"
PORT=3000
CORS_ORIGIN="http://localhost:5173"
# Opcional: diretório privado dos PDFs
PRIVATE_STORAGE_DIR="C:/AccessManager/storage/private"
```

Prepare o banco e inicie a API:

```bash
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

Se uma instalação anterior registrou a migration de clientes como falha, marque
somente essa tentativa como revertida antes de executar novamente o deploy:

```bash
npx prisma migrate resolve --rolled-back 20260826190000_add_client_accounts
npm run db:migrate:deploy
```

A API ficará disponível em `http://localhost:3000`.

### 3. Configure o frontend

Em outro terminal:

```bash
cd frontend
npm install
```

Copie `frontend/.env.example` para `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000
```

Inicie a interface:

```bash
npm run dev
```

A aplicação ficará disponível em `http://localhost:5173`.

## Validação e testes

Backend:

```bash
cd backend
npm test
npm run db:validate
```

Frontend:

```bash
cd frontend
npm test
npm run lint
npm run build
```

Os testes cobrem regras críticas como autorização, isolamento por grupo e por cliente, fluxo de férias, redefinição de senha, auditoria, holerites, IRPF, boletos e validações de PDF.

## Decisões técnicas relevantes

- **Permissões fora do JWT:** o token identifica a sessão, mas o acesso atual é recarregado do banco para evitar permissões desatualizadas.
- **Soft delete:** usuários são inativados em vez de apagados, preservando férias, holerites e auditoria.
- **Auditoria enriquecida:** além do ID relacional, nome e e-mail do ator são preservados como snapshot.
- **Transações:** operações que alteram múltiplas relações são executadas atomicamente.
- **Integridade no banco:** índices, chaves estrangeiras e constraints complementam as validações da aplicação.
- **Arquivos privados:** o banco armazena apenas metadados e a chave de armazenamento, nunca o documento sensível diretamente.
- **Publicação por grupo:** permissões de documento são recarregadas do vínculo organizacional; perfil administrativo sem vínculo com RH ou Contabilidade não publica.
- **Portal Cliente:** não possui upload nem alteração; o download só é liberado ao proprietário de um item publicado ou ao administrador.
- **Cadastro separado:** clientes são criados por administradores em `/admin/clientes`; não aparecem na gestão de funcionários e apenas clientes ativos aparecem na seleção de documentos.
- **Boleto Itaú:** esta versão captura o PDF já emitido na plataforma do banco; uma sincronização direta por API exige credenciais e contrato de integração do Itaú.

## Próximas evoluções

- Sessões revogáveis com refresh token em cookie HttpOnly.
- Cadastro organizacional por convites de uso único.
- Documentação OpenAPI/Swagger.
- Paginação consistente nas listagens administrativas.
- Logs estruturados e observabilidade.
- Pipeline de integração contínua no GitHub Actions.
- Deploy após definição da infraestrutura.

## Autor

Desenvolvido por [Bruno Olegário](https://github.com/olegariobru).

Se este projeto chamou sua atenção, fique à vontade para explorar o código, as decisões arquiteturais e o histórico de evolução do repositório.
