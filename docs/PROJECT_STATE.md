## Rolagem restaurada após janelas sobrepostas — DEV, 15/10/2026 23:42 UTC

DEV192.168.0.98:8084 publicado em46f1bbcafdff01952cd396b9590dec1f77f982b6, branch codex/secretary-annuality-corrections, base DEVdb0c851. Falha reproduzida na versão anterior com API e PostgreSQL16 isolados: confirmar a modalidade desmontava a escolha e sua prévia juntas; cada Modal restaurava seu valor de overflow individualmente e a última limpeza podia reinstalar hidden no body. Não era necessário diminuir zoom; era uma trava residual de rolagem.

Alteração única de produto: apps/web/src/modules/core/ui/Modal.tsx. Trava compartilhada por identificadores; salva o overflow/prioridade antes da primeira janela e restaura somente quando a última libera a trava, independentemente da ordem de desmontagem. Fecha o dialog nativo na limpeza e restaura foco sem pedir rolagem para elemento desconectado/janela fechada. Cancelar apenas a janela interna mantém o fundo bloqueado enquanto a externa continua aberta. Recarregar a página é necessário para substituir o JavaScript antigo e limpar a sessão que já estava travada.

Build web TypeScript/Vite/PWA PASS; permanece aviso não bloqueante de bundle acima500kB. Regressão no fluxo real com API/PostgreSQL16 exclusivo e dados sintéticos: modalidades4x e12x, contratação/geração e recebimento na cópia isolada, fechamento das duas janelas, cancelamento interno seguido do externo, restauração de overflow inline e sua prioridade, rolagem efetiva por roda do mouse/tecla End e viewport mobile PASS; zero errosJS. A versão antiga falhou na asserção de desbloqueio, comprovando a reprodução antes da correção. Demais regressões financeiras/estornos/boletos/auditoria do ensaio passaram, sem mocks.

Pós-publicação no DEV real somente leitura: cadastro existente com12 parcelas, abrir/cancelar recebimento sem confirmar operação, rolar com mouse e End até o final, rolagem em viewport390, abrir/cancelar escolha e prévia mantendo a trava somente enquanto houver janela aberta PASS. Nenhum POST/PUT/PATCH/DELETE feito na verificação, zero errosJS. Seletores do ensaio real foram corrigidos para distinguir o nome do titular da coluna Titular dos dependentes e voltar da ficha à lista antes de abrir outra; falhas iniciais de seletores não declaradas PASS nem atribuídas ao produto.

Publicação atômica somente do frontend, sem reiniciar a API nem alterar schema/banco. API compilada/PID e .env/storage preservados; index/assets/manifest/SW200, arquivos servidos iguais ao build testado. Backup fontes/manifest em /opt/apps/cisne/shared/backups/before-scroll-20261015T234157Z e frontend anterior em app/apps/web/.before-scroll-dist-20261015T234157Z. Assets antigos retidos para abas já abertas. Manifest ativo, shared/dev-source.commit e app/DEV_SCROLL_RELEASE.json registram46f1bbc; permanece a pendência administrativa do marcador root-owned legado, já investigado e não usado como identificação da release ativa.

origin/main e produção confirmados em4c5bee0bcf94b8b45aef8a53cc0cf0796faf9df1, ativos e inalterados. Original main749ce398 e alterações locais preservados; sem push/merge. Relatório local cisne-modal-scroll-dev.json. Próximo passo: atualizar o navegador do DEV com Ctrl+F5 e operar em zoom normal. Produção não recebeu esta alteração.

## Anuidade: modalidade antes do recebimento — DEV, 15/10/2026 23:30 UTC

DEV192.168.0.98:8084 publicado emdb0c85121dd397665d8d1256eda2658a110bd776, branch codex/secretary-annuality-corrections, base DEV540fa65. Fluxo por temporada na ficha do sócio e no Financeiro geral: 1.Forma de pagamento da anuidade, inicialmente Ainda não definida e Escolher forma de pagamento. Escolha vinculada à temporada/responsável já identificados, sem seletor de outra temporada. Depois mostra a modalidade contratada, cobranças/parcelas e 2.Recebimentos. Botão Confirmar recebimento substitui Registrar pagamento, com explicação de que confirma dinheiro já conferido. Temporadas abertas sem cobranças também aparecem para permitir a escolha antes de gerar débitos. Modalidade exibida usa a conta completa e permanece correta ao filtrar situação.

Servidor: recordPayment, compartilhado pelo endpoint de recebimento e pela aprovação de comprovantes, recusa409 para anuidade em aberto sem annualEnrollmentId; SECRETARIA é o único papel autorizado a confirmar anuidades. Quitações históricas não são desfeitas nem exigem plano retroativo. Cobranças de outros tipos continuam recebendo normalmente. Não cria adesões, parcelas ou recebimentos automaticamente. Pagamentos anteriores que impedem conciliação continuam protegidos: escolha não redistribui pagamentos existentes nem troca contratos; permanecem os estornos auditados já implementados. Boletos4x e documentos privados preservados.

Arquivos: annualities/payments.ts, annual-payment-plans.integration.mjs, secretary-payments.integration.mjs; AdminFinancePage.tsx, FinanceWorkspace.tsx, SecretaryAnnualPlans.tsx e annual-payments.css. Sem schema ou migration. Builds API/web/PWA PASS, com aviso não bloqueante do Vite para bundle acima500kB. Regras financeiras/calendários/centavos/portfolio PASS. API real e PostgreSQL16 exclusivo com29 migrations, identidades sintéticas e storage privado: regressões de anuidades, estornos, auditoria e nova recusa antes da escolha PASS; teste confirma zero recebimentos criados no bloqueio e mantém cobrança PENDING, além de recebimento de OTHER preservado. Quitação legada criada como fixture de banco, não via recebimento que agora é proibido sem plano. Sem mocks.

