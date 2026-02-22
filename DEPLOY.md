# Deploy no Vercel - Requirements Assistant

## Pré-requisitos

1. **URL da API em produção**: Antes do deploy, edite `src/environments/environment.production.ts` e substitua `apiUrl` pela URL real do seu backend (ex: `https://api.seudominio.com`).

2. **Backend publicado**: Certifique-se de que sua API Java está publicada e acessível na internet (Heroku, Railway, AWS, etc.).

## Deploy via Vercel CLI

```bash
# Instalar Vercel CLI (se ainda não tiver)
npm i -g vercel

# Fazer login (na primeira vez)
vercel login

# Deploy (preview)
vercel

# Deploy em produção
vercel --prod
```

## Deploy via Git (recomendado)

1. Acesse [vercel.com](https://vercel.com) e faça login.
2. Clique em **Add New** → **Project**.
3. Importe o repositório do GitHub/GitLab/Bitbucket.
4. O Vercel detecta automaticamente o Angular e usa o `vercel.json` do projeto.
5. Clique em **Deploy**.

A cada push na branch principal, um novo deploy será feito automaticamente.

## Configuração da API em produção

O build de produção usa `environment.production.ts`. A URL da API é definida em:

```
src/environments/environment.production.ts
```

Altere a linha:

```typescript
apiUrl: 'https://sua-api-producao.com',  // ← Coloque aqui a URL real
```

Exemplos:
- Backend no Heroku: `https://seu-app.herokuapp.com`
- Backend no Railway: `https://seu-app.up.railway.app`
- Domínio próprio: `https://api.seudominio.com`

**Importante**: O backend precisa ter CORS configurado para aceitar requisições do domínio do Vercel (ex: `https://seu-projeto.vercel.app`).
