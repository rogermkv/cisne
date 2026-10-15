import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../../lib/prisma.js'
export const activityRoutes: FastifyPluginAsync = async app => {
  const admin = async (request:any,reply:any) => { await app.authenticate(request,reply);if(reply.sent)return;if(request.authUser?.activeRole!=='ADMIN')return reply.code(403).send({message:'Os logs são exclusivos do Administrador.'}) }
  app.get<{Querystring:{page?:string;q?:string;role?:string;module?:string;action?:string;status?:string;from?:string;to?:string}}>('/activity-logs',{preHandler:admin},async(request,reply)=>{
    const b=request.query;const page=Math.max(1,Math.min(100000,parseInt(b.page||'1',10)||1));const q=(b.q||'').trim().slice(0,100)
    const from=b.from?new Date(b.from):undefined;const to=b.to?new Date(b.to):undefined
    if((from&&!Number.isFinite(from.getTime()))||(to&&!Number.isFinite(to.getTime()))||(from&&to&&from>to))return reply.code(400).send({message:'Informe um período válido.'})
    const where={...(q?{actorName:{contains:q,mode:'insensitive' as const}}:{}),...(b.role?{OR:[{actorRole:b.role},{actorRole:null,assignedRoles:{has:b.role}}]}:{}),...(b.module?{module:b.module}:{}),...(b.action?{action:b.action}:{}),...(b.status?{status:b.status}:{}),...(from||to?{createdAt:{...(from?{gte:from}:{}),...(to?{lt:to}:{})}}:{})}
    const [total,records]=await prisma.$transaction([prisma.activityLog.count({where}),prisma.activityLog.findMany({where,orderBy:[{createdAt:'desc'},{id:'desc'}],skip:(page-1)*25,take:25,include:{_count:{select:{changes:true}}}})])
    return {total,page,pageSize:25,records}
  })
  app.get<{Params:{id:string};Querystring:{page?:string}}>('/activity-logs/:id/changes',{preHandler:admin},async(request,reply)=>{
    const log=await prisma.activityLog.findUnique({where:{id:request.params.id},select:{id:true}});if(!log)return reply.code(404).send({message:'Registro não encontrado.'})
    const page=Math.max(1,Math.min(100000,parseInt(request.query.page||'1',10)||1));const where={logId:log.id}
    const [total,changes]=await prisma.$transaction([prisma.activityChange.count({where}),prisma.activityChange.findMany({where,orderBy:{sequence:'asc'},skip:(page-1)*50,take:50})]);return {total,page,pageSize:50,changes}
  })
}