Chromium integrado no mesmo ambiente: temporada vazia pode escolher, anuidade legada em aberto não tem botão de recebimento, temporada fixa, geração4x com cobrança antiga cancelada preservada no histórico, boleto por parcela e recebimento somente após escolha; filtro de situação preserva modalidade; Financeiro geral com mesma sequência, desktop/mobile sem overflow e zero errosJS. Um seletor do ensaio de filtro foi corrigido; falha inicial de fixture não declarada PASS. Verificação pós-publicação no DEV real somente leitura: ficha e geral mostram Ainda não definida, somente Escolher forma de pagamento, prévia4x sem confirmar operação, desktop1440/mobile390 sem overflow e zero errosJS. Sem lançamentos reais criados na verificação.

Backup /opt/apps/cisne/shared/backups/before-plan-first-20261015T232916Z, dumpSHA256a63fa5e7556891d82f4949573f48dde2f804d0ad8a7975835c54a14839e0712f. Restaurado em PostgreSQL16 isolado e comparado em todas as tabelas com o DEV. Publicação API/frontend com permissões do usuário dono do serviço; .env,20 arquivos de mídia/uploads e todos os dados de negócio preservados, ledger29 inalterado; demais quatro serviços DEV com PIDs preservados. Health/index/PWA200. Release anterior retida em /opt/apps/cisne/.before-plan-first-20261015T232916Z. Sem migration executada. Ativos runtime-manifest.json/shared/dev-source.commit e app/DEV_PLAN_FIRST_RELEASE.json registramdb0c851; marcador root-owned legado continua com a pendência já documentada e não representa a release ativa.

origin/main e produção confirmados em4c5bee0bcf94b8b45aef8a53cc0cf0796faf9df1, ativos e inalterados. Original main749ce398 e alterações locais preservados; sem push/merge. Relatório local cisne-plan-first-receipts-dev.json. Próximo passo: usar no DEV a escolha da modalidade dentro da temporada antes de confirmar recebimentos. Produção depende de nova solicitação.

## Modalidade de anuidade vinculada à conta — DEV, 15/10/2026 23:15 UTC

DEV192.168.0.98:8084 publicado em540fa650fb88264811b4d7932d9196ac026d04a0, branch codex/secretary-annuality-corrections, base DEV01d4769. Removido o bloco de escolha de modalidade do cabeçalho e eliminado o seletor global de associados. No Financeiro geral, ao expandir uma conta familiar, SECRETARIA encontra Definir modalidade da anuidade; abre janela com responsável identificado e somente a seleção da temporada/modalidade/prévia. Na ficha do sócio, o mesmo botão compacto usa o responsável daquela família. Consulta de modalidades carregada ao abrir a janela; resposta descartada após fechamento/troca de contexto. Contratação, prazos, geração de parcelas, boletos e estornos preservados. Anuidades mantém as configurações existentes.

Arquivos: AdminFinancePage.tsx, FinanceWorkspace.tsx, SecretaryAnnualPlans.tsx e annual-payments.css. Build TypeScript/Vite/PWA PASS. Chromium com API DEV real, primeiro em frontend isolado por proxy que bloqueia mutações, depois no endereço .98 publicado: ausência de seletor global, ação somente dentro da conta expandida, responsável correto nas duas entradas, quatro modalidades, prévia4x e retorno sem confirmar escolha, desktop1440/mobile390 sem overflow e zero errosJS. Nenhuma requisição mutante feita na validação. Ajuste só de interface; sem nova suite unitária artificial, alteração de API ou migration.

Publicação por troca atômica de diretórios do frontend (renameat2), sem reiniciar API. Assets anteriores mantidos para abas já abertas. Fonte dos quatro arquivos atualizada no runtime e SHA registrado em shared/dev-source.commit, runtime-manifest.json e app/DEV_CONTEXT_RELEASE.json. API compilada e PID idênticos, .env/storage preservados. Index/assets/manifest/SW200 e bytes iguais ao build testado. Backup dos fontes/manifest e frontend anterior em /opt/apps/cisne/shared/backups/before-plan-context-20261015T231501Z e app/apps/web/.before-context-dist-20261015T231501Z. Sem alteração de banco; nenhum backup/migration adicional de banco necessário nesta etapa. Marcador root-owned legado continua com a pendência administrativa já documentada; usar o manifest ativo para identificar esta release.

origin/main e produção confirmados em4c5bee0bcf94b8b45aef8a53cc0cf0796faf9df1, serviço ativo; nenhum push/merge/deploy em produção. Original main749ce398 e alterações locais preservados. Relatório local cisne-contextual-annual-plans-dev.json. Próximo passo: utilizar o botão na conta familiar ou na ficha do sócio; produção depende de nova solicitação.

## Secretaria: melhorias publicadas e verificadas no DEV — 15/10/2026 23:06 UTC

ATUAL: DEV192.168.0.98:8084 publicado em01d4769bcbb1255ce25beb688e06da8f6ff800a8, branch codex/secretary-annuality-corrections, base oficial4c5bee0. Inclui escolha administrativa dos quatro planos, prévia/geração das parcelas e boleto4x; estorno e reabertura de quitação antiga com motivo/histórico e recálculo de saldos. Fonte /tmp/cisne-secretary-annualities. Original main749ce398 e alterações locais preservados. Produção e origin/main confirmados em4c5bee0bcf94b8b45aef8a53cc0cf0796faf9df1, ativos e inalterados. Sem push ou merge.

