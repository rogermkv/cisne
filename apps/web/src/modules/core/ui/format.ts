export const money = (value: unknown) => { const amount = Number(value); return Number.isFinite(amount) ? amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—' }
// Datas civis são armazenadas à meia-noite UTC; não deslocar para o dia anterior.
export const dateLabel = (value?: string | null) => { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) }
export const dateTimeLabel = (value?: string | null) => { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('pt-BR') }
export const localDateTime = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
export const memberStatus: Record<string, string> = { ACTIVE: 'Ativo', INACTIVE: 'Inativo', SUSPENDED: 'Suspenso', TERMINATED: 'Desligado' }
export const chargeStatus: Record<string, string> = { PAID: 'Pago', PENDING: 'Pendente', OVERDUE: 'Em atraso', CANCELLED: 'Cancelado' }
export const financialStatus: Record<string, string> = { PAID: 'Em dia', PENDING: 'Pendente', OVERDUE: 'Em atraso' }
export const reservationStatus: Record<string, string> = { REQUESTED: 'Pendente', APPROVED: 'Confirmada', REJECTED: 'Recusada', CANCELLED: 'Cancelada', COMPLETED: 'Concluída', PENDING: 'Pendente', CONFIRMED: 'Confirmada' }
export const invitationStatus: Record<string, string> = { SCHEDULED: 'Agendado', USED: 'Utilizado', CANCELLED: 'Cancelado', EXPIRED: 'Expirado' }
export const roleLabel: Record<string, string> = { ADMIN: 'Administrador', SECRETARIA: 'Secretaria', SOCIO: 'Sócio', FUNCIONARIO: 'Funcionário' }
export const paymentMethod: Record<string, string> = { PIX: 'Pix', CASH: 'Dinheiro', CREDIT_CARD: 'Cartão de crédito', DEBIT_CARD: 'Cartão de débito', BANK_TRANSFER: 'Transferência bancária', OTHER: 'Outro' }
