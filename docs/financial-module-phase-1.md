# Módulo de anuidades e gestão financeira — Fase 1

## Diagnóstico

O CISNE já possui um módulo financeiro integrado, não um sistema separado:

- `Member.titularMemberId` representa o vínculo titular/dependente.
- `resolveFinancialResponsibleMemberId()` centraliza a responsabilidade financeira no titular quando o associado é dependente.
- `FinancialCharge.responsibleMemberId` é a referência compartilhada para cobranças familiares.
- `FinancialPayment` registra pagamentos vinculados à cobrança, com valor, data, método e usuário registrador.
- `effectiveFinancialStatus()` deriva a situação a partir de vencimento, pagamentos e cancelamento.
- As rotas `/api/member/me/finance`, `/api/finance/charges` e `/api/finance/dashboard` já são reutilizadas pelo portal e pela administração.

Não existem ainda entidades persistentes específicas para temporada, plano de cobrança, parcela, alocação de pagamento ou auditoria financeira. A Fase 1 não cria migrations nem altera o banco operacional.

## O que foi implementado

- O dashboard financeiro passou a expor métricas derivadas de anuidades e grupos financeiros sem contar dependentes como cobranças independentes.
- A administração ganhou a área “Anuidades”, com temporadas e planos demonstrativos claramente identificados como Fase 1.
- A área do sócio ganhou a seção “Minha anuidade”, com situação familiar compartilhada, valor contratado, valor pago, saldo e progresso calculados a partir das cobranças existentes.
- A ficha do associado mantém o resumo financeiro existente e o contexto de responsabilidade familiar.
- A tela não cria pagamentos fictícios, parcelas reais ou bloqueios financeiros.

## Limites e decisões

- Os dados de temporada e planos exibidos na nova tela são fixtures visuais isoladas e não representam registros reais.
- O modelo atual de cobrança não deve ser interpretado como modelo definitivo de parcelas: `FinancialCharge` ainda representa uma cobrança genérica.
- O estado financeiro compartilhado continua sendo derivado por `responsibleMemberId`; dependentes não recebem cópias independentes da cobrança.
- A tolerância de 10 dias, temporada futura e elegibilidade de acesso não foram ativadas nesta fase.

## Próxima fase recomendada

Projetar e revisar antes de migrar:

1. temporadas versionadas e período configurável;
2. planos de pagamento e calendário de vencimentos;
3. anuidades vinculadas a um grupo financeiro;
4. parcelas com valor original, saldo, estado, pagamento e histórico;
5. alocação idempotente de pagamentos e estornos;
6. eventos de auditoria;
7. serviço único de elegibilidade por temporada, preservando bloqueios administrativos individuais;
8. endpoints administrativos e do associado baseados no mesmo serviço de domínio.

Qualquer migration futura deverá preservar as cobranças atuais, impedir duplicação para dependentes e ser acompanhada de backup, testes de vínculo histórico e validação integrada com o controle de acesso.