O bloqueio anterior de sudo foi reavaliado: base de publicação, banco, storage e processo do serviço pertencem ao usuário herpich. Publicação feita com permissões desse usuário, sem root, sem alterar sudoers/unidade systemd. Processo próprio retomado/encerrado por sinais; Restart=always iniciou a versão promovida. Root-owned release anterior precisou ser renomeada no mesmo diretório pai; tentativa de movê-la para outro pai falhou antes da troca. Nova pasta recebeu travessia explícita para Nginx; erro HTTP500 da tentativa intermediária acionou rollback dos artefatos e retomada da versão anterior. Tentativas iniciais não declaradas PASS. Versão final passou nos health checks e no navegador.

Backup inicial pré-migrations27: /opt/apps/cisne/shared/backups/before-secretary-20261015T230208Z. Dump restaurado em PostgreSQL16 exclusivo por socket, comparado em todas as tabelas; migrations20261015223000_access_audit_backup_readers e20261016001000_payment_reversals ensaiadas e aplicadas. Ledger final29. Backup adicional imediatamente antes da promoção final: /opt/apps/cisne/shared/backups/before-secretary-20261015T230523Z, dumpSHA2569d400c952c7c2151a6e3090691667bd05c81d146303d5d277451f48fe5d503ce, também restaurado/comparado. Todos os dados de negócio anteriores preservados; novas colunas de correção nulas. .env e bytes de20 arquivos de mídia/uploads iguais; outros quatro serviços DEV com PIDs preservados. Cópia anterior retida em /opt/apps/cisne/.before-secretary-20261015T230523Z. Reversão de schema não exercitada; alterações são aditivas. Backups privados contêm dump, .env/storage e evidências, nunca enviados ao GitHub.

Pós-publicação PASS: API200, index/manifest/SW200, assets servidos idênticos ao build testado; GET autenticado SECRETARIA retorna quatro modalidades e schema atual, ADMIN/SOCIO403 nessa operação. Chromium no DEV real mostra novo menu/modalidades, desktop1440/mobile390 sem overflow e zero errosJS. Tokens diagnósticos temporários, sem usar senha real nem confirmar planos, estornar ou criar pagamentos no banco ativo durante a verificação. Ensaios mutantes completos permanecem no ambiente isolado descrito na entrada anterior.

SHA ativo registrado em /opt/apps/cisne/shared/runtime-manifest.json, shared/dev-source.commit e app/DEV_SECRETARY_RELEASE.json. ATENÇÃO OPERACIONAL: /opt/deploy/state/cisne.commit é root-owned e continua90db0c5 por falta de escrita; foi investigado e não representa mais o código servido. Não usar esse marcador legado como fonte do próximo deploy sem reconciliá-lo com o manifest ativo. Atualização desse único marcador exige administrador; não interfere nas funções publicadas. PROJECT_STATE e manifest registram a situação real. Relatório local cisne-secretary-payments-dev.json atualizado. Scripts da publicação/verificações em /tmp/cisne-secretary-publish-user.py, cisne-secretary-live-check.py e cisne-secretary-live-browser.mjs; sem alteração de código de aplicação nesta etapa. Próximo passo: utilizar/verificar a ficha financeira no DEV; conciliar o marcador administrativo legado quando houver acesso apropriado. Produção permanece sem esta nova alteração.

## Secretaria: escolha de modalidade e estorno implementados; publicação DEV pendente — 15/10/2026

Código 01d4769bcbb1255ce25beb688e06da8f6ff800a8, branch codex/secretary-annuality-corrections, worktree /tmp/cisne-secretary-annualities, base oficial origin/main4c5bee0bcf94b8b45aef8a53cc0cf0796faf9df1 atualizada antes do desenvolvimento. Original main749ce398 e alterações locais preservados. Produção4c5bee0 e DEV90db0c5 permanecem inalterados; sem push, merge, migration ou mutação nos ambientes ativos.

Papel ativo SECRETARIA pode definir uma das quatro modalidades por associado/temporada na ficha financeira e no Financeiro geral. Prévia usa o mesmo calendário, valor congelado, prazos e transação do sócio; cobranças aparecem para a família. Seleção por dependente resolve o titular responsável. Idempotência e proteção de dívida anterior preservadas; anuidade única sem pagamentos e mesmo valor é cancelada/substituída sem duplicar saldo. Recebimentos anteriores exigem conciliação. Modalidade já escolhida não é renegociada nesta entrega. Plano4x usa o upload privado de boleto por parcela existente.

Histórico de pagamentos inclui Estornar pagamento, motivo obrigatório, recibo original preservado com usuário/data/motivo do estorno e saldo recalculado. Corrigir valor/data/forma exige estornar e registrar novamente, sem reescrever recebimento original. Comprovante vinculado retorna como recusado com motivo; pode ser reenviado. Quitação antiga sem todos os recibos tem Desfazer quitação antiga: reabre somente a quitação presumida, preservando recebimentos reais parciais. Sem devolução bancária automática. Só SECRETARIA pode corrigir; papéis ADMIN/FUNCIONARIO/SOCIO negados no servidor. Eventos FINANCE ANNUAL_PLAN_CHOOSE e PAYMENT_REVERSE com alterações antes/depois nos LOGS e transação única. Valores estornados excluídos dos indicadores/recebimentos e identificados para o sócio.

