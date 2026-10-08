# CISNE — Development Log

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
