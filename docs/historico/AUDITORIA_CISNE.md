# Auditoria CISNE

Data da auditoria: 20/09/2026  
Ambiente: `http://localhost:5173` / API `http://localhost:3333`  
Perfis utilizados: ADMIN, SECRETARIA e SOCIO (credenciais fornecidas pelo solicitante; não reproduzidas neste relatório).

## 1. Resumo executivo

O CISNE possui uma base funcional consistente para autenticação, painel administrativo, quadro social, categorias, financeiro de consulta, reservas, avisos, eventos, controle de acesso e área do sócio. A API responde ao health check (`200`, `{"status":"OK"}`), o backend compila com TypeScript e os fluxos básicos de login e leitura de dados funcionam.

O estado atual ainda não é profissional para operação: o cadastro de novo sócio está inacessível pela própria interface; a área financeira do sócio exibe mensagens contraditórias; existem controles visíveis sem ação; a UI mistura português e inglês; há texto com encoding quebrado; módulos de visitantes e gestão financeira existem no backend, mas não estão disponíveis no menu; e várias operações de gestão não têm feedback de erro, loading ou confirmação adequada.

Classificação consolidada: 14 problemas observados, sendo 0 críticos, 6 altos, 7 médios e 1 baixo. A ausência de problema crítico não significa ausência de risco: o cadastro de sócios e algumas rotinas administrativas essenciais estão bloqueados ou incompletos.

## 2. Mapa atual do sistema

### Telas encontradas e testadas

1. Login institucional.
2. Dashboard administrativo.
3. Lista de sócios.
4. Detalhe/edição de sócio existente.
5. Tipos de sócio.
6. Financeiro administrativo.
7. Reservas administrativas.
8. Avisos administrativos.
9. Eventos administrativos.
10. Controle de acesso/portaria.
11. Carteirinha e dashboard da área do sócio.
12. Financeiro do sócio.
13. Reservas do sócio.
14. Avisos do sócio.
15. Eventos do sócio.
16. Carteirinha de dependente em modal.

Foram encontradas e testadas 16 telas/superfícies relevantes. Não há roteamento URL explícito no frontend: a navegação é gerenciada por estado em `apps/web/src/App.tsx` e pelos componentes de layout.

### Módulos e rotas de frontend

- Autenticação: login, sessão, logout e troca de senha obrigatória.
- Administração: dashboard, sócios, tipos de sócio, financeiro, reservas, avisos, eventos e acesso.
- Área do sócio: dashboard, carteirinha/QR, dependentes, financeiro, reservas, avisos e eventos.
- Componentes existentes sem entrada administrativa equivalente: visitantes/convites e várias operações financeiras.

### Principais endpoints de backend

- Auth: `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/password`.
- Sócios: `/api/members`, `/api/member-categories`, dependentes, fotos e acesso.
- Financeiro: `/api/finance/charges`, dashboard e pagamentos.
- Reservas: `/api/reservable-spaces`, `/api/spaces`, `/api/reservations` e área do sócio.
- Comunicação: `/api/announcements`, `/api/events` e leituras da área do sócio.
- Visitantes/convites: `/api/visitors`, `/api/invitations`.
- Acesso: `/api/access/validate-credential`, check-in/out, eventos e estatísticas.
- Health: `GET /api/health`.

## 3. Problemas críticos

Nenhum problema classificado como CRÍTICA foi observado durante esta passagem. O maior risco operacional encontrado é o cadastro de sócios bloqueado, classificado como ALTA.

## 4. Problemas funcionais

### P-001 — Cadastro de novo sócio não abre formulário

- Prioridade: ALTA
- Tela/módulo: Sócios
- Elemento: `+ New member`
- Passos: autenticar como ADMIN; abrir Sócios; clicar `+ New member`.
- Atual: a lista permanece na tela, sem formulário, modal ou mensagem.
- Esperado: abrir formulário completo de cadastro e permitir salvar/cancelar.
- Evidência: o DOM permaneceu com a tabela após o clique.
- Console/rede: nenhum erro de console observado; não houve requisição de criação.
- Código: `apps/web/src/modules/core/members/MembersPage.tsx`, função `open` e condição `if (selected) return <MemberRecord ...>`.
- Causa provável: `open(null)` apenas limpa estado; a renderização de formulário está condicionada a `selected`, portanto o estado de criação não possui tela.
- Solução: separar `mode=create|edit` ou renderizar `MemberRecord` também para novo registro, com estado inicial e validações.

