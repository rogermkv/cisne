# CISNE — Project State

Last updated: 2026-10-07

## Current Git State

Branch: `main`

Base HEAD: `ec5901838866120d0c95f43329143622d181b45d`

Origin: `ec5901838866120d0c95f43329143622d181b45d`

Production: `ec5901838866120d0c95f43329143622d181b45d`

Working tree: somente os dois arquivos da correção da foto estão modificados.

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

Título: Correção da foto da carteirinha após navegação

Status: READY FOR PRODUCTION RELEASE

Cause: a implementação antiga sobrescrevia `photoPath` com Blob URL; ao recarregar `/api/member/me` durante a navegação, o caminho privado original voltava, mas o efeito dependente apenas de `member.id` não era reexecutado. O elemento de imagem tentava acessar mídia privada sem o fluxo autenticado correto.

Files currently modified:

- `apps/web/src/components/PrivateMemberPhoto.tsx`
- `apps/web/src/modules/core/member-area/MemberHome.tsx`

Validated: build completo PASS, testes automatizados relevantes quase todos PASS, primeira carga da foto PASS, cinco ciclos Início → Reservas → Início PASS, Eventos → Início PASS, Avisos → Início PASS e Mais → Início PASS.

Final local validation: titular PASS, dependente PASS, modal/carteirinha PASS, refresh PASS, Reservas após refresh PASS, cinco ciclos PASS, Eventos/Avisos/Mais PASS, build PASS e testes relevantes PASS. A integração de mídia permanece pendente somente por fixture de credenciais locais incompatível.

Pending: publicação autorizada nesta execução após auditoria dos SHAs.

## Known Risks

- auto deploy associado à branch `main`;
- stash antigo preservado e não aplicado;
- diferenças entre storage local e produção;
- confusão entre `photoPath` legado e `MediaAsset`;
- declarar PASS um teste que não reproduza a condição real;
- alterar produção fora do processo oficial.

## Next Step

Publicar a correção pelo processo oficial e validar produção.
