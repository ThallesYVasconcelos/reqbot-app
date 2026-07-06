# Requirements Assistant

Aplicação web para gestão e refinamento de requisitos de software com auxílio de IA. Permite criar projetos, cadastrar requisitos em linguagem natural, refiná-los automaticamente e consultar via chatbot.

## Funcionalidades

### Gestão de Projetos
- Criar projetos com nome e descrição
- Listar, visualizar e excluir projetos
- Organizar requisitos por projeto

### Gestão de Requisitos
- **Refinar com IA**: descreva o requisito em linguagem natural e a IA gera uma versão refinada (User Story)
- **Edição**: prompt original e requisito refinado editáveis
- **Escolha de versão**: salvar como refinado ou original
- **Análise**: pontos negativos (ambiguidade, duplicidade, falta de contexto) identificados pela IA
- **Relatório**: visão geral de requisitos com problemas, conflitos e sugestões de resolução

### Chatbot
- Perguntas sobre os requisitos do projeto
- Histórico de conversas por sessão (persistido em localStorage)
- Múltiplas conversas por projeto

### Autenticação
- Login com Google (admin e usuário)
- Rotas protegidas por role (admin vs usuário)

## Tecnologias

- **Angular 21** (standalone components)
- **Tailwind CSS**
- **TypeScript 5.9**
- **RxJS**
- **SSR** (Server-Side Rendering)

## Pré-requisitos

- Node.js 18+
- npm 11+
- Backend API (configurado em `src/environments/environment.ts`)

## Instalação

```bash
# Clonar o repositório
git clone <url-do-repositorio>
cd RequirementsAssistant

# Instalar dependências
npm install

# Configurar variáveis de ambiente
# Editar src/environments/environment.ts com a URL da API e Google Client ID
```

## Configuração

### Variáveis de ambiente

Edite `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'https://reqbot-lln3.onrender.com',  // URL do backend
  googleClientId: 'SEU_CLIENT_ID.apps.googleusercontent.com'
};
```

Para produção, configure `src/environments/environment.production.ts` e ajuste o `angular.json` com `fileReplacements`.

### Google OAuth

1. Crie um projeto no [Google Cloud Console](https://console.cloud.google.com)
2. Configure OAuth 2.0 com credenciais para aplicativo web
3. Adicione as origens autorizadas (ex: `http://localhost:4200`, `https://reqbot-lln3.onrender.com`)

## Comandos

```bash
# Servidor de desenvolvimento
npm start
# ou
ng serve

# Build de produção
npm run build

# Testes
npm test
```

## Estrutura do projeto

```
src/
├── app/
│   ├── components/
│   │   ├── admin/          # Dashboard, projetos, requisitos, chat
│   │   ├── chatbot/        # Chatbot do usuário
│   │   ├── login/          # Telas de login
│   │   └── shared/         # Modal de confirmação
│   ├── guards/             # Auth e role guards
│   ├── interceptors/      # Interceptor de autenticação
│   ├── models/             # Interfaces (Requirement, RequirementSet, etc.)
│   └── services/           # API, auth, requirement, chatbot
├── environments/            # Configurações por ambiente
└── styles.css
```

## Fluxo de requisitos

1. **Refinar**: `POST /api/requirements/refine` – IA processa o prompt (não salva)
2. **Editar**: ajustar prompt e requisito refinado
3. **Escolher versão**: usar refinado ou original
4. **Salvar**: `POST /api/requirements/save` – persiste no banco
5. **Relatório**: `GET /api/requirements/report` – duplicatas, conflitos, sugestões

## API esperada

O frontend espera um backend com endpoints como:

- `POST /api/auth/admin/google`, `POST /api/auth/user/google`
- `GET /api/requirement-sets`, `POST /api/requirement-sets`
- `GET /api/requirements`, `POST /api/requirements/refine`, `POST /api/requirements/save`
- `GET /api/requirements/report?requirementSetId=...`
- `GET /api/user/chatbot/requirements`, `POST /api/chatbot/ask`

## Licença

Projeto privado.
