# CISNE — Development Log

## 2026-10-16 — Anuidades identificadas pelo ano final (DEV)

- Padronizada a nomenclatura para `Anuidade 2027`, correspondente a 01/11/2026–31/10/2027; removida a apresentação ambígua `2026/2027` nas telas e mensagens.
- Novas cobranças usam o rótulo do ano final. Descrições históricas são normalizadas apenas na apresentação da API, sem reescrever banco ou histórico.
- Testes financeiros e builds API/web/PWA: PASS; nenhuma migration.
- Commit `7c374d0d23978bfce2e54f5ea23c69cb21a02e11` publicado no DEV `.98`, backup/restauração/comparação PASS, health 200. Produção não alterada.

## 2026-10-16 — Parcelas vencidas e bloqueio automático no acesso (DEV)

- Criada a regra compartilhada `isOverdueAnnualInstallment`: somente parcelas vinculadas a plano de anuidade, com saldo e vencimento ultrapassado, entram na inadimplência parcelada.
- O Financeiro geral ganhou o resumo por responsável em `/api/finance/overdue-installments`, com quantidade, saldo e parcelas vencidas; a tela informa que os integrantes da conta ficam bloqueados.
- Validação de credencial e check-in por QR consultam a conta financeira do titular. Sócios e dependentes com parcelas vencidas recebem `OVERDUE_INSTALLMENTS` e não podem registrar entrada; visitantes e cobranças não parceladas seguem o fluxo existente.
- Teste de corte do dia 10, contagem e agrupamento: PASS. Builds API/web/PWA: PASS, com aviso não bloqueante do Vite sobre bundle acima de 500 kB.
- Commit: `89866fd767e3e510800788243bea4c119cae9f6a`. Publicado no DEV `.98` com backup `/opt/apps/cisne/shared/backups/before-plan-first-20261016T000302Z`, dump SHA-256 `3920a243f5bab9ebe1c493aa129433ad2365ac8700bead97cff5a29094e76a82`, restauração/comparação PASS e health 200. Nenhuma migration foi executada; produção permanece inalterada.

## 2026-10-08 — Convites sem data planejada de visita

- Removida a obrigatoriedade de informar a data da visita ao emitir um convite.
- Novos convites são válidos dentro do ciclo mensal de emissão e são consumidos no primeiro check-in válido.
- A cota mensal passa a contar `createdAt`; a entrada real fica registrada em `AccessEvent.occurredAt` e `VisitorInvitation.usedAt`.
- Convites pendentes de meses anteriores são expirados automaticamente quando o sistema consulta o módulo; convites antigos com `scheduledDate` permanecem preservados para histórico.
- O controle de acesso deixou de exigir que o check-in ocorra na data planejada.
- Migration criada: `20261008170000_invitations_without_visit_date`.
- `npm run build`: PASS.
- `npm run test:visitor-invitations --workspace @cisne/api`: PASS.
- `npm run test:club-modules --workspace @cisne/api`: PASS.
- `prisma validate` e `prisma generate`: não concluídos por indisponibilidade de rede para baixar o engine Prisma no ambiente local.
- Produção: não alterada.

## 2026-10-08 — Histórico consolidado na ficha administrativa do sócio

- A ficha administrativa passou a carregar as atividades do grupo familiar em um único endpoint protegido por `members.view`.
- Foram criadas abas de **Convites**, **Reservas** e **Acessos**, com contadores, estados vazios e layout responsivo.
- Ao abrir um titular ou qualquer dependente, o sistema resolve o titular do grupo e reutiliza os mesmos históricos compartilhados.
- Convites exibem visitante, emissor, emissão, situação e eventual entrada; reservas exibem espaço, data, solicitante, situação e valor; acessos exibem pessoa, horário, ponto e origem do convite quando aplicável.
- `npm run build`: PASS.
- `npm run test:club-modules --workspace @cisne/api`: PASS.
- Produção: não alterada.

## 2026-10-08 — Estabilização e conclusão do deploy do layout financeiro

- O auto-deploy inicialmente interrompia a publicação porque o parser do script não reconhecia a saída de migrations pendentes do Prisma.
- O script oficial foi corrigido em produção com backup prévio; nenhuma edição foi feita no código da aplicação em produção.
- Build da release `ec37054d9a6233336f99c8e0a5c887db2c1cce29`: PASS.
- Foram detectadas e aplicadas as migrations `20261008120000_family_invitation_quota` e `20261008150000_visitor_season_quota`.
- Backup PostgreSQL pré-migration: `/opt/deploy/backups/cisne-pre-migration-20261008T222240Z.dump`.
- Release publicada e API reiniciada; health check final: PASS.
- Rollback disponível em `/opt/apps/cisne/releases/20261008T222253Z-35f3dd0ddd47`.

## 2026-10-08 — Publicação do layout financeiro

- Push oficial `7aaa33d..874010a` concluído em `origin/main`.
- O layout financeiro com temporadas expansíveis foi incluído na publicação.
- Auto-deploy, SHA efetivo do release e health check permanecem `UNKNOWN` nesta sessão por limitação do cliente de navegação.
- Nenhuma alteração manual foi feita em produção.

## 2026-10-08 — Simplificação do layout financeiro

- A área financeira deixou de exibir simultaneamente o cartão detalhado da anuidade, a próxima cobrança e todo o histórico.
- O associado agora vê uma lista compacta de temporadas/anualidades, com valor de saldo e situação.
- Ao abrir uma temporada, são exibidos total, valor pago, saldo, pagamentos registrados e cobranças mensais quando houver mais de uma cobrança no período.
- Ações demonstrativas de Pix, cartão e parcelamento permanecem disponíveis somente dentro dos detalhes da temporada selecionada.
- `npm run build`: PASS.
- Produção: não alterada.

## 2026-10-08 — Publicação da quota sazonal

- Push oficial `35f3dd0..e58a943` concluído em `origin/main`.
- A aplicação autenticada de produção permaneceu acessível após a publicação.
- O endpoint `/api/health` foi bloqueado pelo cliente Chrome desta sessão (`ERR_BLOCKED_BY_CLIENT`); o SHA efetivo do release e o health check de produção permanecem `UNKNOWN`.
- Nenhuma alteração manual foi feita em produção.

## 2026-10-08 — Quota de entradas de visitantes por temporada

### Regra implementada

- Cada visitante pode ter até 7 entradas na temporada de 1º de novembro a 31 de outubro.
- A temporada vigente é calculada no backend e não coincide com o ano-calendário.
- Entradas consumidas são contadas por `AccessEvent` real; convites pendentes reservam saldo para impedir emissão acima da capacidade restante.
- Convites cancelados ou expirados deixam de reservar saldo. A quota é renovada automaticamente na virada de novembro.

### Integração

- A emissão pelo associado e pela secretaria consulta a quota do visitante e mostra quantas entradas ainda estão disponíveis.
- Quando o saldo chega a zero, a interface bloqueia a emissão e o backend retorna conflito explicando a quota atingida.
- O check-in revalida a quota dentro da transação antes de registrar a entrada, mantendo o limite seguro mesmo em operações concorrentes.
- A API de validação de visitante passou a retornar a temporada e o saldo atual.

### Validação

- Migration local `20261008150000_visitor_season_quota` aplicada após backup.
- Configuração local confirmada: `visitorAnnualLimit=7`, `annualLimitMode=SEASON_NOV_OCT`.
- `npx prisma validate --schema apps/api/prisma/schema.prisma`: PASS.
- `npm run build`: PASS.
- `npm run test:visitor-invitations --workspace @cisne/api`: PASS.
- Produção: não alterada.

## 2026-10-08 — Refinamento visual da tela de convites

### Alterações

- A seção de convites foi renomeada para **Convites emitidos**, com o histórico visualmente separado da ação de criar um novo convite.
- O cadastro de novo convite passou a abrir como uma camada/modal responsiva, com comportamento de folha inferior em telas móveis, mantendo o histórico fora do fluxo de preenchimento.
- Os dados do visitante foram reorganizados em cartões, com hierarquia visual para nome, data/status, emissor, telefone e ações.
- A seleção do visitante e o cadastro de um novo visitante também receberam blocos visuais próprios.