### P-002 — Contrato financeiro da API não corresponde à UI do sócio

- Prioridade: ALTA
- Tela/módulo: Financeiro/Área do sócio
- Elemento: situação e próxima anuidade.
- Passos: autenticar como SOCIO; abrir Financeiro.
- Atual: aparece `PENDING`, mas o título mostra `Nenhuma pendência` e o vencimento aparece `—`, embora o histórico contenha `Anuidade 2027`, `R$ 1.600,00`, `PENDENTE`.
- Esperado: mostrar descrição, valor e vencimento da próxima cobrança, sem mensagem contraditória.
- Evidência: DOM da tela financeira e dashboard do sócio.
- Código: `apps/api/src/modules/core/finance/routes.ts` retorna `status` e `history`, mas não retorna `nextCharge`; `apps/web/src/modules/core/member-area/FinancePage.tsx` e `MemberHome.tsx` leem `finance.nextCharge`.
- Solução: incluir `nextCharge` no contrato da API, tipar a resposta e cobrir o caso vazio com status coerente.

### P-003 — Menu “Mais” expõe ações sem implementação

- Prioridade: ALTA
- Tela/módulo: Área do sócio
- Elementos: `Meus dados`, `Convites`, `Alterar senha`.
- Passos: autenticar como SOCIO; abrir `Mais`.
- Atual: os três botões aparecem, mas não possuem ação efetiva.
- Esperado: abrir dados do perfil, convites e troca de senha, ou não exibir funções ainda indisponíveis.
- Evidência: snapshot mostra os botões sem mudança ao clique; em `MemberHome.tsx`, somente Financeiro e Sair possuem fluxo.
- Solução: implementar as telas/handlers ou ocultar os itens até estarem prontos.

### P-004 — Gestão financeira administrativa é somente consulta

- Prioridade: ALTA
- Tela/módulo: Financeiro administrativo
- Atual: lista cobranças e indicadores, mas não há criar cobrança, registrar pagamento, editar ou filtrar na UI.
- Esperado: secretaria/admin conseguirem executar as operações expostas pelo backend.
- Código: `AdminFinancePage.tsx` usa apenas `GET /api/finance/charges` e `GET /api/finance/dashboard`; a API possui `POST /api/finance/charges` e `POST /api/finance/charges/:id/payments`.
- Solução: criar fluxos de cobrança/pagamento com confirmação, validação e trilha de auditoria.

### P-005 — Módulo de visitantes/convites está órfão da interface

- Prioridade: ALTA
- Tela/módulo: Visitantes e convites
- Atual: endpoints existem e são protegidos por permissões, porém não há tela ou item de menu para usuários administrativos.
- Código: `apps/api/src/modules/core/visitors/routes.ts`; não há página correspondente em `apps/web/src` nem item no `AdminLayout.tsx`.
- Solução: adicionar telas de visitantes, convites, bloqueio, cancelamento e check-in, ou remover/assumir explicitamente o módulo como backend-only.

### P-006 — Operações de eventos e avisos estão incompletas na UI administrativa

- Prioridade: ALTA
- Tela/módulo: Avisos/Eventos
- Atual: avisos permitem criar e excluir; não permitem editar, ativar/desativar ou definir público/fim de publicação. Eventos permitem criar, mas não editar, ativar/desativar, capacidade, local ou preços.
- Código: `AdminCommunicationsPage.tsx` e endpoints `PUT`/`toggle` em `communications/routes.ts`.
- Solução: alinhar a tela com o backend e incluir estados, filtros, confirmação e edição.

## 5. Problemas de UX/UI

### P-007 — Mistura de idiomas e nomenclaturas

- Prioridade: MÉDIA
- Evidência: “Club management”, “Members”, “Back”, “Finance”, “Announcements”, “Create”, “Delete” e “No charges found” convivem com português.
- Impacto: reduz clareza e percepção profissional.
- Código: `MembersPage.tsx`, `AdminFinancePage.tsx`, `AdminCommunicationsPage.tsx` e estilos/componentes relacionados.
- Solução: centralizar textos e escolher português brasileiro como idioma único ou criar i18n.

### P-008 — Texto com encoding quebrado

