# CISNE — Sistema de Gestão do Clube Ser Cisne

Fundação técnica do sistema web responsivo/PWA do Clube Ser Cisne, de Santa
Rosa-RS. O projeto usa um monorepo npm simples, com frontend React e uma API
Fastify modular compartilhando um único banco PostgreSQL.

## Estrutura

```text
cisne/
├── apps/
│   ├── api/                    # Fastify + TypeScript + Prisma
│   │   ├── prisma/schema.prisma
│   │   └── src/modules/        # Módulos do backend monolítico
│   └── web/                    # React + TypeScript + Vite + PWA
├── .env.example
└── package.json                # Workspaces e comandos do monorepo
```

Os módulos previstos (`core`, `socios`, `financeiro`, `reservas`,
`comunicacao`, `tenis`, `eventos` e `governanca`) pertencem à mesma API e ao
mesmo banco. O módulo `core` contém o health check, autenticação JWT e o controle
de acesso por perfis e permissões. Os módulos de negócio ainda não foram
implementados.

## Pré-requisitos

- Node.js 20 ou superior
- npm 10 ou superior
- PostgreSQL acessível localmente ou pela rede

## Instalação

Na raiz do projeto:

```bash
npm install
```

## Configuração

1. Crie um banco PostgreSQL vazio chamado `cisne` (ou use outro nome).
2. Copie `.env.example` para `.env` na raiz do projeto. Tanto a API, o Prisma
   CLI quanto o Vite estão configurados para carregar esse arquivo central.
3. Ajuste `DATABASE_URL` com o usuário, senha, host, porta e banco reais.
4. Preencha `JWT_SECRET` com um valor aleatório de pelo menos 32 caracteres.
5. Preencha `ADMIN_NAME`, `ADMIN_CPF`, `ADMIN_EMAIL` (opcional) e `ADMIN_PASSWORD`. A senha inicial deve
   ter pelo menos 12 caracteres e será armazenada somente como hash scrypt.

Exemplo de URL (use suas próprias credenciais):

```env
DATABASE_URL="postgresql://USUARIO:SENHA@localhost:5432/cisne?schema=public"
```

Gere o Prisma Client, aplique a migration inicial e execute o seed:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

O seed é idempotente: cria ou atualiza os perfis `ADMIN`, `SECRETARIA`,
`FUNCIONARIO` e `SOCIO`, suas permissões e o administrador configurado no
`.env`. Para criar migrations futuras:

```bash
npm run prisma:migrate -- --name nome_da_migracao
```

## Desenvolvimento

### Autenticação

O login usa CPF válido, aceitando entrada com ou sem máscara e armazenando apenas
os onze dígitos. O administrador é configurado por `ADMIN_NAME`, `ADMIN_CPF`,
`ADMIN_EMAIL` (opcional) e `ADMIN_PASSWORD`. Email e telefone são opcionais.
Associados devem possuir `birthDate`; sua senha inicial é a data de nascimento
em `DDMMAAAA`, sempre armazenada somente como hash, com troca obrigatória no
primeiro acesso (`mustChangePassword`). O administrador nunca usa a data de
nascimento como senha.

Endpoints de autenticação:

- `POST /api/auth/login` com `{ cpf, password }`
- `GET /api/auth/me` (retorna `mustChangePassword`)
- `POST /api/auth/password` autenticado com `{ currentPassword, newPassword }`

Execute API e frontend juntos:

```bash
npm run dev
```

Ou, em dois terminais separados:

```bash
npm run dev:api
npm run dev:web
```

- Frontend: `http://localhost:5173`
- Health check: `http://localhost:3333/api/health`
- Login: `POST http://localhost:3333/api/auth/login`
- Usuário autenticado: `GET http://localhost:3333/api/auth/me`

O Vite encaminha `/api` para a porta `3333` em desenvolvimento. Se a API rodar
em outro endereço, defina `VITE_API_URL` no `.env`.

O frontend mantém o token somente no `sessionStorage`, valida a sessão em
`/api/auth/me` ao carregar e a remove ao sair. Rotas protegidas devem usar o
middleware `authenticate`; rotas com autorização específica devem usar
`requirePermission('nome.da.permissao')` no backend.

## Build e execução de produção

Gere os builds dos dois aplicativos:

```bash
npm run build
```

Os artefatos ficam em `apps/web/dist` e `apps/api/dist`. Para iniciar apenas a
API compilada:

```bash
npm run start --workspace @cisne/api
```

O frontend pode ser conferido localmente com:

```bash
npm run preview --workspace @cisne/web
```

Em produção, os arquivos de `apps/web/dist` devem ser servidos por um servidor
HTTP, e `/api` deve ser encaminhado para a API. A PWA inclui manifest e service
worker gerados no build.

## Hospedagem futura

A estrutura está pronta para que, em uma etapa posterior, o servidor Linux
`192.168.0.99` use Nginx para servir o frontend e encaminhar `/api`, enquanto o
systemd mantém o processo da API ativo. Nenhum arquivo de deploy, serviço ou
configuração do servidor foi criado nesta etapa.
