import type { FastifyInstance } from 'fastify'
import { database } from '../../../lib/prisma.js'
import { requestTransaction, requestFileEffects, type RequestFileEffects } from '../../../lib/request-transaction.js'
import { verifyAccessToken } from '../auth/jwt.js'
import { env } from '../../../config/env.js'
import { normalizeCpf } from '../auth/normalization.js'
const staff = ['ADMIN', 'SECRETARIA', 'FUNCIONARIO']
export function activityInfo(path: string, method: string) {
  const module = path.includes('/auth/') ? 'AUTH' : path.includes('member-categories') ? 'CATEGORIES' : path.includes('/members') && !path.includes('/annualities') ? 'MEMBERS' : path.includes('/finance') || path.includes('annual') ? 'FINANCE' : /reserv|spaces/.test(path) ? 'RESERVATIONS' : /visitor|invitation/.test(path) ? 'VISITORS' : /announcement|event/.test(path) ? 'COMMUNICATIONS' : path.includes('/administration') ? 'ADMINISTRATION' : path.includes('/access') ? 'ACCESS' : /media|photo/.test(path) ? 'MEDIA' : 'OTHER'
  const endings: Record<string,string> = {choose:'ANNUAL_PLAN_CHOOSE',reverse:'PAYMENT_REVERSE','reopen-settlement':'PAYMENT_REVERSE',approve:'APPROVE',reject:'REJECT',complete:'COMPLETE',toggle:'STATUS',block:'STATUS','check-in':'CHECK_IN','check-out':'CHECK_OUT','validate-credential':'VALIDATE_CREDENTIAL',generate:'GENERATE','generate-charges':'GENERATE'}
  const ending=path.split('/').pop()||''
  const action = path.endsWith('/access/toggle') ? 'ACCESS_UPDATE' : endings[ending] || (path.includes('/administration/users/') ? 'ACCESS_UPDATE' : path.endsWith('/auth/login') ? 'LOGIN' : path.endsWith('/auth/logout') ? 'LOGOUT' : path.endsWith('/auth/role') ? 'ROLE_CHANGE' : path.includes('reset-password') ? 'PASSWORD_RESET' : path.endsWith('/auth/password') ? 'PASSWORD_CHANGE' : path.includes('/payments') ? 'PAYMENT' : path.endsWith('/cancel') ? 'CANCEL' : path.endsWith('/status') ? 'STATUS' : /photo|upload/.test(path) ? 'MEDIA_CHANGE' : method === 'DELETE' ? 'DELETE' : method === 'POST' ? 'CREATE' : 'UPDATE')
  return { module, action }
}
const isMutation = (method: string) => ['POST','PUT','PATCH','DELETE'].includes(method)
async function actorFor(request: any) {
  let user = request.authUser
  if (!user) {
    const authorization = request.headers.authorization
    const payload = typeof authorization === 'string' && authorization.startsWith('Bearer ') ? verifyAccessToken(authorization.slice(7), env.jwtSecret) : null
    if (payload) {
      const stored = await database.user.findUnique({ where: { id: payload.sub }, select: { id: true, active: true, person: { select: { fullName: true } }, roles: { select: { role: { select: { name: true } } } } } })
      if (stored) {
        const roles = stored.roles.map(r=>r.role.name)
        user = { id: stored.id, name: stored.person.fullName, assignedRoles: roles, activeRole: payload.activeRole ? roles.includes(payload.activeRole) ? payload.activeRole : null : roles.length === 1 ? roles[0] : null, active: stored.active }
      }
    }
  }
  if (user) {
    const roles: string[] = user.assignedRoles || user.roles || []
    if (!roles.some(r=>staff.includes(r)) && !(roles.includes('SOCIO') && request.url.split('?')[0].includes('/annualities'))) return null
    return { actorId: user.id, actorName: user.name, actorRole: user.activeRole || null, assignedRoles: roles, authenticated: user.active !== false }
  }
  if (!request.routeOptions.url?.endsWith('/auth/login')) return null
  const cpf = normalizeCpf(request.body?.cpf)
  if (!cpf) return null
  const person = await database.person.findUnique({ where: { cpf }, select: { fullName: true, user: { select: { id: true, roles: { select: { role: { select: { name: true } } } } } } } })
  const roles = person?.user?.roles.map(r=>r.role.name) || []
  if (!person?.user || !roles.some(r=>staff.includes(r))) return null
  return { actorId: person.user.id, actorName: person.fullName, actorRole: roles.length === 1 ? roles[0] : null, assignedRoles: roles, authenticated: false }
}
function eventData(request: any, actor: NonNullable<Awaited<ReturnType<typeof actorFor>>>, status: string, statusCode: number) {
  const route = request.routeOptions.url || '/rota-nao-encontrada'
  const info = activityInfo(route,request.method)
  return { ...actor, ...info, route, method: request.method, targetId: typeof request.params?.id === 'string' ? request.params.id.slice(0,160) : null, status, statusCode,
    details: { requestId: request.id, ...(info.action === 'ACCESS_UPDATE' && Array.isArray(request.body?.roles) ? { roles: request.body.roles.filter((r:unknown) => typeof r==='string' && ['ADMIN','SECRETARIA','FUNCIONARIO','SOCIO'].includes(r)), ...(typeof request.body?.active==='boolean'?{active:request.body.active}:{}) } : {}), ...(info.action === 'ROLE_CHANGE' && ['ADMIN','SECRETARIA','FUNCIONARIO','SOCIO'].includes(request.body?.role) ? { selectedRole: request.body.role } : {}) } }
}
export function installActivityAuditing(app: FastifyInstance) {
  // Callback continuation preserves AsyncLocalStorage through inherited preHandlers,
  // route preHandlers, the handler and onSend, including legacy media transitions.
  app.addHook('preHandler', (request: any, reply, done) => {
    if (!isMutation(request.method)) { done(); return }
    void (async () => {
      const actor = await actorFor(request)
      if (!actor) { done(); return }
      const effects: RequestFileEffects = { commit: [], rollback: [] }
      let started = false
      const completed = database.$transaction(async tx => {
        const log = await tx.activityLog.create({ data: eventData(request,actor,'PENDING',0) })
        await tx.$executeRaw`SELECT set_config('cisne.activity_log_id', ${log.id}, true)`
        await new Promise<void>((resolve,reject) => {
          request.activityState = { tx, log, actor, effects, completed, resolve, reject, finalized: false }
          started = true
          reply.raw.once('close', () => {
            const state=request.activityState
            if (!state.finalized && !reply.raw.writableEnded) { state.reject(new Error('Client disconnected')); void state.completed.catch(()=>undefined) }
          })
          requestFileEffects.run(effects, () => requestTransaction.run(tx, () => done()))
        })
      }, { timeout: 60000, maxWait: 15000 })
      void completed.catch(async error => {
        if (!started) { done(error as Error); return }
        const state = request.activityState
        if (!state.finalized && reply.raw.destroyed) {
          state.finalized=true
          for (const effect of effects.rollback.reverse()) { try { await effect() } catch (cleanupError) { request.log.error({err:cleanupError},'Aborted file cleanup failed') } }
          try { await database.activityLog.create({ data:eventData(request,actor,'FAILED',499) }); request.activityRecorded=true } catch (logError) { request.log.error({err:logError},'Could not record disconnected activity') }
        }
      })
    })().catch(done)
  })
  app.addHook('onSend', async (request: any, reply, payload) => {
    const state=request.activityState
    if (!state || state.finalized) return payload
    state.finalized=true
    let code=reply.statusCode
    let successful=code<400
    try {
      if (successful) {
        const affected=await state.tx.activityChange.findFirst({where:{logId:state.log.id},orderBy:{sequence:'asc'},select:{label:true}})
        await state.tx.activityLog.update({ where:{id:state.log.id},data:{status:'SUCCESS',statusCode:code,authenticated:state.actor.authenticated||state.log.action==='LOGIN',details:{...state.log.details,...(affected?{targetLabel:affected.label}:{})}} })
        state.resolve()
        await state.completed
      } else {
        state.reject(new Error('Audited operation was not completed'))
        await state.completed.catch(()=>undefined)
      }
    } catch (error) {
      successful=false;code=500
      state.reject(error)
      await state.completed.catch(()=>undefined)
      reply.code(500).type('application/json')
      payload=JSON.stringify({message:'Não foi possível concluir a operação e registrar o histórico. Nenhuma alteração foi confirmada.'})
    }
    if (!successful) await database.activityLog.create({ data:eventData(request,state.actor,code<500?'BLOCKED':'FAILED',code) })
    request.activityRecorded=true
    for (const effect of successful?state.effects.commit:state.effects.rollback.reverse()) {
      try { await effect() } catch (error) { request.log.error({err:error},'Audited file cleanup failed') }
    }
    return payload
  })
  app.addHook('onResponse', async (request: any, reply) => {
    if (!isMutation(request.method) || reply.statusCode<400 || request.activityRecorded || request.activityState) return
    try {
      const actor=await actorFor(request)
      if (actor) await database.activityLog.create({data:eventData(request,actor,reply.statusCode<500?'BLOCKED':'FAILED',reply.statusCode)})
    } catch(error) { request.log.error({err:error},'Could not persist rejected activity event') }
  })
}