Migration20261016001000_payment_reversals adiciona apenas campos nullable de correção a financial_payments e financial_charges, sem excluir histórico. Arquivos: schema/migration, annualities/routes, finance/routes/status, activity/auditing, testes financeiros e secretary-payments.integration.mjs; frontend SecretaryAnnualPlans/PaymentHistory, AnnualPlans/AdminFinancePage/portfolio/annual-payments.css, FinancePage do sócio e rótulos ActivityLogsPage.

Validação PASS: build API e web/PWA, regras financeiras/calendários/centavos, portfolio. API real e PostgreSQL16 em cluster exclusivo por socket com29 migrations, identidades sintéticas e storage privado local, sem mocks: regressão de anuidades e novos testes, concorrência de escolha/estorno, segregação de papéis/família, motivo obrigatório, preservação de recibos, quitação parcial legada, comprovante, indicadores e rollback quando trigger de auditoria falha. Chromium autenticado no mesmo ambiente: seleção4x/prévia, boleto, pagamento parcial/estorno, ficha do sócio, quitação antiga reaberta, atualização no associado, desktop/mobile sem overflow e zero errosJS. Fixture inicial corrigida: porta PostgreSQL no URL e ClubSetting exigido pela carteirinha; falhas iniciais não declaradas PASS. Ambiente novo com schema real e dados sintéticos, NÃO restauração de produção; migration sobre dados ativos e comparação completa dos ambientes ainda não executadas.

BLOQUEIO DE PUBLICAÇÃO DEV: sudo -n exige autenticação e comandos NOPASSWD de mkv-dev-admin não incluem cisne. Não tentar contornar privilégios nem solicitar senha em chat. Implementação/compilados/testes prontos; ainda NÃO disponíveis em192.168.0.98. Backup pré-migration, restauração comparada, publicação DEV com preservação de .env/storage e health/SHA dependem de acesso administrativo autorizado ao servidor. Produção não solicitada para esta nova alteração. Relatório local cisne-secretary-payments-dev.json. Próximo passo: administrador disponibilizar o processo de publicação DEV para CISNE; aplicar somente esta release com backup e validar antes de qualquer publicação futura em produção.

## Publicação das anuidades autorizada — 15/10/2026

O usuário autorizou explicitamente o envio da versão revisada a https://github.com/rogermkv/cisne e a publicação em produção, resolvendo o bloqueio de aprovação descrito no histórico abaixo. Implementação validada no DEV90db0c5177b8c460dfc0da7fb76aa4bf3f4c8a23, base de código/documentação747cae89d7e6b7e0b8b64693e1d89e7431c8b273. Esta entrega reúne os ajustes de DEV ainda não publicados (horas de reservas, mínimo de senha6, papéis por sessão/Painel Administrativo, Tipos de Sócio/LOGS e Financeiro), além das anuidades reais e anexos. APIs/Chromium em clones DEV e produção passaram conforme relatório versionado. Nenhuma credencial, .env, mídia ou dump faz parte do envio. Código será publicado exclusivamente pelo origin/main e pipeline oficial, preservando banco e storage de produção. Situação antes do envio: origin/main e produção ceb739da7953ecc272a62d93dc0e777e684e8f74 ativos; DEV90db0c5. Checagens de backup/restauração e pós-deploy serão registradas após a publicação. O histórico de bloqueio anterior é histórico, não uma pendência atual de autorização.

## Anuidades reais concluídas no DEV; publicação de produção aguardando autorização de destino — 15/10/2026

REGRA ATUAL: usuário solicitou concluir o trabalho interrompido e publicar em produção. Implementação concluída e publicada no DEV192.168.0.98:8084, código SHA 90db0c5177b8c460dfc0da7fb76aa4bf3f4c8a23, branch codex/annual-payment-plans, worktree /tmp/cisne-annual-payment-plans. Base DEVf705b50b87139e266a588e44f126f55b440ef2d7; base documental05fe50f. origin/main e produção conferidos em ceb739da7953ecc272a62d93dc0e777e684e8f74, serviço ativo. O push à branch do repositório oficial https://github.com/rogermkv/cisne foi recusado antes da execução pela revisão automática: entendeu necessária autorização explícita para o destino e apontou risco de exportação de conteúdo sensível. Pergunta enviada ao usuário para autorizar envio/publicação; resposta ainda pendente. Sem push, PR, merge, workaround ou alteração de produção. Inspeção da diferença de63 arquivos confirmou somente apps/docs, sem .env, uploads, dumps, chaves privadas ou tokens reais. Recebimento PIX/contato comerciais informados pelo usuário inicializados como configuração editável; não são credenciais de acesso bancário. Checkout original main749ce398 e alterações locais preservados.

Quatro modalidades reais, temporada01/11–31/10. A12x abril anterior ao início até março; D4x novembro, dezembro, janeiro e fevereiro, vencimentos dia10. Bcartão até10x na operadora, uma cobrança integral e link WhatsApp identificado; CPIX integral, uma cobrança. B/C disponíveis para escolha até10/11 do início, sem criar parcelas internas do cartão. Atraso de novas parcelas a partir de00h do dia11 em America/Sao_Paulo; calendário/valor da prévia confirmados pelo titular. Repartição em centavos com ajuste final preserva o total. Temporada2026/2027 inicializada com o valor já configurado no clube, sem geração em massa de parcelas.