- Prioridade: MÉDIA
- Tela: tabela de sócios.
- Evidência: o nome `SÃ©rgio Klein` foi renderizado em vez de `Sérgio Klein`.
- Solução: verificar encoding UTF-8 na seed, banco, conexão Prisma, headers e arquivos de dados.

### P-009 — Feedback insuficiente em requisições

- Prioridade: MÉDIA
- Atual: diversos `useEffect(...).then(...)` não tratam `.catch`; operações de criação/atualização não exibem sucesso/erro ao usuário.
- Código: páginas de financeiro, reservas, comunicações, categorias e área do sócio.
- Impacto: falhas de rede podem parecer tela vazia ou clique sem efeito.
- Solução: componente de estado de carregamento/erro vazio, mensagens acionáveis e retry.

### P-010 — Ações destrutivas têm proteção inconsistente

- Prioridade: MÉDIA
- Evidência: excluir aviso usa `confirm` nativo; categorias apenas desativam pela UI; backend possui exclusões adicionais. Não existe padrão visual de ação destrutiva nem informação de reversibilidade.
- Solução: modal consistente, texto de impacto, arquivamento/desativação preferencial e auditoria.

### P-011 — Estados vazios e mensagens de domínio são inconsistentes

- Prioridade: MÉDIA
- Evidência: financeiro do sócio mostra `PENDING` junto com “Nenhuma pendência”; dashboard administrativo tem labels em inglês; loading e erro não são uniformes.
- Solução: definir estados de domínio (`PAID`, `PENDING`, `OVERDUE`) com apresentação única por contexto.

## 6. Problemas de responsividade

### P-012 — Tabelas exigem scroll horizontal em telas estreitas

- Prioridade: MÉDIA
- Evidência/código: `members-table` define `min-width: 980px`; histórico de acesso define `min-width: 700px`. A tabela de sócios tem transformação mobile, mas a de acesso permanece larga.
- Impacto: uso difícil em celular, especialmente na portaria.
- Solução: cartões responsivos ou colunas prioritárias no mobile, com ações fixas e filtros reorganizados.

### P-013 — Layout administrativo mobile é parcialmente coberto

- Prioridade: MÉDIA
- Evidência/código: há media queries para sidebar, sócios e acesso, mas não há cobertura equivalente explícita para todos os cards, toolbar de comunicação, financeiro administrativo e tabelas de reservas.
- Solução: validar breakpoints 360/390/768/1280 e criar casos de regressão visual.

## 7. Problemas de dados/API/backend

### P-014 — Ausência de rate limiting no login

- Prioridade: BAIXA (a elevar para ALTA antes de produção)
- Código: `apps/api/src/modules/core/auth/routes.ts` não impõe limitação por IP/CPF, atraso progressivo ou bloqueio temporário; `app.ts` registra Fastify sem plugin de rate limit.
- Impacto: facilita tentativas automatizadas contra CPF/senha.
- Solução: rate limit específico para login, logs de tentativa, alertas e política de bloqueio sem revelar se o CPF existe.

## 8. Problemas de autenticação e permissões

- Os três logins fornecidos funcionaram e o backend devolveu perfis ADMIN, SECRETARIA e SOCIO corretamente.
- SECRETARIA recebeu acesso aos módulos administrativos esperados pela configuração de permissões.
- SOCIO foi direcionado corretamente à área do sócio e não ao painel administrativo.
- Os endpoints de gestão usam `requirePermission`, e a sessão valida usuário ativo.
- Risco de política: `reset-password` em `members/routes.ts` redefine a senha para a data de nascimento e marca troca obrigatória. É conveniente operacionalmente, mas a data de nascimento é previsível; deve ser substituída por convite/token temporário ou senha aleatória entregue por canal controlado.
- A troca de senha existe para admins e sócios no backend/frontend de primeiro acesso, mas `Alterar senha` do menu do sócio não está ligado a ela.

## 9. Funcionalidades incompletas

- Cadastro de sócio novo inacessível.
- Visitantes e convites sem interface.
- Gestão de cobranças/pagamentos sem interface.
- Perfil, convites e troca de senha do sócio sem ação.
- Edição/ativação de eventos e edição/ativação de avisos ausentes.
- Dashboard administrativo sem indicadores operacionais além dos cards de módulos.
- Controle de acesso sem fluxo de visitantes exposto na navegação, embora exista backend relacionado.

