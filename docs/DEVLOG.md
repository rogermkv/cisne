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
