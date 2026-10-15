import { PrismaClient } from '@prisma/client'
import { requestTransaction } from './request-transaction.js'
export const database = new PrismaClient()
// Existing callback and array transactions join the enclosing audited request transaction.
export const prisma = new Proxy(database, {
  get(target, property) {
    const transaction = requestTransaction.getStore()
    if (transaction && property === '$transaction') return async (input: any) => typeof input === 'function' ? input(transaction) : Promise.all(input)
    const client: any = transaction || target
    const value = Reflect.get(client, property, client)
    return typeof value === 'function' ? value.bind(client) : value
  },
})
