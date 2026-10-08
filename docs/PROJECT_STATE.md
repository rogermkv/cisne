# CISNE — Project State

Last updated: 2026-10-08

## Current Git State

Branch: `main`

Base HEAD: `59153c2` (`fix: show family titular in dependent card modal`)

Origin: `59153c2`

Production functional release: `59153c2` publicado pelo fluxo oficial; asset frontend `index-BZPoi-dR.js` e health HTTP confirmados.

Working tree: limpa; correção do modal publicada em `origin/main` e validada em produção.

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

Título: Melhorias da tela inicial da Área do Sócio

Status: VALIDATED LOCALLY — PENDING RELEASE

Cause: melhorar a leitura da situação financeira e trazer eventos próximos e avisos para a tela inicial, sem exigir navegação adicional.

Files currently modified: `apps/web/src/modules/core/member-area/MemberHome.tsx`, `apps/web/src/modules/core/member-area/badge.css`.

Validated: build completo PASS, testes automatizados relevantes quase todos PASS, primeira carga da foto PASS, cinco ciclos Início → Reservas → Início PASS, Eventos → Início PASS, Avisos → Início PASS e Mais → Início PASS.

Final local validation: titular PASS, dependente PASS, modal/carteirinha PASS, refresh PASS, Reservas após refresh PASS, cinco ciclos PASS, Eventos/Avisos/Mais PASS, build PASS e testes relevantes PASS. A integração de mídia permanece pendente somente por fixture de credenciais locais incompatível.

Production validation: release `59153c2` publicado pelo push oficial; página HTTP 200; `/api/health` HTTP 200 com `status: OK`; asset `index-BZPoi-dR.js`; dependente visualizou “Carteirinhas da família” com Roger Herpich como titular; nenhuma migration pendente; stash preservado.

Navigation validation: shell compartilhado com header persistente, bottom navigation persistente, item ativo por view, suporte a safe-area e remoção do botão redundante de Reservas. Build PASS e validação visual local PASS em viewport mobile.

