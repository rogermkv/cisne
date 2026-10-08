# CISNE — Project State

Last updated: 2026-10-08

## Current Git State

Branch: `main`

Base HEAD: `eac3babace6548c814a85228e76835b20968e921`

Origin: `eac3babace6548c814a85228e76835b20968e921`

Production: `UNKNOWN` nesta sessão; a página inicial autenticada carregou, mas o SHA publicado e o smoke interno não foram confirmados.

Working tree: limpo; navegação persistente da Área do Sócio publicada em `eac3bab`.

Stash: `stash@{0}` preservado; não aplicar automaticamente.

## Current Production Architecture

Deploy: `mkv-auto-deploy.timer` → `mkv-auto-deploy.service` → `deploy-all` → `deploy-one cisne`.

Application: `/opt/apps/cisne/app`.

API: `cisne-api.service`.

Frontend: Nginx servindo `/opt/apps/cisne/app/apps/web/dist`.

Persistence: bare repository em `/opt/deploy/repos/cisne.git`, estado em `/opt/deploy/state/cisne.commit`, `.env` e mídia persistente preservados.

Health checks: obrigatórios após deploy; o SHA publicado deve ser confirmado.

Releases anteriores: `/opt/apps/cisne/releases`.

## Local Development

Project path: `C:\Users\herpich.LOCAL\Projetos\CISNE`.

Database: PostgreSQL local, `localhost:5432`, database `cisne`, schema `public`.

Current schema state: migrations atuais aplicadas no banco local.

Dependencies: sincronizadas com `npm ci`; Prisma Client regenerado.

Build: completo PASS.

Backup local anterior às migrations: `C:\Users\herpich.LOCAL\Projetos\_backup_cisne_db\cisne-local-20261006-161612.dump`.

## Media Architecture

MediaAsset: fundação centralizada para mídia, com `storageKey`, visibility, purpose e metadados.

Storage: `MEDIA_STORAGE_ROOT`; mídia persistente de produção é separada do ambiente local.

Private member photos: fotos de associados são privadas, autenticadas por Bearer e servidas como Blob/Object URL no frontend.

Legacy compatibility: `photoPath` e `/uploads/person-photos` ainda podem existir para compatibilidade; não são equivalentes a `MediaAsset`.

Local testing caveats: antes de testar fotos, confirmar que a mídia local existe no storage local e que o registro local usa a arquitetura equivalente à produção. Nunca usar storage de produção como storage local.

## Current Task

Título: Navegação persistente da Área do Sócio

Status: READY FOR PRODUCTION RELEASE

Cause: as telas internas eram renderizadas diretamente por `MemberHome`, sem o shell compartilhado que contém o cabeçalho e a barra inferior.

Files currently modified:

- `apps/web/src/modules/core/member-area/member-shell.css`
- `apps/web/src/modules/core/member-area/MemberHome.tsx`
- `apps/web/src/modules/core/reservations/ReservationsPage.tsx`

Validated: build completo PASS, testes automatizados relevantes quase todos PASS, primeira carga da foto PASS, cinco ciclos Início → Reservas → Início PASS, Eventos → Início PASS, Avisos → Início PASS e Mais → Início PASS.

Final local validation: titular PASS, dependente PASS, modal/carteirinha PASS, refresh PASS, Reservas após refresh PASS, cinco ciclos PASS, Eventos/Avisos/Mais PASS, build PASS e testes relevantes PASS. A integração de mídia permanece pendente somente por fixture de credenciais locais incompatível.

Production validation: RELEASE_COMMIT `693eb90bfb55020265ff04836a79f38ed66b2ed1`; deploy oficial concluído; titular PASS; Reservas → Início PASS; dependentes/modal PASS; refresh PASS; health PASS; nenhuma migration pendente; stash preservado.

Navigation validation: shell compartilhado com header persistente, bottom navigation persistente, item ativo por view, suporte a safe-area e remoção do botão redundante de Reservas. Build PASS e validação visual local PASS em viewport mobile.

Pending: confirmar auto-deploy e concluir smoke interno de produção; a tela inicial de produção carrega, mas a automação do navegador não conseguiu acionar a navegação interna nesta sessão.

## Known Risks

- auto deploy associado à branch `main`;
- stash antigo preservado e não aplicado;
- diferenças entre storage local e produção;
- confusão entre `photoPath` legado e `MediaAsset`;
- declarar PASS um teste que não reproduza a condição real;
- alterar produção fora do processo oficial.

## Latest Verification

- `HEAD` e `origin/main`: `eac3babace6548c814a85228e76835b20968e921`.
- `git status -sb`: limpo; `stash@{0}` preservado e não aplicado.
- API DEV iniciada em `http://localhost:3338/api/health`, HTTP 200.
- Frontend DEV iniciado em `http://localhost:5178`; o repositório ainda contém defaults históricos em `vite.config.ts`/configuração da API para `5173`/`3333`, então as portas solicitadas foram usadas por override de processo, sem alterar o código de configuração nesta tarefa.
- Build completo: PASS.
- Produção: página inicial acessível na sessão autenticada do navegador e exibe header/bottom nav; navegação interna e health HTTP não foram confirmados nesta sessão por bloqueio do proxy terminal e timeout da automação de clique.

## Next Step

Confirmar o auto-deploy oficial e executar o smoke interno de produção em uma sessão com acesso funcional à navegação do navegador.
