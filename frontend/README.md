# AccessManager Frontend

Frontend React criado com Vite para o projeto AccessManager.

## Executar

```bash
cp .env.example .env
npm install
npm run dev
```

O backend deve estar disponível em `http://localhost:3000` ou na URL definida em `VITE_API_URL`.

## Rotas

- `/` — landing page
- `/login` — autenticação
- `/cadastro` — criação de conta
- `/esqueci-minha-senha` — recuperação de senha

As telas esperam os endpoints `POST /auth/login`, `POST /auth/register` e `POST /auth/forgot-password`.