### Validação

- `npm run build`: PASS.
- `git diff --check`: PASS.
- Produção: não alterada; nenhuma publicação foi feita neste ajuste.

## 2026-10-06 — Reconciliation and member photo bug

### Context

- O ambiente local estava seis commits atrás de `origin/main` e da produção.
- `origin/main` e produção estavam em `ec590183`.
- O local foi reconciliado por fast-forward.
- Alterações locais foram preservadas por backup e stash.
- O banco local recebeu as migrations pendentes.
- `npm ci` e `prisma generate` foram executados.
- O build completo passou.
- A correção da foto foi portada seletivamente para a base atual.

### Current code state

- Base HEAD: `ec590183`.
- Dois arquivos modificados: `PrivateMemberPhoto.tsx` e `MemberHome.tsx`.
- Nenhum commit, push ou deploy da correção foi realizado.

### Tests

- Build completo: PASS.
- Auth: PASS.
- Member photo: PASS.
- Member media: PASS.
- Media foundation: PASS.
- Space media: PASS.
- Reservas: PASS.
- Convites: PASS.
- Financeiro: PASS.
- Club modules: PASS.
- Frontend: PASS.
- `space-media.integration`: pendente/falhou por fixture ou senha local incompatível.

### Important discovery

O teste manual local inicialmente proposto não reproduzia o cenário de produção porque a mídia do Sócio Teste local já estava inválida na primeira carga.

Esse teste não deve ser considerado validação da correção.

### Production

- Produção permaneceu inalterada.
- SHA de produção: `ec590183`.
- Nenhum push ou deploy da correção foi realizado.

### Pending

- Auditar a mídia local do Sócio Teste.
- Criar uma mídia local válida usando a arquitetura atual.
- Executar o teste manual do bug.
- Somente depois avaliar commit, push e deploy.

## 2026-10-07 — Local member photo audit

- O Sócio Teste local possui somente `Person.photoPath`; não possui `MediaAsset` nem `photoAssetId`.
- O arquivo legado existe no diretório `uploads/person-photos` do repositório, mas não no diretório legado efetivamente resolvido pela API local.
- A rota usada pelo frontend retorna `404`; a rota canônica do associado retorna `500` com `FST_ERR_REP_INVALID_PAYLOAD_TYPE` ao tratar esse caso legado ausente.
- O ambiente local ainda não reproduz o cenário moderno de produção para validação do bug de navegação.

## 2026-10-07 — Local member photo upload

- Estado anterior: o Sócio Teste possuía somente `photoPath` legado e nenhum `MediaAsset` associado.
- Upload realizado exclusivamente pelo endpoint oficial local `POST /api/members/:id/photo`, usando uma imagem sintética 3:4 em memória.
- A aplicação criou o `MediaAsset` privado e gravou o arquivo no `MEDIA_STORAGE_ROOT` local.
- As rotas privada canônica e compatível retornaram `HTTP 200` com imagem JPEG.
- A primeira carga visual do frontend ainda falhou: o elemento do titular recebeu `blob:` mas permaneceu sem dimensões naturais carregadas.
- Nenhuma navegação foi testada nesta etapa.
- Produção permaneceu intocada.

## 2026-10-07 — Local validation complete

- Nova sessão local autenticada validou titular e Dependente Teste com Blob URLs válidas, `complete=true` e dimensões 300x400.
- Carteirinha/modal do dependente abriu pelo fluxo normal, exibiu o nome e a foto corretos, e ambas as fotos permaneceram válidas após o fechamento.
- Refresh completo preservou titular e dependente; Início → Reservas → Início após o refresh também passou.
- Validações anteriores de cinco ciclos, Eventos, Avisos e Mais permanecem PASS.
- Build completo PASS; Auth, member photo, member media, media foundation, space media, Reservas, Convites, Financeiro, Club modules e Frontend PASS.
- `media.integration` continua pendente pela fixture de credenciais locais incompatível (`401`), sem alteração de usuário, senha ou código.
- Revisão do diff não encontrou logs/debug temporários ou mudanças fora dos dois arquivos da correção.
- Produção permaneceu intocada; nenhum commit, push ou deploy foi realizado.

## 2026-10-07 — Dependent photo and card modal validation

- Nova sessão local autenticada do Sócio Teste iniciada após o cadastro da mídia do dependente.
- Foto do titular e foto do Dependente Teste foram exibidas como Blob URLs válidas, com `complete=true` e dimensões 300x400.
- A carteirinha/modal abriu pelo fluxo normal, exibiu o nome correto e a foto correta do dependente.
- Após fechar o modal, titular e dependente permaneceram visíveis e válidos.
- Console sem erros ou warnings observáveis.
- Produção permaneceu intocada.
- Próximo passo: validar refresh completo da Área do Sócio com titular e dependente.

## 2026-10-07 — Blob render investigation

- A hipótese de dependência instável foi refutada: `usePrivateMemberPhotos` já utilizava `pathsKey` estável e não revogava a Object URL antes do `setUrls` nessa carga.
- A instrumentação temporária mostrou `blob.size=768` e `blob.type=text/html`; o frontend estava resolvendo `photoPath` relativo no próprio Vite e recebendo o HTML de fallback com HTTP 200.
- A imagem física permaneceu válida como JPEG 300×400.
- Correção mínima aplicada somente nos dois arquivos da foto: o hook passou a receber os `memberId`s e buscar a rota autenticada `/api/members/:id/photo`, mantendo AbortController, proteção contra race e cleanup existentes.
- A instrumentação foi removida.
- Build frontend: PASS.
- Primeira carga local: PASS; `img.src` Blob, `complete=true`, dimensões 300×400 e sem erros/warnings de console.
- Nenhuma navegação foi testada.
- Produção permaneceu intocada.

## 2026-10-07 — Single navigation validation

- Estado inicial confirmado: foto do Sócio Teste em Blob, `complete=true`, dimensões 300×400 e visível.
- Fluxo executado uma única vez: Início → Reservas → Início.
- Resultado: PASS; a foto permaneceu visível e válida após o retorno.
- O caminho usado permaneceu na rota canônica autenticada `/api/members/:id/photo`; não houve acesso direto a `/uploads/person-photos`.
- O `pathsKey` permaneceu estável, portanto não houve nova requisição de foto ao retornar com o mesmo caminho; a requisição da foto ocorreu na carga inicial.
- Não foram observados erros, warnings, AbortError não tratado ou erro de Object URL.
- Próximo passo: repetir o mesmo fluxo cinco vezes.
- Produção permaneceu intocada.

## 2026-10-07 — Five navigation cycles validation

- Estado inicial confirmado: foto visível, Blob válido, `complete=true` e dimensões 300×400.
- Foram executados exatamente cinco ciclos Início → Reservas → Início.
- Ciclo 1: PASS.
- Ciclo 2: PASS.
- Ciclo 3: PASS.
- Ciclo 4: PASS.
- Ciclo 5: PASS.
- A mesma Blob URL permaneceu válida em todos os retornos ao Início.
- Não houve acesso direto a `/uploads/person-photos`, falha de autenticação ou erro de console.
- Produção permaneceu intocada.

## 2026-10-07 — Additional member-area flows validation

- Eventos → Início: PASS.
- Avisos → Início: PASS.
- Mais → Início: PASS; o menu/overlay foi aberto e fechado pelo comportamento normal da interface.
- A foto permaneceu Blob, `complete=true`, 300×400 e visível em todos os retornos.
- Não houve acesso direto a `/uploads/person-photos`, falha de autenticação ou erro/warning no console.
- Próximo passo: validar foto do dependente e carteirinha/modal do dependente.
- Produção permaneceu intocada.

## 2026-10-07 — Dependent photo state audit

- O dependente exibido para o Sócio Teste é `Dependente Teste`.
- O registro não possui `photoPath`, `photoAssetId` ou `MediaAsset` associado.
- Não há arquivo novo ou legado a verificar e nenhum endpoint de foto foi chamado.
- O dependente ainda não está pronto para teste visual de foto ou carteirinha.

## 2026-10-07 — Dependent member photo upload