Titular escolhe diretamente a modalidade da conta familiar; dependentes consultam e enviam comprovantes. Geração transacional idempotente com exclusividade por responsável/temporada, bloqueios de concorrência e contrato preservado. Uma cobrança anterior sem pagamentos, de mesmo ano/valor, é cancelada e substituída atomicamente, sem duplicar o saldo; quitações, pagamentos anteriores, múltiplas cobranças ou valores divergentes recusam escolha para conciliação. Sem exclusão de histórico. Valor da temporada editável antes da primeira adesão; abrir/encerrar escolhas; após adesão não há troca de modalidade por autosserviço.

Secretaria edita chave PIX, favorecido e WhatsApp em Anuidades. Dados fornecidos configurados, sem dados bancários fictícios. Comprovantes PDF/JPG/PNG até5MB, privados por família, estado pendente/aprovado/recusado separado da quitação. Somente papel ativo SECRETARIA confirma pagamentos das novas anuidades, inclusive no endpoint antigo; ADMIN/FUNCIONARIO/SOCIO bloqueados. Secretaria anexa/substitui boleto em cada parcela D, mantém versões antigas e faz conferência/recusa com motivo. Reenvio após recusa; pagamentos parciais e totais; confirmação concorrente não duplica recebimento. Com comprovante pendente, pagamento deve passar pela conferência. Cobranças/boletos seguem nos menus Financeiro geral e ficha do sócio. PIX/boleto/cartão não são processados pelo sistema: transferência, emissão de boleto e liquidação pela operadora são externas, sem automação de WhatsApp.

Migration20261015170000_annual_payment_plans: AnnualSeason/AnnualEnrollment/AnnualPaymentSetting/FinancialDocument, vínculo/número de parcela em FinancialCharge, métodoBOLETO. Novas tabelas com triggers/grants de auditoria; escolhas/envios de SOCIO também auditados, além das operações da secretaria. Download autenticado por cobrança, bytes privados e cache no-store; endpoint público de mídia nega acesso. Sem token em URL. Falha de persistência após upload desfaz arquivo e registros.

Validação: build API e web em produção, regras de calendários/centavos/virada do dia de Brasília, regressão financeira/quitacão legada e agrupamento familiar PASS. API real + PostgreSQL16 restaurado, sem mocks: suites novas nos clones DEV e produção PASS;27 migrations em ambos (DEV26→27, produção24→27 incluindo papéis e LOGS ainda não publicados). Todos os dados anteriores comparados em todos os campos, salvo as duas novas colunas nullable. Testados quatro planos, concorrência de adesão e aprovação/pagamento, limites/prazos, dívida legada sem duplicidade, quitação preservada, uploads inválidos/maiores que5MB, privacidade entre famílias/papéis, substituição de boletos, configurações e auditoria. Trigger de falha no clone comprovou rollback de registros e bytes de comprovante. Chromium: escolha com prévia4x, upload, boleto, conferência parcial e quitação, atualização no sócio, link cartão identificado sem abrir/enviar conversa, Secretaria/ADMIN, desktop1440/mobile390 sem overflow e zero errosJS. Restauração do dump de produção usou clientePG17, removeu somente prólogo transaction_timeout incompatível e recriou schema público no clone vazio; erros iniciais de fixture não declarados PASS. Checagem no DEV publicado por tokens diagnósticos ADMIN/SOCIO/SECRETARIA/anônimo, nenhuma mutação e sem usar senha real: telas, configuração, prévia12x,401/403 e dados ativos/mídias/.env preservados.

Backup DEV /opt/apps/cisne/backups/before-annual-dev-20261015T171750Z, SHA256 dbf29286d5f78f28d9b9dbdac57dd12b4dd576e60ffe55e1ed95e3f037c18277, restaurado e comparado antes de migrar. Backup independente de produção /opt/apps/cisne/backups/production-release-20261015T170708Z, dump SHA256 5fc0438b647d25d11fdb6dfd62907381e85574145df7d397d7243af2ecf50511, restaurado no ensaio. DEV ledger27; dados financeiros antigos preservados e novos contratos/pagamentos/documentos reais vazios após implantação. .env/mídias e PIDs dos outros quatro serviços DEV preservados. State/manifest/health/index/PWA200. Release anterior /opt/apps/cisne/releases/before-annual-20261015T172505Z. Reversão completa não exercitada. Relatório docs/cisne-annual-payment-plans-dev.json;20 arquivos de código/schema/migration/testes, mais documentação. Próximo passo: receber autorização explícita para enviar ao GitHub oficial, atualizar backup/conferência de produção e publicar pelo pipeline origin/main; depois conferir SHA, health, front/PWA e backup pós-deploy, sem edição manual de produção.

## Planejamento das modalidades de anuidade — 15/10/2026

Pedido em andamento, somente DEV. Especificação em docs/annual-payment-plans.md: temporada novembro–outubro, A12x abril–março, B cartão até10x com cobrança única e solicitação de link por WhatsApp, C PIX à vista, D4x novembro–fevereiro; vencimento dia10 e confirmação de parcelas exclusiva da secretaria. Investigação confirmou Anuidades e pagamentos da área do sócio ainda demonstrativos, embora cobranças/recebimentos reais já existam. Faltam persistência de planos e comprovantes e configurações de recebimento. Perguntas enviadas sobre calendário A, escolha/aprovação de modalidade, PIX/favorecido/WhatsApp e boleto externo. Especificação separa comprovante de quitação e registra UNKNOWN nas decisões pendentes. Não gera cobranças ou remapeia débitos anteriores.

