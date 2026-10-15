# Anuidades por temporada e pagamento

Implementação disponível no DEV; envio ao repositório oficial e publicação em produção explicitamente autorizados pelo usuário. Ver PROJECT_STATE.md e cisne-annual-payment-plans-dev.json para evidências e SHAs.

Temporadas de1º de novembro a31 de outubro, identificadas pelos dois anos. Exemplo2026/2027:01/11/2026–31/10/2027.

| Modalidade | Calendário do exemplo | Controle |
| --- | --- | --- |
| A — Adiantamento em12x | 10/04/2026 a10/03/2027 |12 parcelas PIX, comprovantes e conferência da secretaria |
| B — Cartão em até10x | Cobrança integral até10/11/2026 | Solicitação de link por WhatsApp identificado; parcelamento externo da operadora |
| C — PIX à vista | Cobrança integral até10/11/2026 | PIX, comprovante e contato da secretaria |
| D — PIX ou boleto em4x |10/11/2026,10/12/2026,10/01/2027,10/02/2027 |4 parcelas; secretaria anexa boleto em cada uma |

O titular escolhe diretamente pelo Meu Financeiro após conferir o calendário completo. Dependentes compartilham a conta familiar e podem enviar comprovantes. Escolhas repetidas não duplicam parcelas. Mudanças de modalidade após adesão precisam ser tratadas com a secretaria; fluxo automatizado de renegociação não faz parte desta entrega.

Apenas a Secretaria confirma pagamentos das novas anuidades. Envio de comprovante não quita nem suspende atraso. No dia11, a parcela em aberto fica em atraso segundo o dia civil de Brasília. Pagamentos parciais mantêm saldo; aprovação e registro simultâneos são protegidos contra duplicidade. Comprovantes podem ser recusados com motivo e reenviados. PDFs e imagens de até5MB ficam em storage privado; downloads requerem acesso à família ou permissão financeira administrativa.

Em Anuidades, Secretaria altera PIX, favorecido e WhatsApp. Os dados comerciais fornecidos pelo clube foram configurados. Administração cadastra valor/temporada e abre ou encerra escolhas; valor contratado fica congelado após primeira adesão. A temporada2026/2027 inicial usa a taxa já configurada no clube e não gera cobranças para todos os sócios automaticamente.

Financeiro geral e ficha do sócio mostram anexos e conferência nas cobranças expandidas. Só a Secretaria anexa/substitui boletos do plano D; versões anteriores permanecem registradas. Emissão bancária é externa. PIX é transferência externa e cartão é operado externamente. Links WhatsApp apenas abrem a conversa com texto de identificação; não enviam mensagens automaticamente.

Uma anuidade anterior única, sem pagamentos e com mesmo ano/valor, é cancelada e substituída dentro da mesma transação ao escolher o plano. Anuidades quitadas, com pagamentos, múltiplos lançamentos ou valor diferente exigem conciliação e permanecem intactas. Novas parcelas não podem ser alteradas/canceladas individualmente para evitar descaracterizar o contrato.

Banco: quatro tabelas novas, duas colunas nullable nas cobranças existentes, métodoBOLETO. Todas as alterações financeiras e de configuração ficam nos LOGS; comprovantes e boletos possuem autoria/instantes e vínculo de aprovação ao recebimento. Senhas, tokens e chaves privadas não foram versionados. Configuração de recebimento é informação comercial pública, não autorização de débito/acesso bancário.

Testes integrados passaram em PostgreSQL restaurado dos ambientes DEV e produção, com operações somente em clones e identidades sintéticas. Publicação DEV não gerou adesões, pagamentos ou comprovantes reais. Publicação em produção autorizada e preparada pelo pipeline oficial, sem editar produção manualmente.