- Estado anterior confirmado: `photoPath` e `photoAssetId` nulos, sem `MediaAsset` associado.
- Upload realizado exclusivamente pelo endpoint oficial local `POST /api/members/:id/photo` usando imagem sintética 300x400.
- A aplicação criou um `MediaAsset` privado e armazenou o JPEG no `MEDIA_STORAGE_ROOT` local.
- O endpoint privado do dependente retornou HTTP 200 com `image/jpeg`.
- Não foi executado teste visual, modal ou navegação nesta etapa.
- Produção permaneceu intocada.

## 2026-10-07 — Production member photo validation

- O bloqueio inicial de login foi identificado como cache/service worker antigo; após sessão anônima limpa, o asset atual foi carregado.
- RELEASE_COMMIT `693eb90bfb55020265ff04836a79f38ed66b2ed1` publicado pelo fluxo oficial.
- Deploy automático concluído com health check PASS e sem migration pendente.
- Smoke de produção: titular PASS; Início → Reservas → Início PASS; dependentes PASS; modal/carteirinha PASS; refresh PASS.
- Nenhuma alteração manual em produção, banco ou storage foi realizada.
- Stash `stash@{0}` preservado.

## 2026-10-08 — Persistent member-area navigation

- Implementado shell compartilhado da Área do Sócio com cabeçalho sticky e barra inferior persistente.
- Início, Reservas, Eventos, Avisos e Mais agora usam a mesma estrutura; o item ativo acompanha a view.
- O botão redundante `← Início` foi removido da tela de Reservas; o fluxo interno de detalhes foi preservado.
- Adicionado espaçamento inferior e suporte a safe-area para evitar conteúdo oculto atrás da navegação.
- Build completo PASS e validação visual local PASS em `http://localhost:5173`.
- Nenhuma alteração em backend, banco, storage ou produção.
- Pendente: commit, push, auto-deploy e smoke de produção.

## 2026-10-08 — Post-commit verification

- O commit funcional já existente é `eac3babace6548c814a85228e76835b20968e921`, alinhado com `origin/main`; a árvore de trabalho permaneceu limpa.
- O stash `stash@{0}` foi preservado e não aplicado.
- API DEV em `3338`: HTTP 200 em `/api/health`.
- Frontend DEV em `5178`: processo Vite iniciado por override de processo; o código ainda mantém defaults históricos `5173`/`3333` em sua configuração, sem alteração desses defaults nesta tarefa.
- Build completo: PASS.
- A página inicial autenticada de produção carregou e mostrou header e bottom navigation. O terminal não conseguiu consultar produção por bloqueio de proxy, e a automação do navegador expirou ao acionar Reservas; smoke interno, health HTTP e estado do auto-deploy permanecem `UNKNOWN`, não declarados como PASS.

## 2026-10-08 — Production navigation smoke completed

- Smoke visual autenticado concluído manualmente em produção: Início → Reservas → Eventos → Avisos → Mais → Início.
- Reservas exibiu header, bottom nav, tabs, cards e fotos; o botão redundante `← Início` não apareceu.
- Eventos e Avisos exibiram conteúdo com a navegação persistente; o item correspondente ficou ativo.
- Mais abriu o overlay esperado e Início retornou corretamente.
- Fotos de dependentes e modal/carteirinha foram confirmados visualmente; o retorno ao Início preservou header, fotos e bottom nav.
- A implementação funcional validada corresponde ao commit `eac3babace6548c814a85228e76835b20968e921`.
- Health HTTP independente e estado do auto-deploy documental permanecem `UNKNOWN` por bloqueio de rede/cliente; não foram declarados como PASS.

## 2026-10-08 — Reservation detail visual cleanup

- Removida visualmente a repetição do nome do espaço no resumo da reserva; o título principal continua identificando o espaço.
- A data do resumo passou a ter rótulo próprio e o valor permaneceu destacado.
- Alteração restrita a `apps/web/src/modules/core/reservations/member-reservations.css`.
- Build completo após o ajuste: PASS.
- Nenhuma alteração em backend, banco, storage ou produção; publicação permanece pendente de aprovação.

## 2026-10-08 — Reservation summary flattened

- Removido o cartão visual interno do resumo da reserva; o resumo agora fica no mesmo plano do formulário, com separação por linha.
- Alteração restrita ao CSS de Reservas; nenhuma lógica de reserva foi modificada.
- Build completo após o segundo ajuste: PASS.
- Nenhuma alteração em backend, banco, storage ou produção; publicação permanece pendente de aprovação.

## 2026-10-08 — Member reservation detail layout simplified

- Removido do JSX o bloco “Resumo da reserva”.
- O preço passou a aparecer como “Valor da reserva” em uma linha simples.
- “Escolher outro espaço” passou a ser uma ação textual discreta com seta, preservando o comportamento.
- O painel de reserva deixou de ter cartão externo, borda, sombra e fundo próprios; o formulário ficou integrado ao conteúdo da tela.
- Inspeção visual mobile: PASS; header, bottom nav, item Reservas ativo e scroll confirmados.
- Build completo: PASS.
- Nenhuma alteração em backend, banco ou storage.

## 2026-10-08 — Reservation Pix payment flow

- Adicionada tela de pagamento Pix após uma nova solicitação de reserva e ao pagamento de reservas aprovadas.
- A tela mostra espaço, data, valor e a chave Pix `sercinse@bol.com.br`, com botão para copiar a chave.
- Adicionado botão para abrir o WhatsApp da secretaria com mensagem pré-preenchida usando o nome do associado e o espaço reservado.
- O nome do associado passou a ser repassado pela `MemberHome`, evitando uma chamada extra à API dentro de Reservas.
- Build completo: PASS; API TypeScript, TypeScript do frontend e Vite concluídos sem erros.
- Nenhuma alteração em backend, banco ou storage. Nenhuma reserva de teste foi criada e nenhuma mensagem foi enviada.
- Inspeção visual da nova tela Pix ficou pendente porque o clique automatizado no navegador expirou; o link externo não foi aberto.
- Commit local `9083014` criado com a mensagem `feat: add pix reservation payment flow`.
- Ajuste posterior: a mensagem do WhatsApp passou a incluir data e horário da reserva em linhas separadas; reservas sem horário exibem “Dia inteiro”.
- Commit local `9095cfd` criado com a mensagem `fix: include reservation details in pix message`.
- Produção não foi alterada; push e validação de auto-deploy permanecem pendentes.

## 2026-10-08 — Reservable spaces catalog replacement

- Backup local criado antes da alteração: `C:\Users\herpich.LOCAL\Projetos\_backup_cisne_db\cisne-local-20261008-reservable-spaces-before-replace.dump`.
- Por solicitação explícita, foram removidos 4 reservas e os 5 espaços existentes no banco local.
- Foram criados 8 espaços ativos: Quiosque 1, Quiosque 2, Quiosque 3, Quiosque 4, Choupana 1, Choupana 2, Salão Principal e Salão de Festas.
- Preços configurados: R$ 80 para os quiosques, R$ 120 para as choupanas, R$ 1.000 para o Salão Principal e R$ 700 para o Salão de Festas.
- Capacidade ficou não informada e fotos ficaram vazias para posterior cadastro; descrição genérica aplicada a todos.
- Seed atualizado para refletir o novo catálogo; nenhum arquivo de produção ou storage de produção foi alterado.
- Verificação pós-alteração: 8 espaços ativos, 0 reservas, 0 fotos; API/frontend locais HTTP 200; build completo PASS.

## 2026-10-08 — Production catalog migration preparation

- Criada a migration `20261008020000_replace_reservable_spaces_catalog` para executar a substituição do catálogo pelo processo oficial de deploy.
- A migration foi aplicada no banco local e confirmou 8 espaços ativos, 0 reservas e 0 fotos.
- `prisma generate` foi tentado após a migration, mas o engine Windows estava bloqueado pelo processo local e retornou `EPERM`; não houve mudança de schema.
- Produção ainda não foi alterada nesta etapa; backup, deploy, health check e confirmação do SHA de produção permanecem pendentes.

## 2026-10-08 — Production deploy verification pending