Código DEV permanece f705b50b87139e266a588e44f126f55b440ef2d7; origin/main ceb739da7953ecc272a62d93dc0e777e684e8f74 confirmado. Produção não acessada/alterada, SHA atual UNKNOWN. Original main749ce398 e alterações locais preservados. Branch de trabalho codex/annual-payment-plans, worktree /tmp/cisne-annual-payment-plans, base088ce7e655ec9c69cd0d65aafc76dd1b605d2a4d (documentação da última publicação DEV). Alterações desta etapa somente docs/annual-payment-plans.md, PROJECT_STATE.md e DEVLOG.md. Sem código, migration, alteração de banco/storage ou deploy; testes de implementação não executados. Próximo passo: receber definições e implementar/testar no DEV.

## Financeiro por temporada e responsável — DEV, 15/10/2026

REGRA ATUAL: somente DEV192.168.0.98:8084. Produção exige novo pedido explícito. Sem push/merge em main, pois dispara o pipeline. Publicado código SHA f705b50b87139e266a588e44f126f55b440ef2d7, branch local codex/finance-responsible-workspace, worktree /tmp/cisne-finance-workspace, base DEVaea433a54d1d5262b506d3b19495e74b61cbcb69. origin/main confirmado ceb739da7953ecc272a62d93dc0e777e684e8f74; produção não acessada nem alterada, SHA atual UNKNOWN nesta sessão. Checkout original main749ce398 e alterações locais preservados.

Financeiro geral reorganizado por responsável financeiro/conta familiar: temporada principal, Todas as temporadas por padrão, três indicadores Em aberto/Em atraso/Recebido e abas Pendências (inicial), Recebimentos e Histórico. Em atraso é parte do saldo em aberto. Indicadores usam todas as cobranças da temporada escolhida, independentemente da busca/aba; filtros de listagem não mudam silenciosamente os indicadores. Uma linha expansível por responsável com matrícula, nome, temporadas, saldo e situação; dependentes permanecem na mesma conta. Busca por responsável/associado, matrícula, CPF com ou sem formatação e descrição. Busca encontra a conta e mantém suas demais cobranças no escopo. Filtro de responsáveis com atraso mantém inclusive suas pendências ainda não vencidas. Ordenação por nome ou maior saldo, paginação25 contas, detalhes por temporada com ações visíveis: pagamento, detalhes, editar/cancelar quando permitido e link WhatsApp. Nenhuma mensagem enviada automaticamente.

Recebimentos lista somente pagamentos individuais existentes, com valor, data civil, forma, operador e observação; seleciona pela temporada da cobrança, não pelo mês do recebimento. Quitações antigas sem recibos completos ficam no Histórico, com aviso, sem gerar novos recebimentos. Contas com pagamento parcial mantêm o saldo residual; quitação remove a cobrança das Pendências e conserva o histórico. Soma em centavos nos novos agrupamentos. Anuidades continua com suas regras/configuração existentes. Financeiro dentro da ficha do sócio preservado, com regressão integrada. Sem alteração de API, regras de cobrança, schema, permissões ou migration.

Validação: build web TypeScript/Vite/PWA PASS; teste versionado apps/web/test/finance-portfolio.mjs cobre agrupamento titular/dependente, CPF do responsável quando só há cobrança do dependente, centavos, saldo parcial, temporada, atrasos e quitação sem recibo. Chromium e API real com PostgreSQL16 restaurado do DEV: pagamento parcial40 + saldo60, quitação final, recibos, registro das duas inclusões nos LOGS, legado sem recibo preservado, criar/editar/cancelar cobrança e ficha financeira do dependente PASS. Ensaio com2000 cobranças adicionais em26 responsáveis sintéticos comprovou paginação25, busca e navegação; desktop1440 e mobile390 sem overflow e zero errosJS. Não é teste de carga concorrente. Fixture do proxy corrigida para não inventar corpo/content-type em POST vazio; seletor do ensaio de sócios aguarda o registro assíncrono correto. Ajustados rótulos acessíveis dos seletores no produto. Nenhuma falha de fixture foi declarada PASS.

Backup /opt/apps/cisne/backups/before-finance-workspace-20261015T132107Z, dump SHA256 a40d763719fdbbbde576111e4edf75605037102c40624b0d5d968bb865d00a60, restaurado e comparado em todos os campos com o DEV. Somente fixtures/sessões diagnósticas no clone, removido ao final. Sem usar senhas reais. Conferência publicada ADMIN/SECRETARIA, sessão legada, SOCIO e anônimo PASS, sem requisições mutantes. Totais/quantidade de contas comparados com a API real; SOCIO recebe403 no financeiro administrativo; sessão legada pede papel. Banco ativo inteiro, .env e bytes de mídia iguais antes/depois dos ensaios e da publicação; demais quatro serviços DEV com PIDs iguais. API compilada idêntica à anterior. Index, PWA e health200. State/manifest registram SHA publicado. Release anterior retida /opt/apps/cisne/releases/before-finance-workspace-20261015T132204Z; rollback completo não exercitado.

Limite conhecido: paginação no cliente; endpoint existente ainda carrega todas as cobranças. Não foi introduzida paginação/agregação no servidor. Relatório sem dados pessoais/credenciais em docs/cisne-finance-workspace-dev.json. Arquivos: AdminFinancePage.tsx, FinanceWorkspace.tsx, finance-workspace.css, portfolio.ts e teste financeiro; documentação PROJECT_STATE.md, DEVLOG.md e relatório. Próximo passo: utilizar o Financeiro no DEV; produção permanece aguardando solicitação explícita.