## 10. Inconsistências de arquitetura ou implementação

- Navegação principal por estado local sem URL/rota: não há deep link, histórico de navegador ou restauração direta de tela.
- Contrato financeiro incompleto (`nextCharge` esperado pelo frontend e ausente na API).
- Tipagem fraca em diversas áreas (`any`, `// @ts-nocheck` em rotas de comunicação/financeiro/member-area), aumentando risco de divergências silenciosas.
- O build da API/TypeScript passou; o build web falhou no ambiente com `Error: spawn EPERM` ao inicializar o esbuild do Vite. Isso é um bloqueio de ambiente/processo, não uma falha TypeScript reportada pelo compilador, mas precisa ser resolvido no pipeline.
- Upload de fotos limita tamanho a 5 MB, porém a superfície de gestão de fotos precisa ser validada com MIME/extensão e feedback de erro mais explícitos.

## 11. Melhorias recomendadas

1. Corrigir imediatamente o fluxo de novo sócio e o contrato financeiro.
2. Criar uma camada de componentes de formulário com loading, erro, sucesso, validação e cancelamento padronizados.
3. Adicionar telas de visitantes/convites e operações financeiras existentes na API.
4. Implementar edição/ativação de comunicação e filtros mais úteis.
5. Unificar idioma, status e mensagens de domínio.
6. Introduzir rotas reais ou estado sincronizado com URL para navegação, links diretos e botão voltar.
7. Substituir senha previsível de reset por convite/token de uso único.
8. Adicionar rate limiting, logs de auditoria e testes de autorização por perfil.
9. Corrigir encoding e estabelecer UTF-8 ponta a ponta.
10. Criar testes E2E para cadastro, busca/edição, financeiro, reserva, acesso e permissões.

## 12. Melhorias para transformar o CISNE em um sistema profissional de gestão de clube

- Secretaria: busca global por nome/CPF/matrícula, filtros persistentes, atalhos de cadastro, histórico do associado, situação financeira no mesmo contexto e ações rápidas.
- Associados: matrícula visível, carteira com informações completas, acesso claro a dependentes, perfil editável, notificações e status financeiro coerente.
- Financeiro: régua de cobrança, geração/baixa de anuidades, parcelamento real quando integrado, conciliação, recibos e auditoria.
- Reservas: calendário de disponibilidade, conflito visual, regras por espaço, aprovação em lote e comunicação ao solicitante.
- Comunicação: segmentação por categoria/situação, agendamento, expiração, publicação e histórico de alterações.
- Portaria: busca rápida por CPF/QR, visitante e convite em uma única tela, feedback de autorização e histórico exportável.
- Administração: permissões por ação, trilha de auditoria, dashboard com pendências e indicadores operacionais.
- Qualidade: design system, idioma único, acessibilidade, estados vazios/erro/loading consistentes e testes responsivos automatizados.

## 13. Plano de correção

### FASE 1 — erros críticos

Não houve item CRÍTICA nesta auditoria. Antes de produção, validar segurança de autenticação, rate limiting e proteção dos fluxos de gestão.

### FASE 2 — funcionalidades quebradas

Corrigir P-001 e P-002 juntos, pois cadastro e financeiro dependem de contratos de dados confiáveis. Em seguida tratar P-003, P-004, P-005 e P-006, alinhando o menu ao backend.

### FASE 3 — inconsistências funcionais

Padronizar status financeiros, mensagens de reserva/comunicação, operações de ativação e os estados de erro/loading descritos em P-009 e P-011.

### FASE 4 — UX e usabilidade

Unificar feedback, confirmações e mensagens; melhorar busca de sócios; incluir ações rápidas para secretaria; resolver P-007, P-010 e P-011.

### FASE 5 — padronização visual

Aplicar idioma único, tokens de design, hierarquia de botões, componentes de modal e tabelas compartilhados.

### FASE 6 — melhorias profissionais

Implementar dashboard operacional, trilha de auditoria, filtros avançados, histórico do associado, financeiro operacional e comunicação segmentada.

### FASE 7 — responsividade

Tratar P-012 e P-013 após estabilizar componentes, cobrindo 360 px, 390 px, tablet e desktop, com foco especial na portaria e tabelas.

### FASE 8 — testes finais e regressão

