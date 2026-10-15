import { AsyncLocalStorage } from 'node:async_hooks'
import type { Prisma } from '@prisma/client'
export const requestTransaction = new AsyncLocalStorage<Prisma.TransactionClient>()
export type RequestFileEffects = { commit: Array<() => Promise<void>>; rollback: Array<() => Promise<void>> }
export const requestFileEffects = new AsyncLocalStorage<RequestFileEffects>()
export async function afterTransactionCommit(action: () => Promise<void>): Promise<void> {
  const effects = requestFileEffects.getStore()
  if (effects) effects.commit.push(action)
  else await action()
}
export function onTransactionRollback(action: () => Promise<void>): void { requestFileEffects.getStore()?.rollback.push(action) }