# CISNE — Project State

Last updated: 2026-10-08

## Current Git State

Branch: `main`

Base HEAD: commit local mais recente `ec37054` (`docs: record finance layout deployment`).

Origin: `ec37054` (layout financeiro publicado pelo push oficial)

Production functional release: `ec37054d9a6233336f99c8e0a5c887db2c1cce29`, publicado pelo processo oficial.

Working tree: alterações documentais desta confirmação, pendentes de commit.

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

Título: Auditoria e reestruturação do módulo de convites e visitantes

Status: IMPLEMENTED LOCALLY — PENDING REVIEW/RELEASE

Cause: quota mensal de 8 convites por grupo titular, emissão por titular ou dependente, cadastro global para secretaria e integração auditável com controle de acesso.

Files currently modified: refinamento da tela financeira para lista expansível de temporadas e detalhes de cobranças; os commits anteriores contêm quota de entradas de visitantes, validação no cadastro/check-in, indicação visual para associado e secretaria, migration e testes.

Validated: build completo PASS após o novo layout financeiro; testes e schema das alterações anteriores permanecem PASS.

Final local validation: titular PASS, dependente PASS, modal/carteirinha PASS, refresh PASS, Reservas após refresh PASS, cinco ciclos PASS, Eventos/Avisos/Mais PASS, build PASS e testes relevantes PASS. A integração de mídia permanece pendente somente por fixture de credenciais locais incompatível.

Production validation: release `ec37054d9a6233336f99c8e0a5c887db2c1cce29` publicado pelo processo oficial. O deploy executou build, aplicou as duas migrations pendentes após backup PostgreSQL e concluiu com health check OK. Stash preservado.

Navigation validation: shell compartilhado com header persistente, bottom navigation persistente, item ativo por view, suporte a safe-area e remoção do botão redundante de Reservas. Build PASS e validação visual local PASS em viewport mobile.

Pending: revisar e publicar a alteração que remove a data obrigatória dos convites. A produção permanece no release `ec37054d9a6233336f99c8e0a5c887db2c1cce29` até autorização explícita de deploy.

## Known Risks

- auto deploy associado à branch `main`;
- stash antigo preservado e não aplicado;
- diferenças entre storage local e produção;
- confusão entre `photoPath` legado e `MediaAsset`;
- declarar PASS um teste que não reproduza a condição real;
- alterar produção fora do processo oficial.

## Latest Verification

- `HEAD`: `ec37054d9a6233336f99c8e0a5c887db2c1cce29`; `origin/main`: `ec37054d9a6233336f99c8e0a5c887db2c1cce29`.
- `git status -sb`: documentação desta confirmação pendente; `stash@{0}` preservado e não aplicado.
- API DEV iniciada em `http://localhost:3338/api/health`, HTTP 200.
- Frontend DEV iniciado em `http://localhost:5178`; o repositório ainda contém defaults históricos em `vite.config.ts`/configuração da API para `5173`/`3333`, então as portas solicitadas foram usadas por override de processo, sem alterar o código de configuração nesta tarefa.
- Build completo: PASS.
- Produção: push `59153c2..4d426f7` concluído; a tela autenticada confirmou o bundle novo com “Carteirinhas da família”, Roger Herpich como titular, dois próximos eventos e o card de avisos. Health HTTP independente ficou `UNKNOWN` porque o endpoint recusou conexão durante o reinício do deploy.
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
- Diagnóstico financeiro concluído: cobranças e pagamentos existentes reutilizados; `responsibleMemberId` permanece a fonte compartilhada por família.
- Criada a interface administrativa demonstrativa “Temporadas e anuidades”, sem persistência ou cobrança real.
- Painel financeiro passou a exibir anuidades quitadas e grupos em dia/inadimplentes por responsável financeiro único.
- Área do Sócio passou a exibir “Minha anuidade”, progresso real das cobranças de anuidade e aviso explícito de conta familiar compartilhada.
- Documento técnico da Fase 1 criado em `docs/financial-module-phase-1.md`, com limites e plano recomendado para a Fase 2.
- Build completo após a Fase 1: PASS; `npx tsx test/finance.rules.ts`: PASS; `npm run test:club-modules --workspace @cisne/api`: PASS.
- Deploy da Fase 1 e alterações anteriores: push oficial `59153c2..4d426f7` concluído; nenhuma migration foi executada.
- Correção visual: removida a faixa de atalhos redundante da home; navegação inferior e ações contextuais foram preservadas.
- Build após a correção: PASS; inspeção visual local confirmou a ausência da faixa.
- Push oficial `a9c3d20..40e690d` concluído. Produção ainda servia a versão anterior durante as verificações; ativação do auto-deploy permanece `UNKNOWN`.
- Auditoria de convites: quota passou a ser compartilhada pelo grupo titular; dependentes podem emitir; limite configurado em 8; datas futuras são rejeitadas.
- Migration local `20261008120000_family_invitation_quota` aplicada e registrada; `quotaOwnerMemberId` preenchido nos 2 convites existentes; limite local confirmado em 8.
- Backup pré-migration: `C:\Users\herpich.LOCAL\Projetos\_backup_cisne_db\cisne-local-20261008-before-family-invitation-quota.dump`.
- Secretaria: visitantes agora expõem histórico de convites, quem convidou e entradas reais vinculadas ao convite; associados continuam com visão restrita ao grupo familiar.
- Controle de acesso: convites passados são expirados; check-in válido continua alterando `SCHEDULED` para `USED` e gravando `usedAt`/`invitationId` atomicamente.
- Validações: schema Prisma PASS, build completo PASS, regras de convites PASS, smoke de módulos do clube PASS.
- Quota de visitantes: limite configurado em 7 entradas por temporada novembro–outubro (`SEASON_NOV_OCT`), contado por `AccessEvent` real e com convites pendentes reservando saldo para evitar ultrapassagem.
- Emissão: associado e secretaria consultam a quota do visitante; novas emissões são bloqueadas sem saldo.
- Check-in: a quota é revalidada dentro da transação antes de registrar a entrada e consumir o convite.
- Migration local `20261008150000_visitor_season_quota` aplicada com sucesso; configuração local confirmada como `7|SEASON_NOV_OCT`.
- Backup pré-migration: `C:\Users\herpich.LOCAL\Projetos\_backup_cisne_db\cisne-local-20261008-before-visitor-season-quota.dump`.
- Build após a quota de temporada: PASS; `npm run test:visitor-invitations --workspace @cisne/api`: PASS; produção não foi alterada.
- Deploy da quota sazonal: push oficial `35f3dd0..e58a943` concluído em `origin/main`.
- A aplicação autenticada de produção continuou acessível após o push; o endpoint `/api/health` foi bloqueado pelo cliente Chrome desta sessão (`ERR_BLOCKED_BY_CLIENT`), portanto health check e SHA efetivo do release permanecem `UNKNOWN`.
- Tela financeira local: resumo anual, próxima cobrança e histórico aberto substituídos por lista compacta de temporadas; detalhes expandem valores, pagamentos e cobranças mensais por vencimento.
- Build após o layout financeiro: PASS; produção não foi alterada.
- Deploy do layout financeiro: push oficial `7aaa33d..874010a` concluído em `origin/main`; auto-deploy e health check permanecem `UNKNOWN` nesta sessão.
- Correção operacional do deploy: o parser de status do Prisma foi ajustado no script oficial para reconhecer migrations pendentes pelo nome, com backup do script antes da alteração. O auto-deploy aplicou as 2 migrations pendentes, publicou `ec37054d9a6233336f99c8e0a5c887db2c1cce29` e confirmou health check OK.
- Convites sem data de visita: novos convites passam a usar `createdAt` para a cota mensal e `usedAt`/`AccessEvent.occurredAt` para registrar a entrada real; convites antigos preservam `scheduledDate` histórico.
- Build completo: PASS; `npm run test:visitor-invitations --workspace @cisne/api`: PASS; `npm run test:club-modules --workspace @cisne/api`: PASS.
- Ficha administrativa do sócio: endpoint `/api/members/:id/activity` e abas de Convites, Reservas e Acessos implementados com agrupamento pelo titular do grupo, sem duplicação para dependentes.
- `prisma validate`/`prisma generate`: bloqueados pela indisponibilidade de rede para baixar o engine Prisma no ambiente local; migration SQL revisada e produção ainda não alterada.

