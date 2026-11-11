# CISNE — gestão do Clube Ser Cisne

Membros/dependentes, categorias, matrícula, acesso, visitantes/convites, reservas, comunicação, eventos,
financeiro (anuidades, cobranças, receitas de reservas) e Área do Sócio (PWA). Dados pessoais, fotos e finanças.

## Estrutura

npm workspaces: `apps/web` (React 19 + Vite/PWA) e `apps/api` (Fastify + Prisma/PostgreSQL). Mídia privada em disco.

## Comandos (no .98, em `~/projetos/cisne`)

```
npm ci
npm run prisma:generate && npm run build
npm run dev:api        # não usar "npm run dev": não sobe o web de forma confiável
npm run dev:web
npm run test:finance --workspace @cisne/api        # testes de regra (sem banco)
npm run test:club-modules --workspace @cisne/api   # smoke com banco DEV
```

Typecheck do web: `cd apps/web && ../../node_modules/.bin/tsc --noEmit -p tsconfig.app.json`.

## Ambientes

| | DEV (.98) | Produção (.99) |
|---|---|---|
| URL | http://192.168.0.98:8084 | https://cisne.sistemasmkv.com.br |
| API | 127.0.0.1:3338 (`/api/health`) | 127.0.0.1:3338 (`/api/health`) |
| Banco | PostgreSQL local 5432 | PostgreSQL 5432, banco `cisne` |
| Mídia | `MEDIA_STORAGE_ROOT` | `/opt/apps/cisne/shared/media` |
| Atualizar | `publicar cisne --dev` | `publicar cisne [--migrate]` |

## Banco e migrations

- `apps/api/prisma/`. Criar no DEV com `npm run prisma:migrate`; produção aplica pelo deploy com `--migrate`
  (backup `pg_dump` antes).
- Nunca rodar Git como root neste repositório (em 2026-11 isso deixou 590 arquivos do `.git` com dono root).

@AGENTS.md

## Regras gerais

- Contexto geral (máquinas, deploy, regras): `~/projetos/mkv-deploy/CLAUDE.md`.
- Trabalhar sempre no `main`, depois de `git status` e `git fetch`; não começar sobre base desatualizada.
- Produção só recebe código via `publicar`. Nunca editar produção à mão.
- Nunca `prisma migrate reset`, `db push` em produção, seed destrutivo ou apagar dados sem autorização explícita.
- Nunca versionar `.env`, senhas, tokens ou `DATABASE_URL` com senha.
- Ao terminar algo relevante: atualizar `docs/PROJECT_STATE.md` e acrescentar entrada em `docs/DEVLOG.md` (append-only).