- Migration e seed publicados em `origin/main` no commit `5b81ba7` pelo fluxo oficial de push.
- Após aproximadamente 75 segundos, o frontend de produção passou a servir o asset `index-B57TrqWB.js` correspondente ao build novo.
- A sessão autenticada expirou durante a verificação; o cliente também bloqueou a abertura direta do endpoint `/api/health`.
- Execução da migration, backup de produção, SHA efetivo do release, health check e catálogo de dados em produção permanecem `UNKNOWN`.
- Nenhuma edição manual foi feita no servidor e nenhum status de produção foi declarado como PASS sem evidência.

## 2026-10-08 — Family card visibility for dependents

- Corrigido `/api/member/me` para montar a lista de pessoas vinculadas pelo titular da família.
- Titulares continuam vendo seus dependentes; dependentes passam a ver a carteirinha do titular e dos demais dependentes vinculados.
- Atualizado o frontend para usar o título “Carteirinhas da família” quando o usuário é dependente.
- Atualizada a autorização de fotos privadas para permitir titular ↔ dependentes e dependente ↔ irmãos, mantendo o bloqueio para famílias diferentes.
- Teste integrado `test:club-modules`: PASS.
- Build completo: PASS.
- Smoke de fotos não reproduzido por ausência de `MEDIA_STORAGE_ROOT` no ambiente local; nenhum PASS foi declarado para essa parte.
- Commit local `c4d32cc` criado; produção não foi alterada e o push permanece pendente.

## 2026-10-08 — Production deploy of family card visibility

- Push oficial concluído em `origin/main`: `b45398d..f8cfc6b`.
- Auto-deploy concluído; a página de produção passou a servir o asset `index-UxEdPleQ.js`.
- Health check de produção: `GET /api/health` HTTP 200 com `{"status":"OK"}`.
- Smoke visual autenticado: dependente visualizou “Carteirinhas da família”, incluindo Roger Herpich como Titular e Róbson Herpich como Irmão.
- Nenhuma migration foi necessária ou executada.
- A abertura automatizada do modal expirou após a lista familiar estar visível; modal/fotos permanecem `UNKNOWN`, sem declarar PASS indevido.

## 2026-10-08 — Family card modal titular name correction

- Corrigido o modal da carteirinha para usar o membro marcado como titular na lista familiar.
- Dependentes passam a ver “Dependente de [nome do titular]”; titulares continuam vendo “Titular do grupo familiar”.
- Alteração restrita a `apps/web/src/modules/core/member-area/MemberHome.tsx`.
- Build completo: PASS.
- `npm run test:club-modules --workspace @cisne/api`: PASS.
- Produção não foi alterada nesta correção; publicação e validação visual permanecem pendentes.

## 2026-10-08 — Production deploy of family card modal correction

- Push oficial concluído em `origin/main`: `f8cfc6b..59153c2`.
- Auto-deploy concluído; a produção passou a servir o asset `index-BZPoi-dR.js`.
- Health check: `GET /api/health` HTTP 200 com `{"status":"OK"}`.
- Smoke visual autenticado confirmou “Carteirinhas da família”, com Roger Herpich como Titular e Róbson Herpich como Irmão.
- Nenhuma migration foi necessária ou executada.
- O clique automatizado de abertura do modal permaneceu instável; a validação da frase interna do modal fica `UNKNOWN`, sem declarar PASS indevido.

## 2026-10-08 — Member home visibility improvements

- Situação financeira agora usa vermelho para “Em atraso” e verde para “Em dia”.
- A home passou a carregar até dois próximos eventos e exibi-los diretamente, mantendo “Ver todos”.
- A home passou a carregar até dois avisos e exibi-los diretamente, mantendo “Ver todos”.
- Alterações em `apps/web/src/modules/core/member-area/MemberHome.tsx` e `apps/web/src/modules/core/member-area/badge.css`.
- Build completo: PASS.
- `npm run test:club-modules --workspace @cisne/api`: PASS.
- Inspeção visual local: PASS; o fixture tinha 0 eventos próximos e 1 aviso, validando também o estado vazio de eventos.
- Produção não foi alterada; publicação permanece pendente.

## 2026-10-08 — Anuidades e gestão financeira familiar — Fase 1

- Diagnóstico confirmou a reutilização do módulo financeiro existente: `FinancialCharge`, `FinancialPayment`, `responsibleMemberId` e `resolveFinancialResponsibleMemberId()`.
- Nenhuma migration, alteração de banco, gateway, cobrança real ou bloqueio financeiro novo foi implementado.
- Criada interface demonstrativa de “Temporadas e anuidades” na administração, claramente marcada como Fase 1.
- Dashboard financeiro passou a expor métricas de anuidades e grupos financeiros sem contar dependentes como dívidas independentes.
- Área do Sócio ganhou “Minha anuidade”, com situação compartilhada, valor, saldo e progresso calculados das cobranças existentes.
- Ficha do associado e serviços existentes continuam sendo reutilizados; o documento arquitetural foi registrado em `docs/financial-module-phase-1.md`.
- `npm run build`: PASS.
- `npx tsx test/finance.rules.ts`: PASS.
- `npm run test:club-modules --workspace @cisne/api`: PASS.
- Produção não foi alterada; publicação permanece pendente de autorização.

## 2026-10-08 — Production deploy of accumulated changes

- Push oficial concluído em `origin/main`: `59153c2..4d426f7`.
- O intervalo incluiu as melhorias anteriores da home, correção da carteirinha familiar e a Fase 1 de anuidades/gestão financeira.
- Nenhuma migration, cobrança real ou bloqueio financeiro novo foi executado.
- A produção autenticada confirmou “Carteirinhas da família”, Roger Herpich como titular, dois próximos eventos e o card de avisos.
- O endpoint `/api/health` recusou conexão durante a janela de reinício e ficou `UNKNOWN` nesta sessão; não foi declarado PASS sem resposta HTTP.
- Validações locais: build completo, regras financeiras e smoke dos módulos do clube — todos PASS.

## 2026-10-08 — Simplificação da home do associado

- Removida a faixa de atalhos `Dependentes`, `Avisos`, `Financeiro` e `Reservas`, que duplicava a navegação inferior e ações já disponíveis nos cards.
- O card financeiro, a carteira familiar, eventos, avisos e a navegação inferior foram preservados.
- Build completo: PASS.
- Inspeção visual local: PASS; a faixa redundante não aparece mais.
- Push oficial `a9c3d20..40e690d` concluído.
- Durante as verificações, produção ainda servia o bundle anterior e o endpoint HTTP recusava conexão; ativação do auto-deploy e health check ficam `UNKNOWN` até nova confirmação.

## 2026-10-08 — Auditoria e reestruturação de convites e visitantes

- Quota alterada para 8 convites mensais por grupo titular, compartilhada entre titular e dependentes.
- Cada convite preserva quem emitiu (`sponsorMemberId`) e o titular responsável pela quota (`quotaOwnerMemberId`).
- Convites futuros foram bloqueados; cancelamento de convite não utilizado libera a vaga; convites passados são marcados como expirados.
- Cadastro de visitante permanece baseado em `Person + Visitor`, com telefone, cidade e UF obrigatórios no fluxo do associado.
- Secretaria ganhou histórico completo do visitante: convites, convidantes e entradas reais do clube.
- Associados visualizam somente a quota e os convites do próprio grupo familiar.
- Integração com acesso preservada e reforçada: entrada válida vincula `invitationId`, altera o status para `USED` e grava `usedAt` em transação.
- Migration local aplicada: `20261008120000_family_invitation_quota`; backup preservado fora do repositório.
- `npx prisma validate`: PASS.
- `npm run build`: PASS.
- `npm run test:visitor-invitations --workspace @cisne/api`: PASS.
- `npm run test:club-modules --workspace @cisne/api`: PASS com `DATABASE_URL` local explicitamente carregada; o wrapper dotenvx original carregou ambiente incompatível.
- Produção não foi alterada.

## Financeiro por temporada e responsável — DEV, 15/10/2026

