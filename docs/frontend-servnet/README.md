# Identidade SERVNET / ASJCOESP

O portal passa a usar uma identidade institucional própria: azul profundo, superfícies claras, detalhes em cobre, marca vetorial SERVNET e assinatura ASJCOESP. A composição combina tipografia de sistema para serviços e Georgia nas mensagens institucionais, sem downloads de fontes ou recursos externos.

A página inicial apresenta os serviços reais do portal. Login, cadastro, recuperação e troca de senha compartilham a mesma linguagem. Os painéis usam navegação lateral no desktop e navegação em duas colunas no celular, com o conteúdo organizado em resumos, formulários e listas. Tabelas viram registros com rótulos em telas pequenas. Formulários, documentos, diálogos, mensagens e status seguem a mesma paleta.

## Escopo preservado

Backend, rotas e contratos de API, autenticação, proteção de rotas, permissões, armazenamento de sessão, serviços do frontend e handlers dos fluxos existentes permanecem intactos. O menu apenas torna visível a área de RH para contas que já possuem `isHr`; a autorização continua em `ProtectedRoute` e no backend.

Não há alteração em nenhum `schema.prisma`, migration, dependência ou lockfile. Não foram executados comandos de migration, seed nem operações contra o banco nesta tarefa.

## Validação

| Verificação | Resultado |
| --- | --- |
| `cd backend && npm test` | 9 arquivos de teste passaram |
| `cd frontend && npm test` | Arquivo de testes de autenticação passou |
| `cd frontend && npm run lint` | Sem erros; um aviso preexistente de Fast Refresh em `src/context/AuthContext.jsx` |
| `cd frontend && npm run build` | Build de produção Vite concluído |
| Chromium / Playwright | 1440, 768, 390 e 320 pixels; sem erros de JavaScript nem overflow horizontal da página |
| `git diff --check` | Sem problemas de whitespace |

A verificação no navegador usa respostas simuladas da API e dados sintéticos. Ela verifica renderização e interações do frontend, envio das requisições esperadas, estados vazios e falha de carregamento. Não substitui um teste integrado com banco, envio real de e-mail e armazenamento privado; as regras desses serviços são cobertas pelos testes existentes do backend.

Fluxos exercitados em cada largura: login e validação de campos, solicitação de recuperação, cadastro (renderização de grupos e cargos), criação de usuário, edição (abertura e cancelamento), pesquisa, definição de senha temporária, criação de cliente, envio de férias, aprovação do coordenador, recusa com motivo pelo RH, upload de holerite/IRPF/boleto, download do cliente, redirecionamento por perfil, troca obrigatória de senha e saída. Também foram inspecionadas as capturas de desktop e celular.

Melhorias de acessibilidade incluem foco visível, atalhos para o conteúdo principal, rótulos e descrições de erro independentes nos campos, regiões de tabela acessíveis pelo teclado e respeito à preferência de movimento reduzido.

## Reproduzir a verificação no navegador

Com Chromium instalado e o frontend em execução em `http://localhost:5173`:

```bash
npm install --prefix /tmp/servnet-ui --no-save playwright
NODE_PATH=/tmp/servnet-ui/node_modules \
  SERVNET_CHROMIUM_PATH=/usr/bin/chromium \
  node docs/frontend-servnet/verify-ui.cjs
```

Execute a partir da raiz do repositório. O script intercepta as chamadas a `http://localhost:3000`, salva capturas em `/tmp/servnet-screenshots` e imprime um resumo por largura. `SERVNET_SCREENSHOT_DIR` permite mudar o destino. Nenhuma dependência de testes foi adicionada ao aplicativo.

## Evidências visuais

As capturas usam nomes, e-mails e documentos fictícios.

| Tela | Desktop | Celular |
| --- | --- | --- |
| Início | [1440 px](screenshots/inicio-desktop.png) | [390 px](screenshots/inicio-mobile.png) |
| Login e validação | [1440 px](screenshots/login-desktop.png) | [390 px](screenshots/login-mobile.png) |
| Administração | [1440 px](screenshots/administracao-desktop.png) | [390 px](screenshots/administracao-mobile.png) |
| Edição de acesso | [1440 px](screenshots/editar-acesso-desktop.png) | [390 px](screenshots/editar-acesso-mobile.png) |
| Clientes | [1440 px](screenshots/clientes-desktop.png) | [390 px](screenshots/clientes-mobile.png) |
| Funcionário | [1440 px](screenshots/funcionario-desktop.png) | [390 px](screenshots/funcionario-mobile.png) |
| Coordenador | [1440 px](screenshots/coordenador-desktop.png) | [390 px](screenshots/coordenador-mobile.png) |
| RH | [1440 px](screenshots/rh-desktop.png) | [390 px](screenshots/rh-mobile.png) |
| Publicação de documentos | [1440 px](screenshots/documentos-desktop.png) | [390 px](screenshots/documentos-mobile.png) |
| Portal do cliente | [1440 px](screenshots/portal-cliente-desktop.png) | [390 px](screenshots/portal-cliente-mobile.png) |
| Troca obrigatória de senha | [1440 px](screenshots/alterar-senha-desktop.png) | [390 px](screenshots/alterar-senha-mobile.png) |
