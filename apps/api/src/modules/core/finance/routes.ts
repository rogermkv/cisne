// @ts-nocheck
import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../../lib/prisma.js'
const serialize=(c:any)=>({...c,amount:Number(c.amount)})
export const financeRoutes:FastifyPluginAsync=async app=>{
 app.get('/member/me/finance',{preHandler:app.authenticate},async(req,reply)=>{const u=await prisma.user.findUnique({where:{id:req.authUser!.id},include:{person:{include:{member:{include:{charges:{orderBy:{dueDate:'desc'}}}}}}}});const m=u?.person.member;if(!m)return reply.code(403).send({message:'Área disponível apenas para associados.'});const settings=await prisma.clubSetting.findFirstOrThrow();const charges=m.charges.map(serialize);const next=charges.find((c:any)=>c.status==='PENDING'||c.status==='OVERDUE');return {status:charges.some((c:any)=>c.status==='OVERDUE')?'OVERDUE':next?'PENDING':'PAID',nextCharge:next,history:charges,settings:{annualFeeAmount:Number(settings.annualFeeAmount),paymentModes:settings.annualFeePaymentModes.split(',')}}})
 app.get('/finance/charges',{preHandler:app.requirePermission('finance.view')},async(req:any)=>{const rows=await prisma.financialCharge.findMany({include:{member:{include:{person:true}}},where:req.query?.status?{status:req.query.status}:undefined,orderBy:{dueDate:'desc'}});return rows.map((c:any)=>({...serialize(c),member:{...c.member,person:{...c.member.person,cpfMasked:`${c.member.person.cpf.slice(0,3)}.***.***-**`}}}))})
}