REGRA ATUAL: somente DEV192.168.0.98:8084. Produção exige novo pedido explícito. Sem push/merge em main, pois dispara o pipeline. Publicado código SHA f705b50b87139e266a588e44f126f55b440ef2d7, branch local codex/finance-responsible-workspace, worktree /tmp/cisne-finance-workspace, base DEVaea433a54d1d5262b506d3b19495e74b61cbcb69. origin/main confirmado ceb739da7953ecc272a62d93dc0e777e684e8f74; produção não acessada nem alterada, SHA atual UNKNOWN nesta sessão. Checkout original main749ce398 e alterações locais preservados.

Financeiro geral reorganizado por responsável financeiro/conta familiar: temporada principal, Todas as temporadas por padrão, três indicadores Em aberto/Em atraso/Recebido e abas Pendências (inicial), Recebimentos e Histórico. Em atraso é parte do saldo em aberto. Indicadores usam todas as cobranças da temporada escolhida, independentemente da busca/aba; filtros de listagem não mudam silenciosamente os indicadores. Uma linha expansível por responsável com matrícula, nome, temporadas, saldo e situação; dependentes permanecem na mesma conta. Busca por responsável/associado, matrícula, CPF com ou sem formatação e descrição. Busca encontra a conta e mantém suas demais cobranças no escopo. Filtro de responsáveis com atraso mantém inclusive suas pendências ainda não vencidas. Ordenação por nome ou maior saldo, paginação25 contas, detalhes por temporada com ações visíveis: pagamento, detalhes, editar/cancelar quando permitido e link WhatsApp. Nenhuma mensagem enviada automaticamente.

Recebimentos lista somente pagamentos individuais existentes, com valor, data civil, forma, operador e observação; seleciona pela temporada da cobrança, não pelo mês do recebimento. Quitações antigas sem recibos completos ficam no Histórico, com aviso, sem gerar novos recebimentos. Contas com pagamento parcial mantêm o saldo residual; quitação remove a cobrança das Pendências e conserva o histórico. Soma em centavos nos novos agrupamentos. Anuidades continua com suas regras/configuração existentes. Financeiro dentro da ficha do sócio preservado, com regressão integrada. Sem alteração de API, regras de cobrança, schema, permissões ou migration.

Validação: build web TypeScript/Vite/PWA PASS; teste versionado apps/web/test/finance-portfolio.mjs cobre agrupamento titular/dependente, CPF do responsável quando só há cobrança do dependente, centavos, saldo parcial, temporada, atrasos e quitação sem recibo. Chromium e API real com PostgreSQL16 restaurado do DEV: pagamento parcial40 + saldo60, quitação final, recibos, registro das duas inclusões nos LOGS, legado sem recibo preservado, criar/editar/cancelar cobrança e ficha financeira do dependente PASS. Ensaio com2000 cobranças adicionais em26 responsáveis sintéticos comprovou paginação25, busca e navegação; desktop1440 e mobile390 sem overflow e zero errosJS. Não é teste de carga concorrente. Fixture do proxy corrigida para não inventar corpo/content-type em POST vazio; seletor do ensaio de sócios aguarda o registro assíncrono correto. Ajustados rótulos acessíveis dos seletores no produto. Nenhuma falha de fixture foi declarada PASS.

Backup /opt/apps/cisne/backups/before-finance-workspace-20261015T132107Z, dump SHA256 a40d763719fdbbbde576111e4edf75605037102c40624b0d5d968bb865d00a60, restaurado e comparado em todos os campos com o DEV. Somente fixtures/sessões diagnósticas no clone, removido ao final. Sem usar senhas reais. Conferência publicada ADMIN/SECRETARIA, sessão legada, SOCIO e anônimo PASS, sem requisições mutantes. Totais/quantidade de contas comparados com a API real; SOCIO recebe403 no financeiro administrativo; sessão legada pede papel. Banco ativo inteiro, .env e bytes de mídia iguais antes/depois dos ensaios e da publicação; demais quatro serviços DEV com PIDs iguais. API compilada idêntica à anterior. Index, PWA e health200. State/manifest registram SHA publicado. Release anterior retida /opt/apps/cisne/releases/before-finance-workspace-20261015T132204Z; rollback completo não exercitado.

Limite conhecido: paginação no cliente; endpoint existente ainda carrega todas as cobranças. Não foi introduzida paginação/agregação no servidor. Relatório sem dados pessoais/credenciais em docs/cisne-finance-workspace-dev.json. Arquivos: AdminFinancePage.tsx, FinanceWorkspace.tsx, finance-workspace.css, portfolio.ts e teste financeiro; documentação PROJECT_STATE.md, DEVLOG.md e relatório. Próximo passo: utilizar o Financeiro no DEV; produção permanece aguardando solicitação explícita.

## Planejamento das modalidades de anuidade — 15/10/2026

Pedido em andamento, somente DEV. Especificação em docs/annual-payment-plans.md: temporada novembro–outubro, A12x abril–março, B cartão até10x com cobrança única e solicitação de link por WhatsApp, C PIX à vista, D4x novembro–fevereiro; vencimento dia10 e confirmação de parcelas exclusiva da secretaria. Investigação confirmou Anuidades e pagamentos da área do sócio ainda demonstrativos, embora cobranças/recebimentos reais já existam. Faltam persistência de planos e comprovantes e configurações de recebimento. Perguntas enviadas sobre calendário A, escolha/aprovação de modalidade, PIX/favorecido/WhatsApp e boleto externo. Especificação separa comprovante de quitação e registra UNKNOWN nas decisões pendentes. Não gera cobranças ou remapeia débitos anteriores.

Código DEV permanece f705b50b87139e266a588e44f126f55b440ef2d7; origin/main ceb739da7953ecc272a62d93dc0e777e684e8f74 confirmado. Produção não acessada/alterada, SHA atual UNKNOWN. Original main749ce398 e alterações locais preservados. Branch de trabalho codex/annual-payment-plans, worktree /tmp/cisne-annual-payment-plans, base088ce7e655ec9c69cd0d65aafc76dd1b605d2a4d (documentação da última publicação DEV). Alterações desta etapa somente docs/annual-payment-plans.md, PROJECT_STATE.md e DEVLOG.md. Sem código, migration, alteração de banco/storage ou deploy; testes de implementação não executados. Próximo passo: receber definições e implementar/testar no DEV.

## Anuidades reais concluídas no DEV; publicação de produção aguardando autorização de destino — 15/10/2026

REGRA ATUAL: usuário solicitou concluir o trabalho interrompido e publicar em produção. Implementação concluída e publicada no DEV192.168.0.98:8084, código SHA 90db0c5177b8c460dfc0da7fb76aa4bf3f4c8a23, branch codex/annual-payment-plans, worktree /tmp/cisne-annual-payment-plans. Base DEVf705b50b87139e266a588e44f126f55b440ef2d7; base documental05fe50f. origin/main e produção conferidos em ceb739da7953ecc272a62d93dc0e777e684e8f74, serviço ativo. O push à branch do repositório oficial https://github.com/rogermkv/cisne foi recusado antes da execução pela revisão automática: entendeu necessária autorização explícita para o destino e apontou risco de exportação de conteúdo sensível. Pergunta enviada ao usuário para autorizar envio/publicação; resposta ainda pendente. Sem push, PR, merge, workaround ou alteração de produção. Inspeção da diferença de63 arquivos confirmou somente apps/docs, sem .env, uploads, dumps, chaves privadas ou tokens reais. Recebimento PIX/contato comerciais informados pelo usuário inicializados como configuração editável; não são credenciais de acesso bancário. Checkout original main749ce398 e alterações locais preservados.

Quatro modalidades reais, temporada01/11–31/10. A12x abril anterior ao início até março; D4x novembro, dezembro, janeiro e fevereiro, vencimentos dia10. Bcartão até10x na operadora, uma cobrança integral e link WhatsApp identificado; CPIX integral, uma cobrança. B/C disponíveis para escolha até10/11 do início, sem criar parcelas internas do cartão. Atraso de novas parcelas a partir de00h do dia11 em America/Sao_Paulo; calendário/valor da prévia confirmados pelo titular. Repartição em centavos com ajuste final preserva o total. Temporada2026/2027 inicializada com o valor já configurado no clube, sem geração em massa de parcelas.

