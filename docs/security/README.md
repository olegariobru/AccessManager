# Segurança e sessões

## Alterações implementadas

- Cadastro público removido do frontend e do backend. Apenas `POST /auth/users` e `POST /clients`, protegidos por ADMIN, criam contas. Opções organizacionais também exigem ADMIN. As contas novas exigem troca de senha antes de acessar os serviços.
- JWT/Bearer retirado. O login retorna `{ user, csrfToken }`, sem credencial de sessão. O identificador aleatório de 256 bits fica exclusivamente no cookie HttpOnly; usuário e CSRF ficam em memória no frontend. Credenciais antigas em localStorage são apagadas ao carregar a aplicação.
- Cookie `__Host-accessmanager-session` em produção: Secure, HttpOnly, SameSite=Strict, Path=/ e sem Domain. Há rotação no login, limite absoluto de 8 horas e expiração após 30 minutos sem atividade. Sessões anônimas para CSRF duram 20 minutos.
- Redis compartilha sessões e limites de requisição entre réplicas. As chaves de sessão usam SHA-256 do identificador; o identificador bruto não é salvo. A atualização do TTL usa `SET XX`, evitando recriar uma sessão removida por logout concorrente. Redis indisponível bloqueia acesso; não existe fallback em memória em produção.
- `POST /auth/logout` remove a sessão no servidor. Troca/redefinição de senha, inativação e alteração de permissões/vínculos invalidam sessões pela versão da conta já existente no banco. Permissões são recarregadas a cada requisição, desconsiderando grupos inativos.
- Escritas, inclusive login, recuperação e PDFs, exigem origem autorizada e `X-CSRF-Token` associado à sessão. `GET /auth/csrf` prepara uma sessão anônima ou retorna o CSRF da sessão atual. O CSRF não autentica o usuário sozinho.
- Troca de senha comum exige senha atual; a troca de senha temporária é liberada, mas todas as demais operações de negócio são bloqueadas no backend. Senhas novas têm 12–128 caracteres e Argon2id; bcrypt permanece apenas para verificar contas antigas e migrar o hash no login.
- Login limitado por IP e por hash do e-mail normalizado; recuperação e acesso geral também têm limites. Comparação com hash fictício evita o retorno imediato no login de conta inexistente. Logins bem-sucedidos e encerramentos são auditados; falhas de login têm evento estruturado sem senha/e-mail.
- Funcionário, coordenador, RH e administrador não podem decidir ou marcar as próprias férias. Atualizações comparam o status esperado dentro da transação para impedir decisões concorrentes sobrescrevendo a anterior. Datas inexistentes são rejeitadas.
- Auditoria das mutações de usuários, clientes, vínculos, férias e publicação de documentos participa da mesma transação. Downloads continuam auditados antes da entrega do arquivo.
- PDFs exigem estrutura válida, páginas e término EOF, com análise em worker limitado a 64 MB, três segundos e duas validações simultâneas por processo. Conteúdo ativo conhecido e anexos são recusados. Downloads conferem SHA-256 quando disponível e não seguem links simbólicos. O endpoint alternativo de holerite não aceita metadados/chaves de arquivo do cliente.
- Erros internos retornam mensagem genérica e identificador de incidente, sem mensagens do Prisma/SMTP ou stack. Dependências de produção foram atualizadas; `npm audit --omit=dev` retornou zero alertas em ambos os projetos em 07/10/2026.

Não houve alteração em `schema.prisma` nem criação/edição de migrations. Apenas as migrations existentes foram executadas no banco descartável dos testes. Nenhum dado de produção foi acessado ou alterado.

## Configuração de produção

Defina explicitamente:

```dotenv
NODE_ENV=production
CORS_ORIGIN=https://servnet.sua-organizacao.example
REDIS_URL=rediss://usuario:senha@redis-interno.example:6379/0
VITE_API_URL=/api
```

`CORS_ORIGIN` deve conter apenas esquema, host e porta, sem caminho ou barra final. `VITE_API_URL` é usado no build do frontend. Configure um proxy HTTPS para encaminhar `/api/` ao backend, retirando o prefixo `/api`; as rotas continuam `/auth`, `/clients` e `/dashboard` no servidor. Alternativamente use uma API HTTPS em subdomínio do mesmo site. Hosts de provedores em sites diferentes não funcionam com SameSite=Strict; use domínio próprio ou proxy do portal.

Redis deve ser privado, autenticado, compartilhado por todas as réplicas, com ACL/TLS conforme a infraestrutura e sem exposição pública. Os limites e sessões não dependem de sticky sessions. Não use banco/Redis de produção para executar os testes de integração.

Se houver proxy reverso, configure `TRUST_PROXY` somente com IPs/CIDRs dos proxies reais, por exemplo `127.0.0.1/32,::1/128` para Nginx local. Não habilite confiança irrestrita nem quantidade de saltos. Bloqueie acesso direto ao backend na infraestrutura e limite o corpo também no proxy. Cookies Secure exigem HTTPS para o usuário, mesmo com TLS terminado no proxy.