## Next Step

Após a estabilização do deploy, repetir o health check e confirmar visualmente a home sem a faixa de atalhos.
## Parcelas de anuidade vencidas e bloqueio de acesso — DEV, 16/10/2026

Implementado no commit `89866fd` (branch `codex/secretary-annuality-corrections`): parcelas de planos anuais são avaliadas individualmente após o vencimento; o Financeiro geral consulta `/api/finance/overdue-installments` e lista cada responsável com quantidade, saldo e data da parcela mais antiga em atraso. A mesma regra considera a conta familiar inteira, incluindo dependentes.

O controle de acesso por QR passa a negar validação e check-in de sócios/dependentes com parcela de anuidade vencida sem recebimento confirmado, retornando código `OVERDUE_INSTALLMENTS` e a quantidade afetada. Cobranças únicas, reservas e visitantes não são incluídos nessa regra. A tela de portaria informa o bloqueio na validação; o Financeiro explica que a secretaria precisa confirmar o recebimento.

Validação: regras financeiras, API TypeScript e frontend TypeScript/Vite/PWA PASS; aviso não bloqueante de bundle acima de 500 kB permanece. Publicado no DEV `.98` em `89866fd767e3e510800788243bea4c119cae9f6a`, com health 200. Backup `/opt/apps/cisne/shared/backups/before-plan-first-20261016T000302Z`, dump SHA-256 `3920a243f5bab9ebe1c493aa129433ad2365ac8700bead97cff5a29094e76a82`, restauração/comparação PASS, sem migration; dados, `.env`, storage e demais serviços preservados. Produção permanece inalterada.
## Rótulo de anuidade pelo ano final — DEV, 16/10/2026

O sistema agora exibe somente o ano final: `Anuidade 2027` significa 01/11/2026 a 31/10/2027. Novas descrições usam esse formato; cobranças antigas com texto `2026/2027` são normalizadas na resposta da API para `Anuidade 2027`, preservando banco, datas, valores e histórico. Áreas ajustadas: escolha de modalidade, Financeiro da secretaria, Financeiro do associado, ficha financeira e mensagem de contato.

Commit `7c374d0d23978bfce2e54f5ea23c69cb21a02e11`, publicado no DEV `.98` com health 200. Backup `/opt/apps/cisne/shared/backups/before-plan-first-20261016T001311Z`, dump SHA-256 `0fd113e79ac3ba0fa60e30e70d0f467dc4583d04673a96a2135ea4277c329091`, restauração/comparação PASS, sem migration. Produção permanece inalterada.