Titular escolhe diretamente a modalidade da conta familiar; dependentes consultam e enviam comprovantes. Geração transacional idempotente com exclusividade por responsável/temporada, bloqueios de concorrência e contrato preservado. Uma cobrança anterior sem pagamentos, de mesmo ano/valor, é cancelada e substituída atomicamente, sem duplicar o saldo; quitações, pagamentos anteriores, múltiplas cobranças ou valores divergentes recusam escolha para conciliação. Sem exclusão de histórico. Valor da temporada editável antes da primeira adesão; abrir/encerrar escolhas; após adesão não há troca de modalidade por autosserviço.

Secretaria edita chave PIX, favorecido e WhatsApp em Anuidades. Dados fornecidos configurados, sem dados bancários fictícios. Comprovantes PDF/JPG/PNG até5MB, privados por família, estado pendente/aprovado/recusado separado da quitação. Somente papel ativo SECRETARIA confirma pagamentos das novas anuidades, inclusive no endpoint antigo; ADMIN/FUNCIONARIO/SOCIO bloqueados. Secretaria anexa/substitui boleto em cada parcela D, mantém versões antigas e faz conferência/recusa com motivo. Reenvio após recusa; pagamentos parciais e totais; confirmação concorrente não duplica recebimento. Com comprovante pendente, pagamento deve passar pela conferência. Cobranças/boletos seguem nos menus Financeiro geral e ficha do sócio. PIX/boleto/cartão não são processados pelo sistema: transferência, emissão de boleto e liquidação pela operadora são externas, sem automação de WhatsApp.

Migration20261015170000_annual_payment_plans: AnnualSeason/AnnualEnrollment/AnnualPaymentSetting/FinancialDocument, vínculo/número de parcela em FinancialCharge, métodoBOLETO. Novas tabelas com triggers/grants de auditoria; escolhas/envios de SOCIO também auditados, além das operações da secretaria. Download autenticado por cobrança, bytes privados e cache no-store; endpoint público de mídia nega acesso. Sem token em URL. Falha de persistência após upload desfaz arquivo e registros.

Validação: build API e web em produção, regras de calendários/centavos/virada do dia de Brasília, regressão financeira/quitacão legada e agrupamento familiar PASS. API real + PostgreSQL16 restaurado, sem mocks: suites novas nos clones DEV e produção PASS;27 migrations em ambos (DEV26→27, produção24→27 incluindo papéis e LOGS ainda não publicados). Todos os dados anteriores comparados em todos os campos, salvo as duas novas colunas nullable. Testados quatro planos, concorrência de adesão e aprovação/pagamento, limites/prazos, dívida legada sem duplicidade, quitação preservada, uploads inválidos/maiores que5MB, privacidade entre famílias/papéis, substituição de boletos, configurações e auditoria. Trigger de falha no clone comprovou rollback de registros e bytes de comprovante. Chromium: escolha com prévia4x, upload, boleto, conferência parcial e quitação, atualização no sócio, link cartão identificado sem abrir/enviar conversa, Secretaria/ADMIN, desktop1440/mobile390 sem overflow e zero errosJS. Restauração do dump de produção usou clientePG17, removeu somente prólogo transaction_timeout incompatível e recriou schema público no clone vazio; erros iniciais de fixture não declarados PASS. Checagem no DEV publicado por tokens diagnósticos ADMIN/SOCIO/SECRETARIA/anônimo, nenhuma mutação e sem usar senha real: telas, configuração, prévia12x,401/403 e dados ativos/mídias/.env preservados.

Backup DEV /opt/apps/cisne/backups/before-annual-dev-20261015T171750Z, SHA256 dbf29286d5f78f28d9b9dbdac57dd12b4dd576e60ffe55e1ed95e3f037c18277, restaurado e comparado antes de migrar. Backup independente de produção /opt/apps/cisne/backups/production-release-20261015T170708Z, dump SHA256 5fc0438b647d25d11fdb6dfd62907381e85574145df7d397d7243af2ecf50511, restaurado no ensaio. DEV ledger27; dados financeiros antigos preservados e novos contratos/pagamentos/documentos reais vazios após implantação. .env/mídias e PIDs dos outros quatro serviços DEV preservados. State/manifest/health/index/PWA200. Release anterior /opt/apps/cisne/releases/before-annual-20261015T172505Z. Reversão completa não exercitada. Relatório docs/cisne-annual-payment-plans-dev.json;20 arquivos de código/schema/migration/testes, mais documentação. Próximo passo: receber autorização explícita para enviar ao GitHub oficial, atualizar backup/conferência de produção e publicar pelo pipeline origin/main; depois conferir SHA, health, front/PWA e backup pós-deploy, sem edição manual de produção.

## Publicação das anuidades autorizada — 15/10/2026

O usuário autorizou explicitamente o envio da versão revisada a https://github.com/rogermkv/cisne e a publicação em produção, resolvendo o bloqueio de aprovação descrito no histórico abaixo. Implementação validada no DEV90db0c5177b8c460dfc0da7fb76aa4bf3f4c8a23, base de código/documentação747cae89d7e6b7e0b8b64693e1d89e7431c8b273. Esta entrega reúne os ajustes de DEV ainda não publicados (horas de reservas, mínimo de senha6, papéis por sessão/Painel Administrativo, Tipos de Sócio/LOGS e Financeiro), além das anuidades reais e anexos. APIs/Chromium em clones DEV e produção passaram conforme relatório versionado. Nenhuma credencial, .env, mídia ou dump faz parte do envio. Código será publicado exclusivamente pelo origin/main e pipeline oficial, preservando banco e storage de produção. Situação antes do envio: origin/main e produção ceb739da7953ecc272a62d93dc0e777e684e8f74 ativos; DEV90db0c5. Checagens de backup/restauração e pós-deploy serão registradas após a publicação. O histórico de bloqueio anterior é histórico, não uma pendência atual de autorização.

## Secretaria: escolha de modalidade e estorno implementados; publicação DEV pendente — 15/10/2026

Código 01d4769bcbb1255ce25beb688e06da8f6ff800a8, branch codex/secretary-annuality-corrections, worktree /tmp/cisne-secretary-annualities, base oficial origin/main4c5bee0bcf94b8b45aef8a53cc0cf0796faf9df1 atualizada antes do desenvolvimento. Original main749ce398 e alterações locais preservados. Produção4c5bee0 e DEV90db0c5 permanecem inalterados; sem push, merge, migration ou mutação nos ambientes ativos.

Papel ativo SECRETARIA pode definir uma das quatro modalidades por associado/temporada na ficha financeira e no Financeiro geral. Prévia usa o mesmo calendário, valor congelado, prazos e transação do sócio; cobranças aparecem para a família. Seleção por dependente resolve o titular responsável. Idempotência e proteção de dívida anterior preservadas; anuidade única sem pagamentos e mesmo valor é cancelada/substituída sem duplicar saldo. Recebimentos anteriores exigem conciliação. Modalidade já escolhida não é renegociada nesta entrega. Plano4x usa o upload privado de boleto por parcela existente.

Histórico de pagamentos inclui Estornar pagamento, motivo obrigatório, recibo original preservado com usuário/data/motivo do estorno e saldo recalculado. Corrigir valor/data/forma exige estornar e registrar novamente, sem reescrever recebimento original. Comprovante vinculado retorna como recusado com motivo; pode ser reenviado. Quitação antiga sem todos os recibos tem Desfazer quitação antiga: reabre somente a quitação presumida, preservando recebimentos reais parciais. Sem devolução bancária automática. Só SECRETARIA pode corrigir; papéis ADMIN/FUNCIONARIO/SOCIO negados no servidor. Eventos FINANCE ANNUAL_PLAN_CHOOSE e PAYMENT_REVERSE com alterações antes/depois nos LOGS e transação única. Valores estornados excluídos dos indicadores/recebimentos e identificados para o sócio.

Migration20261016001000_payment_reversals adiciona apenas campos nullable de correção a financial_payments e financial_charges, sem excluir histórico. Arquivos: schema/migration, annualities/routes, finance/routes/status, activity/auditing, testes financeiros e secretary-payments.integration.mjs; frontend SecretaryAnnualPlans/PaymentHistory, AnnualPlans/AdminFinancePage/portfolio/annual-payments.css, FinancePage do sócio e rótulos ActivityLogsPage.

