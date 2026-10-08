# CISNE — Project State

Last updated: 2026-10-08

## Current Git State

Branch: `main`

Base HEAD: `ab7c1cb6a361ea0e648dae8b1b5f0347a70055f3`

Origin: `ab7c1cb6a361ea0e648dae8b1b5f0347a70055f3`

Production functional release: `eac3babace6548c814a85228e76835b20968e921` confirmado visualmente; health HTTP independente permanece `UNKNOWN` nesta sessão.

Working tree: limpa após o commit local `9083014`; push/publicação do fluxo Pix ainda pendentes; simplificação da tela de detalhe publicada em `ab7c1cb`.

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

Título: Fluxo Pix e envio de comprovante para reservas

Status: COMMITTED LOCALLY — PENDING RELEASE

Cause: após solicitar ou pagar uma reserva, o associado precisa receber instruções objetivas para copiar a chave Pix e enviar o comprovante à secretaria.

Files currently modified:

- `apps/web/src/modules/core/member-area/MemberHome.tsx`
- `apps/web/src/modules/core/reservations/ReservationsPage.tsx`
- `apps/web/src/modules/core/reservations/member-reservations.css`

Validated: build completo PASS, testes automatizados relevantes quase todos PASS, primeira carga da foto PASS, cinco ciclos Início → Reservas → Início PASS, Eventos → Início PASS, Avisos → Início PASS e Mais → Início PASS.

Final local validation: titular PASS, dependente PASS, modal/carteirinha PASS, refresh PASS, Reservas após refresh PASS, cinco ciclos PASS, Eventos/Avisos/Mais PASS, build PASS e testes relevantes PASS. A integração de mídia permanece pendente somente por fixture de credenciais locais incompatível.

Production validation: RELEASE_COMMIT `693eb90bfb55020265ff04836a79f38ed66b2ed1`; deploy oficial concluído; titular PASS; Reservas → Início PASS; dependentes/modal PASS; refresh PASS; health PASS; nenhuma migration pendente; stash preservado.

Navigation validation: shell compartilhado com header persistente, bottom navigation persistente, item ativo por view, suporte a safe-area e remoção do botão redundante de Reservas. Build PASS e validação visual local PASS em viewport mobile.

Pending: push deste fluxo, auto-deploy e smoke de produção; produção ainda está no release funcional anterior.

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
- Commit local: `9083014` (`feat: add pix reservation payment flow`); push ainda não executado.
- Ajuste solicitado: a mensagem do WhatsApp agora inclui espaço, data formatada e horário da reserva, ou “Dia inteiro” quando aplicável.
- Nenhuma alteração em backend, banco ou storage; produção não foi alterada.

## Next Step

Revisar/confirmar a tela Pix no navegador com uma reserva existente, depois fazer push e validar o auto-deploy conforme autorização.