Pending: publicar as melhorias da tela inicial e validar o resultado em produção; o release anterior continua ativo.

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
- Produção: smoke visual autenticado concluído manualmente: Início → Reservas → Eventos → Avisos → Mais → Início; header, bottom nav, item ativo, cards/fotos, modal de carteirinha e retorno ao Início foram confirmados. Health HTTP independente permanece `UNKNOWN` por bloqueio do proxy/cliente.
- Ajuste visual local: o resumo da reserva deixou de repetir visualmente o nome do espaço; a data passou a aparecer como linha rotulada e o nome continua no título principal.
- Build após o ajuste visual: PASS. Nenhuma alteração em backend, banco ou storage.
- Segundo ajuste visual local: o resumo deixou de ser uma caixa interna e passou a compartilhar o mesmo plano do formulário, separado apenas por uma linha.
- Build após o segundo ajuste: PASS. Nenhuma alteração em backend, banco ou storage.
- Simplificação final local: removido o bloco “Resumo da reserva”, criado o valor simples “Valor da reserva” e transformada a ação “Escolher outro espaço” em link textual com seta.
- Inspeção visual mobile: PASS; header, bottom nav, Reservas ativo, scroll e nova hierarquia visual confirmados. Nenhuma alteração em backend, banco ou storage.
- Fluxo Pix local: tela plana de pagamento adicionada após nova solicitação e também ao botão “Pagar reserva” de reservas aprovadas; inclui chave `sercinse@bol.com.br`, cópia da chave e link WhatsApp com mensagem pré-preenchida.
- O nome do associado é reutilizado do carregamento já feito pela Área do Sócio; nenhuma chamada adicional de identificação foi mantida em Reservas.
- Build completo após o fluxo Pix: PASS (`npm run build`, API TypeScript e Vite).
- API DEV em `3338`: HTTP 200 em `/api/health`; frontend DEV em `5178`.
- Inspeção visual do fluxo Pix ainda não foi concluída porque a automação do navegador expirou ao clicar na navegação; nenhuma reserva de teste foi criada e o WhatsApp não foi aberto.
- Commits locais: `8179c4c` (`feat: add pix reservation payment flow`) e `9095cfd` (`fix: include reservation details in pix message`); push ainda não executado.
- Ajuste solicitado: a mensagem do WhatsApp agora inclui espaço, data formatada e horário da reserva, ou “Dia inteiro” quando aplicável.
- Nenhuma alteração em backend, banco ou storage; produção não foi alterada.
- Banco local: removidos 4 registros de reserva e 5 espaços existentes, após backup, e criados 8 espaços ativos: Quiosque 1–4 (R$ 80), Choupana 1–2 (R$ 120), Salão Principal (R$ 1.000) e Salão de Festas (R$ 700).
- Os novos espaços estão sem capacidade informada e sem fotos, conforme solicitado; todos usam descrição genérica.
- Backup antes da exclusão: `C:\Users\herpich.LOCAL\Projetos\_backup_cisne_db\cisne-local-20261008-reservable-spaces-before-replace.dump`.
- Seed atualizado em `apps/api/prisma/seed.ts` para refletir o novo catálogo e o valor atualizado do Salão Principal.
- Verificação pós-alteração: 8 espaços ativos, 0 reservas e 0 fotos; API DEV `3338` HTTP 200; frontend DEV `5178` HTTP 200; build completo PASS.
- Commit do catálogo: `b1ddc7d` (`feat: replace reservable spaces catalog`).
- Migration de substituição criada para reproduzir a exclusão/criação no deploy oficial; aplicada localmente com sucesso.
- A regeneração do Prisma Client encontrou `EPERM` porque o engine Windows estava em uso pelo processo local; não houve alteração de schema e a validação de dados local permaneceu correta.
- Commit `5b81ba7` publicado em `origin/main`; após aproximadamente 75 segundos, produção passou a servir o asset frontend `index-B57TrqWB.js` correspondente ao build publicado.
- Health HTTP independente e execução da migration em produção permanecem `UNKNOWN`: a sessão autenticada expirou durante a verificação e o cliente bloqueou a abertura direta de `/api/health`.
- Produção não foi alterada.
- A API `/api/member/me` agora monta a família a partir do titular; dependentes recebem o titular e os demais dependentes vinculados, enquanto titulares mantêm a lista de dependentes.
- A autorização de fotos privadas passou a permitir acesso entre titular, dependentes e irmãos do mesmo grupo familiar, sem liberar membros de outras famílias.
- `npm run test:club-modules --workspace @cisne/api`: PASS, incluindo login de dependente e retorno da carteirinha do titular.
- `member-photo.smoke.ts`: bloqueado antes da asserção de família porque o ambiente local não possui `MEDIA_STORAGE_ROOT`; classificado como limitação de fixture/infraestrutura.
- Build completo após a alteração: PASS.
- Commit local: `c4d32cc` (`feat: show family cards to dependent members`).
- Push oficial `b45398d..f8cfc6b` concluído em `origin/main`; auto-deploy concluído.
- Produção HTTP 200; `/api/health` retornou `{"status":"OK"}`.
- Produção serviu `index-UxEdPleQ.js`; dependente visualizou “Carteirinhas da família” com Roger Herpich (Titular) e Róbson Herpich (Irmão).
- Abertura automatizada do modal expirou após a lista familiar estar visível; essa interação permanece `UNKNOWN`.
- Correção local: o modal de dependente agora usa o membro marcado como titular na lista familiar, exibindo “Dependente de [titular]” em vez do dependente logado.
- Build após a correção: PASS; `npm run test:club-modules --workspace @cisne/api`: PASS.
- Push `f8cfc6b..59153c2` concluído em `origin/main`; auto-deploy concluído.
- Produção passou a servir `index-BZPoi-dR.js`; health check HTTP 200 com `{"status":"OK"}`.
- Inspeção visual autenticada confirmou “Carteirinhas da família”, Roger Herpich como Titular e Róbson Herpich como Irmão.
- A situação financeira ganhou cores semânticas: vermelho para `OVERDUE` e verde para `PAID`.
- A home passou a buscar avisos e eventos autenticados e exibir até dois de cada diretamente, com estado vazio e ação “Ver todos”.
- Build após as melhorias da home: PASS; `npm run test:club-modules --workspace @cisne/api`: PASS.
- Inspeção visual local: cards de eventos e avisos confirmados; fixture local tinha 0 eventos próximos e 1 aviso.

## Next Step

Publicar as melhorias da tela inicial pelo processo oficial e confirmar cores, eventos e avisos em produção.