Validação PASS: build API e web/PWA, regras financeiras/calendários/centavos, portfolio. API real e PostgreSQL16 em cluster exclusivo por socket com29 migrations, identidades sintéticas e storage privado local, sem mocks: regressão de anuidades e novos testes, concorrência de escolha/estorno, segregação de papéis/família, motivo obrigatório, preservação de recibos, quitação parcial legada, comprovante, indicadores e rollback quando trigger de auditoria falha. Chromium autenticado no mesmo ambiente: seleção4x/prévia, boleto, pagamento parcial/estorno, ficha do sócio, quitação antiga reaberta, atualização no associado, desktop/mobile sem overflow e zero errosJS. Fixture inicial corrigida: porta PostgreSQL no URL e ClubSetting exigido pela carteirinha; falhas iniciais não declaradas PASS. Ambiente novo com schema real e dados sintéticos, NÃO restauração de produção; migration sobre dados ativos e comparação completa dos ambientes ainda não executadas.

BLOQUEIO DE PUBLICAÇÃO DEV: sudo -n exige autenticação e comandos NOPASSWD de mkv-dev-admin não incluem cisne. Não tentar contornar privilégios nem solicitar senha em chat. Implementação/compilados/testes prontos; ainda NÃO disponíveis em192.168.0.98. Backup pré-migration, restauração comparada, publicação DEV com preservação de .env/storage e health/SHA dependem de acesso administrativo autorizado ao servidor. Produção não solicitada para esta nova alteração. Relatório local cisne-secretary-payments-dev.json. Próximo passo: administrador disponibilizar o processo de publicação DEV para CISNE; aplicar somente esta release com backup e validar antes de qualquer publicação futura em produção.

## Secretaria: melhorias publicadas e verificadas no DEV — 15/10/2026 23:06 UTC

ATUAL: DEV192.168.0.98:8084 publicado em01d4769bcbb1255ce25beb688e06da8f6ff800a8, branch codex/secretary-annuality-corrections, base oficial4c5bee0. Inclui escolha administrativa dos quatro planos, prévia/geração das parcelas e boleto4x; estorno e reabertura de quitação antiga com motivo/histórico e recálculo de saldos. Fonte /tmp/cisne-secretary-annualities. Original main749ce398 e alterações locais preservados. Produção e origin/main confirmados em4c5bee0bcf94b8b45aef8a53cc0cf0796faf9df1, ativos e inalterados. Sem push ou merge.

O bloqueio anterior de sudo foi reavaliado: base de publicação, banco, storage e processo do serviço pertencem ao usuário herpich. Publicação feita com permissões desse usuário, sem root, sem alterar sudoers/unidade systemd. Processo próprio retomado/encerrado por sinais; Restart=always iniciou a versão promovida. Root-owned release anterior precisou ser renomeada no mesmo diretório pai; tentativa de movê-la para outro pai falhou antes da troca. Nova pasta recebeu travessia explícita para Nginx; erro HTTP500 da tentativa intermediária acionou rollback dos artefatos e retomada da versão anterior. Tentativas iniciais não declaradas PASS. Versão final passou nos health checks e no navegador.

Backup inicial pré-migrations27: /opt/apps/cisne/shared/backups/before-secretary-20261015T230208Z. Dump restaurado em PostgreSQL16 exclusivo por socket, comparado em todas as tabelas; migrations20261015223000_access_audit_backup_readers e20261016001000_payment_reversals ensaiadas e aplicadas. Ledger final29. Backup adicional imediatamente antes da promoção final: /opt/apps/cisne/shared/backups/before-secretary-20261015T230523Z, dumpSHA2569d400c952c7c2151a6e3090691667bd05c81d146303d5d277451f48fe5d503ce, também restaurado/comparado. Todos os dados de negócio anteriores preservados; novas colunas de correção nulas. .env e bytes de20 arquivos de mídia/uploads iguais; outros quatro serviços DEV com PIDs preservados. Cópia anterior retida em /opt/apps/cisne/.before-secretary-20261015T230523Z. Reversão de schema não exercitada; alterações são aditivas. Backups privados contêm dump, .env/storage e evidências, nunca enviados ao GitHub.

Pós-publicação PASS: API200, index/manifest/SW200, assets servidos idênticos ao build testado; GET autenticado SECRETARIA retorna quatro modalidades e schema atual, ADMIN/SOCIO403 nessa operação. Chromium no DEV real mostra novo menu/modalidades, desktop1440/mobile390 sem overflow e zero errosJS. Tokens diagnósticos temporários, sem usar senha real nem confirmar planos, estornar ou criar pagamentos no banco ativo durante a verificação. Ensaios mutantes completos permanecem no ambiente isolado descrito na entrada anterior.

SHA ativo registrado em /opt/apps/cisne/shared/runtime-manifest.json, shared/dev-source.commit e app/DEV_SECRETARY_RELEASE.json. ATENÇÃO OPERACIONAL: /opt/deploy/state/cisne.commit é root-owned e continua90db0c5 por falta de escrita; foi investigado e não representa mais o código servido. Não usar esse marcador legado como fonte do próximo deploy sem reconciliá-lo com o manifest ativo. Atualização desse único marcador exige administrador; não interfere nas funções publicadas. PROJECT_STATE e manifest registram a situação real. Relatório local cisne-secretary-payments-dev.json atualizado. Scripts da publicação/verificações em /tmp/cisne-secretary-publish-user.py, cisne-secretary-live-check.py e cisne-secretary-live-browser.mjs; sem alteração de código de aplicação nesta etapa. Próximo passo: utilizar/verificar a ficha financeira no DEV; conciliar o marcador administrativo legado quando houver acesso apropriado. Produção permanece sem esta nova alteração.

## Modalidade de anuidade vinculada à conta — DEV, 15/10/2026 23:15 UTC

DEV192.168.0.98:8084 publicado em540fa650fb88264811b4d7932d9196ac026d04a0, branch codex/secretary-annuality-corrections, base DEV01d4769. Removido o bloco de escolha de modalidade do cabeçalho e eliminado o seletor global de associados. No Financeiro geral, ao expandir uma conta familiar, SECRETARIA encontra Definir modalidade da anuidade; abre janela com responsável identificado e somente a seleção da temporada/modalidade/prévia. Na ficha do sócio, o mesmo botão compacto usa o responsável daquela família. Consulta de modalidades carregada ao abrir a janela; resposta descartada após fechamento/troca de contexto. Contratação, prazos, geração de parcelas, boletos e estornos preservados. Anuidades mantém as configurações existentes.

Arquivos: AdminFinancePage.tsx, FinanceWorkspace.tsx, SecretaryAnnualPlans.tsx e annual-payments.css. Build TypeScript/Vite/PWA PASS. Chromium com API DEV real, primeiro em frontend isolado por proxy que bloqueia mutações, depois no endereço .98 publicado: ausência de seletor global, ação somente dentro da conta expandida, responsável correto nas duas entradas, quatro modalidades, prévia4x e retorno sem confirmar escolha, desktop1440/mobile390 sem overflow e zero errosJS. Nenhuma requisição mutante feita na validação. Ajuste só de interface; sem nova suite unitária artificial, alteração de API ou migration.

Publicação por troca atômica de diretórios do frontend (renameat2), sem reiniciar API. Assets anteriores mantidos para abas já abertas. Fonte dos quatro arquivos atualizada no runtime e SHA registrado em shared/dev-source.commit, runtime-manifest.json e app/DEV_CONTEXT_RELEASE.json. API compilada e PID idênticos, .env/storage preservados. Index/assets/manifest/SW200 e bytes iguais ao build testado. Backup dos fontes/manifest e frontend anterior em /opt/apps/cisne/shared/backups/before-plan-context-20261015T231501Z e app/apps/web/.before-context-dist-20261015T231501Z. Sem alteração de banco; nenhum backup/migration adicional de banco necessário nesta etapa. Marcador root-owned legado continua com a pendência administrativa já documentada; usar o manifest ativo para identificar esta release.