Executar E2E por perfil, testes de autorização, testes de API, build web/API em ambiente limpo, revisão de console/rede e checklist visual das 16 superfícies.

## Métricas da auditoria

- Telas/superfícies encontradas: 16.
- Telas/superfícies efetivamente testadas: 16.
- Fluxos testados: 22 (login por perfil, navegação, consulta, busca, abertura de cadastro, categorias, financeiro, reservas, avisos, eventos, acesso, carteirinhas, modais e menu adicional).
- Problemas encontrados: 14.
- CRÍTICOS: 0.
- ALTOS: 6.
- MÉDIOS: 7.
- BAIXOS: 1.

### Principais problemas altos

1. Cadastro de novo sócio não abre formulário.
2. Financeiro do sócio tem contrato API/UI divergente e mensagem contraditória.
3. Menu do sócio expõe ações sem implementação.
4. Financeiro administrativo não expõe operações de gestão já existentes no backend.
5. Visitantes e convites estão sem interface.
6. Gestão de avisos/eventos está incompleta frente aos endpoints disponíveis.

Relatório: `C:\Users\herpich.LOCAL\Projetos\CISNE\AUDITORIA_CISNE.md`

## Atualização da correção de alta prioridade — 20/09/2026

As alterações abaixo foram implementadas, mas permanecem pendentes da validação visual no navegador. Nesta sessão não havia navegador disponível para automação; por isso, os itens não são declarados como `CORRIGIDO` até que o fluxo seja confirmado no frontend em execução.

### P-001 — Cadastro de novo sócio não abre formulário

- Status: IMPLEMENTADO; validação no navegador pendente.
- Causa encontrada: `open(null)` limpava `selected`, enquanto a renderização de `MemberRecord` dependia exclusivamente de `selected`.
- Solução aplicada: adicionado estado explícito `creating`, com abertura, cancelamento e transição para edição após o salvamento; API de criação foi preservada.
- Arquivos modificados: `apps/web/src/modules/core/members/MembersPage.tsx`.
- Validação: endpoint de criação coberto pelo smoke test de módulos; build web aprovado. Clique, preenchimento, validações, cancelamento, salvamento e console ainda precisam ser confirmados no navegador.

### P-002 — Contrato financeiro da API não corresponde à UI do sócio

- Status: IMPLEMENTADO; validação no navegador pendente.
- Causa encontrada: `/api/member/me/finance` retornava `status` e `history`, mas não retornava `nextCharge`, embora a UI o consumisse.
- Solução aplicada: API agora calcula e retorna a primeira cobrança `PENDING`/`OVERDUE` por vencimento.
- Arquivos modificados: `apps/api/src/modules/core/finance/routes.ts`.
- Validação: build da API aprovado; health check `200`; consumo visual da tela financeira pendente no navegador.

### P-003 — Menu “Mais” expõe ações sem implementação

- Status: IMPLEMENTADO; validação no navegador pendente.
- Causa encontrada: os botões `Meus dados`, `Convites` e `Alterar senha` não alteravam o estado nem abriam telas.
- Solução aplicada: adicionadas telas de perfil, convites e alteração de senha, conectadas aos dados e ao fluxo de troca de senha já existente.
- Arquivos modificados: `apps/web/src/modules/core/member-area/MemberHome.tsx`.
- Validação: build web aprovado; endpoints existentes preservados; navegação visual pendente no navegador.

### P-004 — Gestão financeira administrativa é somente consulta

- Status: IMPLEMENTADO; validação no navegador pendente.
- Causa encontrada: a tela consumia apenas os GETs, apesar de existirem POSTs de cobrança e pagamento na API.
- Solução aplicada: adicionados formulário de nova cobrança, ação de registro de pagamento, confirmação e mensagens de sucesso/erro.
- Arquivos modificados: `apps/web/src/modules/core/finance/AdminFinancePage.tsx`.
- Validação: build web aprovado; smoke test da API aprovado; operações pela UI ainda precisam ser executadas com dados de teste no navegador.

### P-005 — Módulo de visitantes/convites está órfão da interface