Memória local é permitida apenas fora de produção; reiniciar o processo encerra essas sessões. Na implantação, sessões JWT antigas deixam de funcionar e todos precisarão entrar novamente. Atualize backend e frontend juntos. O backend não exige uma etapa de build: é JavaScript executado diretamente; lint e testes são seus checks.

## Validação executada

- 71 testes do backend e 6 do frontend aprovados. Testes unitários e HTTP reais: autenticação, CSRF, cadastro bloqueado, cookies, expiração/revogação, perfis, senha temporária, senha atual, isolamento de documentos, Argon2/bcrypt, PDF, integridade e concorrência.
- PostgreSQL 16 e Redis 7 descartáveis: uma única decisão vencedora, histórico/auditoria consistente, publicação/download de boleto e holerite, rollback de arquivo/metadados ao falhar auditoria, sessão lida por outro processo, TTL e limite compartilhado entre duas instâncias.
- Lint de backend/frontend, validação Prisma e build do frontend.
- Chromium: fluxos visuais com dados sintéticos em 1440, 768, 390 e 320 pixels; login, recuperação, administração, clientes, funcionário, coordenador, RH, PDFs, guards e logout.
- Chromium com API, PostgreSQL e Redis reais em 1440 e 390 pixels: cookie HttpOnly, ausência de credenciais no localStorage/sessionStorage, recarga mantendo sessão, CSRF inválido bloqueado, exigência de senha atual, logout e replay bloqueado, troca obrigatória e novo login. Nenhum erro JavaScript ou overflow horizontal nesses cenários.

Para repetir checks comuns:

```bash
cd backend
npm ci
npm test
npm run lint
npm run db:validate
npm audit --omit=dev
cd ../frontend
npm ci
npm test
npm run lint
npm run build
npm audit --omit=dev
```

Para integração, prepare PostgreSQL e Redis **descartáveis** locais. Exemplo de fixtures (a senha abaixo é somente de teste):

```bash
docker run -d --rm --name accessmanager-security-postgres -p 127.0.0.1:15432:5432 -e POSTGRES_DB=accessmanager_security_test -e POSTGRES_USER=security_test -e POSTGRES_PASSWORD=local_test_only postgres:16-alpine
docker run -d --rm --name accessmanager-security-redis -p 127.0.0.1:16379:6379 redis:7-alpine
cd backend
DATABASE_URL=postgresql://security_test:local_test_only@127.0.0.1:15432/accessmanager_security_test npm run db:migrate:deploy
SECURITY_TEST_DATABASE_URL=postgresql://security_test:local_test_only@127.0.0.1:15432/accessmanager_security_test SECURITY_TEST_REDIS_URL=redis://127.0.0.1:16379/1 node --test test/storage.integration.cjs
```

Os scripts recusam banco remoto ou cujo nome não comece com `accessmanager_security_test`. Criam apenas fixtures sintéticas no banco fornecido. Para navegador, execute Vite na porta 5173 e disponibilize `playwright`/Chromium no ambiente de testes, sem mudar dependências de produção:

```bash
# Na raiz do repositório; a porta 3000 deve estar livre.
SECURITY_TEST_DATABASE_URL=postgresql://security_test:local_test_only@127.0.0.1:15432/accessmanager_security_test SECURITY_TEST_REDIS_URL=redis://127.0.0.1:16379/2 node docs/security/verify-session-browser.cjs
node docs/frontend-servnet/verify-ui.cjs
```

Os scripts usam `/usr/bin/chromium`, substituível por `SERVNET_CHROMIUM_PATH`; screenshots ficam em `/tmp`, substituível por `SERVNET_SCREENSHOT_DIR`.

## Riscos que ainda exigem trabalho

Estas correções não substituem uma auditoria independente ou testes da infraestrutura de produção. Ainda faltam MFA, gestão/rotação de segredos, backups/monitoramento, criptografia de dados pessoais em repouso e uma revisão LGPD. Hashes bcrypt legados só são migrados após login/troca de senha. PDFs antigos sem checksum não podem receber verificação retroativa confiável, e validação estrutural não substitui antivírus/CDR nem verifica autenticidade de boletos.

A recuperação de senha mantém mensagem genérica, limites e aprovação administrativa, mas ainda pode apresentar diferenças de tempo por consultas/envio SMTP. Uma fila durável de notificações e resposta desacoplada do SMTP é o próximo passo para reduzir esse canal de enumeração. O login reduz o caso óbvio de usuário inexistente; diferenças entre hashes legados e Argon2 não tornam o endpoint matematicamente indistinguível.

Redis/HTTPS/domínios, SMTP e proxy devem ser validados no ambiente real antes de liberar produção. O PR não faz deploy nem merge automático.