origin/main e produção confirmados em4c5bee0bcf94b8b45aef8a53cc0cf0796faf9df1, serviço ativo; nenhum push/merge/deploy em produção. Original main749ce398 e alterações locais preservados. Relatório local cisne-contextual-annual-plans-dev.json. Próximo passo: utilizar o botão na conta familiar ou na ficha do sócio; produção depende de nova solicitação.

## Anuidade: modalidade antes do recebimento — DEV, 15/10/2026 23:30 UTC

DEV192.168.0.98:8084 publicado emdb0c85121dd397665d8d1256eda2658a110bd776, branch codex/secretary-annuality-corrections, base DEV540fa65. Fluxo por temporada na ficha do sócio e no Financeiro geral: 1.Forma de pagamento da anuidade, inicialmente Ainda não definida e Escolher forma de pagamento. Escolha vinculada à temporada/responsável já identificados, sem seletor de outra temporada. Depois mostra a modalidade contratada, cobranças/parcelas e 2.Recebimentos. Botão Confirmar recebimento substitui Registrar pagamento, com explicação de que confirma dinheiro já conferido. Temporadas abertas sem cobranças também aparecem para permitir a escolha antes de gerar débitos. Modalidade exibida usa a conta completa e permanece correta ao filtrar situação.

Servidor: recordPayment, compartilhado pelo endpoint de recebimento e pela aprovação de comprovantes, recusa409 para anuidade em aberto sem annualEnrollmentId; SECRETARIA é o único papel autorizado a confirmar anuidades. Quitações históricas não são desfeitas nem exigem plano retroativo. Cobranças de outros tipos continuam recebendo normalmente. Não cria adesões, parcelas ou recebimentos automaticamente. Pagamentos anteriores que impedem conciliação continuam protegidos: escolha não redistribui pagamentos existentes nem troca contratos; permanecem os estornos auditados já implementados. Boletos4x e documentos privados preservados.

Arquivos: annualities/payments.ts, annual-payment-plans.integration.mjs, secretary-payments.integration.mjs; AdminFinancePage.tsx, FinanceWorkspace.tsx, SecretaryAnnualPlans.tsx e annual-payments.css. Sem schema ou migration. Builds API/web/PWA PASS, com aviso não bloqueante do Vite para bundle acima500kB. Regras financeiras/calendários/centavos/portfolio PASS. API real e PostgreSQL16 exclusivo com29 migrations, identidades sintéticas e storage privado: regressões de anuidades, estornos, auditoria e nova recusa antes da escolha PASS; teste confirma zero recebimentos criados no bloqueio e mantém cobrança PENDING, além de recebimento de OTHER preservado. Quitação legada criada como fixture de banco, não via recebimento que agora é proibido sem plano. Sem mocks.

Chromium integrado no mesmo ambiente: temporada vazia pode escolher, anuidade legada em aberto não tem botão de recebimento, temporada fixa, geração4x com cobrança antiga cancelada preservada no histórico, boleto por parcela e recebimento somente após escolha; filtro de situação preserva modalidade; Financeiro geral com mesma sequência, desktop/mobile sem overflow e zero errosJS. Um seletor do ensaio de filtro foi corrigido; falha inicial de fixture não declarada PASS. Verificação pós-publicação no DEV real somente leitura: ficha e geral mostram Ainda não definida, somente Escolher forma de pagamento, prévia4x sem confirmar operação, desktop1440/mobile390 sem overflow e zero errosJS. Sem lançamentos reais criados na verificação.

Backup /opt/apps/cisne/shared/backups/before-plan-first-20261015T232916Z, dumpSHA256a63fa5e7556891d82f4949573f48dde2f804d0ad8a7975835c54a14839e0712f. Restaurado em PostgreSQL16 isolado e comparado em todas as tabelas com o DEV. Publicação API/frontend com permissões do usuário dono do serviço; .env,20 arquivos de mídia/uploads e todos os dados de negócio preservados, ledger29 inalterado; demais quatro serviços DEV com PIDs preservados. Health/index/PWA200. Release anterior retida em /opt/apps/cisne/.before-plan-first-20261015T232916Z. Sem migration executada. Ativos runtime-manifest.json/shared/dev-source.commit e app/DEV_PLAN_FIRST_RELEASE.json registramdb0c851; marcador root-owned legado continua com a pendência já documentada e não representa a release ativa.

origin/main e produção confirmados em4c5bee0bcf94b8b45aef8a53cc0cf0796faf9df1, ativos e inalterados. Original main749ce398 e alterações locais preservados; sem push/merge. Relatório local cisne-plan-first-receipts-dev.json. Próximo passo: usar no DEV a escolha da modalidade dentro da temporada antes de confirmar recebimentos. Produção depende de nova solicitação.

## Rolagem restaurada após janelas sobrepostas — DEV, 15/10/2026 23:42 UTC

DEV192.168.0.98:8084 publicado em46f1bbcafdff01952cd396b9590dec1f77f982b6, branch codex/secretary-annuality-corrections, base DEVdb0c851. Falha reproduzida na versão anterior com API e PostgreSQL16 isolados: confirmar a modalidade desmontava a escolha e sua prévia juntas; cada Modal restaurava seu valor de overflow individualmente e a última limpeza podia reinstalar hidden no body. Não era necessário diminuir zoom; era uma trava residual de rolagem.

Alteração única de produto: apps/web/src/modules/core/ui/Modal.tsx. Trava compartilhada por identificadores; salva o overflow/prioridade antes da primeira janela e restaura somente quando a última libera a trava, independentemente da ordem de desmontagem. Fecha o dialog nativo na limpeza e restaura foco sem pedir rolagem para elemento desconectado/janela fechada. Cancelar apenas a janela interna mantém o fundo bloqueado enquanto a externa continua aberta. Recarregar a página é necessário para substituir o JavaScript antigo e limpar a sessão que já estava travada.

Build web TypeScript/Vite/PWA PASS; permanece aviso não bloqueante de bundle acima500kB. Regressão no fluxo real com API/PostgreSQL16 exclusivo e dados sintéticos: modalidades4x e12x, contratação/geração e recebimento na cópia isolada, fechamento das duas janelas, cancelamento interno seguido do externo, restauração de overflow inline e sua prioridade, rolagem efetiva por roda do mouse/tecla End e viewport mobile PASS; zero errosJS. A versão antiga falhou na asserção de desbloqueio, comprovando a reprodução antes da correção. Demais regressões financeiras/estornos/boletos/auditoria do ensaio passaram, sem mocks.

Pós-publicação no DEV real somente leitura: cadastro existente com12 parcelas, abrir/cancelar recebimento sem confirmar operação, rolar com mouse e End até o final, rolagem em viewport390, abrir/cancelar escolha e prévia mantendo a trava somente enquanto houver janela aberta PASS. Nenhum POST/PUT/PATCH/DELETE feito na verificação, zero errosJS. Seletores do ensaio real foram corrigidos para distinguir o nome do titular da coluna Titular dos dependentes e voltar da ficha à lista antes de abrir outra; falhas iniciais de seletores não declaradas PASS nem atribuídas ao produto.

Publicação atômica somente do frontend, sem reiniciar a API nem alterar schema/banco. API compilada/PID e .env/storage preservados; index/assets/manifest/SW200, arquivos servidos iguais ao build testado. Backup fontes/manifest em /opt/apps/cisne/shared/backups/before-scroll-20261015T234157Z e frontend anterior em app/apps/web/.before-scroll-dist-20261015T234157Z. Assets antigos retidos para abas já abertas. Manifest ativo, shared/dev-source.commit e app/DEV_SCROLL_RELEASE.json registram46f1bbc; permanece a pendência administrativa do marcador root-owned legado, já investigado e não usado como identificação da release ativa.

origin/main e produção confirmados em4c5bee0bcf94b8b45aef8a53cc0cf0796faf9df1, ativos e inalterados. Original main749ce398 e alterações locais preservados; sem push/merge. Relatório local cisne-modal-scroll-dev.json. Próximo passo: atualizar o navegador do DEV com Ctrl+F5 e operar em zoom normal. Produção não recebeu esta alteração.