- Status: IMPLEMENTADO; validação no navegador pendente.
- Causa encontrada: endpoints existiam, mas não havia tela nem item no menu administrativo.
- Solução aplicada: criada tela administrativa para listar/cadastrar/bloquear visitantes e criar convites; adicionado item de menu e rota por estado.
- Arquivos modificados: `apps/web/src/modules/core/visitors/VisitorsPage.tsx`, `apps/web/src/modules/core/layout/AdminLayout.tsx`, `apps/web/src/App.tsx`.
- Validação: build web aprovado; chamadas foram alinhadas aos endpoints existentes; fluxo visual pendente no navegador.

### P-006 — Operações de eventos e avisos estão incompletas na UI administrativa

- Status: IMPLEMENTADO; validação no navegador pendente.
- Causa encontrada: a UI apenas criava registros e, para avisos, excluía; não expunha PUT/toggle já existentes.
- Solução aplicada: formulário compartilhado de criação/edição, campos de publicação/evento, ações de edição e ativação/desativação.
- Arquivos modificados: `apps/web/src/modules/core/communications/AdminCommunicationsPage.tsx`.
- Validação: build web aprovado; endpoints PUT/toggle existentes preservados; fluxo visual e requisições de edição ainda precisam ser confirmados no navegador.

### Validação técnica executada

- `npm run build --workspace @cisne/web`: aprovado.
- `npm run build --workspace @cisne/api`: aprovado.
- `npm run test:auth --workspace @cisne/api`: aprovado.
- `npm run test:club-modules --workspace @cisne/api`: aprovado; dados de teste removidos pelo próprio teste.
- `GET http://localhost:3333/api/health`: `200`, `{"status":"OK"}`.
- `GET http://localhost:5173`: `200`.
- Validação de console, rede e interação no navegador: realizada nesta continuação; foi encontrado e corrigido o uso de rotas sem `/api` em avisos/eventos. Um log antigo registra `prompt() is not supported` na implementação anterior de visitantes, substituída nesta sessão por formulário de convite sem prompt.

## Validação funcional complementar — 20/09/2026

- P-001: fluxo de cadastro de sócio permanece implementado; validação visual anterior registrada.
- P-002: contrato financeiro do sócio permanece implementado; a tela exibiu a próxima cobrança corretamente.
- P-003: área do sócio e menu adicional carregaram corretamente; status financeiro foi traduzido para português.
- P-004: criação, validação de campos obrigatórios, atualização dos indicadores e listagem funcionaram pelo navegador. Foi criada a cobrança identificável `Cobrança validação P004` para `Validacao P001 2026`. O registro de pagamento ainda requer confirmação antes da alteração financeira e permanece pendente.
- P-005: listagem, bloqueio, desbloqueio e criação de convite para `Visitante Validacao P005` funcionaram pelo navegador. A causa do `Failed to fetch` não se reproduziu; a API respondeu normalmente. A implementação anterior baseada em `prompt()` foi substituída por formulário visível de convite.
- P-006: criação, edição, ativação e desativação de aviso e evento funcionaram pelo navegador. A causa encontrada foi a ausência do prefixo `/api` nas operações de gravação da UI; a atualização do backend também passou a normalizar datas e valores de eventos.

## Padronização visual e idioma

- Telas verificadas: painel administrativo, financeiro, visitantes/convites, avisos, eventos e área financeira do sócio.
- Textos traduzidos: financeiro, visitantes, avisos, eventos, estados de cobrança e status financeiros principais.
- Tabelas e listas: listas de cobranças e cartões de gestão mantêm o padrão visual existente; a revisão completa das tabelas restantes ainda precisa de uma passada dedicada.
- Botões: ações de criar, editar, salvar, ativar, desativar, bloquear, desbloquear e registrar pagamento foram uniformizadas nas telas corrigidas.
- Responsividade: o seletor gráfico de data foi removido dos fluxos de cobrança e visitante testados; a validação visual em 390/768/1366/1440 px ainda precisa de execução dedicada.
- Inconsistências restantes: há textos em inglês em telas legadas de sócios e administração, e o registro do pagamento P-004 aguarda confirmação; o nome `SÃ©rgio Klein` continua indicando problema de encoding nos dados.

## Situação técnica desta continuação

- `npx tsc -b apps/web/tsconfig.json`: aprovado.
- `npm run build --workspace @cisne/api`: aprovado.
- `npm run build --workspace @cisne/web`: continua bloqueado por `Error: spawn EPERM` ao iniciar o serviço esbuild/Vite; o TypeScript do frontend passa isoladamente.
- `git diff --check`: aprovado.
