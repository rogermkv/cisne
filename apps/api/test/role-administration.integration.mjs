// Run only against a restored DEV clone. Credentials arrive via stdin, never in source/logs.
import assert from 'node:assert/strict'
import fs from 'node:fs'
const cfg=JSON.parse(fs.readFileSync(0,'utf8'))
assert.ok(cfg.cloneVerified===true && cfg.base==='http://127.0.0.1:3339' && (cfg.database.startsWith('cisne_roles_') || cfg.database.startsWith('cisne_activity_')),'Requires the explicit isolated clone fixture')
const api=async(path,{token,method='GET',body,status=200}={})=>{const response=await fetch(cfg.base+'/api'+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});assert.equal(response.status,status,`${method} ${path}`);return response.json()}
const login=async(a)=>(await api('/auth/login',{method:'POST',body:{cpf:a.cpf,password:a.password}})).token
const choose=async(token,role)=>(await api('/auth/role',{token,method:'POST',body:{role}})).token
const initial=await login(cfg.admin)
const me=(await api('/auth/me',{token:initial})).user;assert.equal(me.activeRole,null);assert.deepEqual(me.permissions,[])
await api('/members',{token:initial,status:403});await api('/auth/role',{token:initial,method:'POST',body:{role:'NOT_ASSIGNED'},status:403})
let admin=await choose(initial,'ADMIN')
assert.equal((await api('/auth/me',{token:admin})).user.activeRole,'ADMIN')
assert.deepEqual((await api('/administration/roles',{token:admin})).map(r=>r.name).sort(),['ADMIN','FUNCIONARIO','SECRETARIA','SOCIO'])
const users=await api('/administration/users',{token:admin});assert.ok(users.users.length<=25);assert.ok(users.users.every(u=>!('passwordHash' in u)))
const filtered=await api('/administration/users?role=ADMIN',{token:admin});assert.ok(filtered.users.every(u=>u.roles.includes('ADMIN')))
await api('/administration/users?role=INVALID',{token:admin,status:400})
const member=await login(cfg.member)
await api('/members',{token:member,status:403});await api('/reservations',{token:member,status:403});await api('/administration/roles',{token:member,status:403});await api('/member/me/finance',{token:member})
await api('/auth/role',{token:member,method:'POST',body:{role:'ADMIN'},status:403})
const secretary=await login(cfg.secretary);await api('/members',{token:secretary});await api('/administration/roles',{token:secretary,status:403});await api('/member-categories',{token:secretary,method:'POST',body:{name:'Forbidden'},status:403})
const update=async(id,roles,active=true,status=200)=>api('/administration/users/'+id,{token:admin,method:'PUT',body:{roles,active},status})
await update(cfg.admin.id,['SOCIO'],true,409);await update(cfg.admin.id,['ADMIN','SOCIO'],false,409)
await update(cfg.member.id,[],true,400);await update(cfg.member.id,['BAD'],true,400)
await update(cfg.member.id,['SOCIO','FUNCIONARIO'])
const employee=await choose(member,'FUNCIONARIO');assert.equal((await api('/auth/me',{token:employee})).user.activeRole,'FUNCIONARIO')
await api('/members',{token:employee});await api('/reservations',{token:employee});await api('/finance/charges',{token:employee,status:403});await api('/administration/users',{token:employee,status:403})
const personal=await choose(employee,'SOCIO');await api('/members',{token:personal,status:403});await api('/member/me',{token:personal})
await update(cfg.member.id,['SOCIO']);await api('/members',{token:employee,status:403});assert.equal((await api('/auth/me',{token:employee})).user.activeRole,null)
await update(cfg.member.id,['SOCIO'],false);await api('/auth/me',{token:personal,status:401});await update(cfg.member.id,['SOCIO'],true)
await update(cfg.member.id,['SOCIO','ADMIN'])
const secondAdmin=await choose(await login(cfg.member),'ADMIN')
// Concurrent self-demotions: transaction lock must leave exactly one active ADMIN.
const responses=await Promise.all([[admin,cfg.admin.id],[secondAdmin,cfg.member.id]].map(async([token,id])=>{const r=await fetch(cfg.base+'/api/administration/users/'+id,{method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({roles:['SOCIO'],active:true})});return r.status}))
assert.deepEqual(responses.sort(),[200,409])
let surviving=(await api('/auth/me',{token:admin})).user.activeRole==='ADMIN'?admin:secondAdmin
// Restore fixtures for UI tests, retaining all pre-existing assignments.
await api('/administration/users/'+cfg.admin.id,{token:surviving,method:'PUT',body:{roles:['ADMIN','SOCIO'],active:true}})
admin=await choose(await login(cfg.admin),'ADMIN');await update(cfg.member.id,['SOCIO'])
await api('/members/'+cfg.admin.memberId+'/access/toggle',{token:admin,method:'POST',body:{active:false},status:409})
const audit=await api('/administration/audit',{token:admin});assert.ok(audit.total>0);assert.ok(audit.records.some(r=>r.action==='ACCESS_UPDATED'));assert.ok(audit.records.some(r=>r.action==='ROLE_SELECTED'))
console.log(JSON.stringify({result:'PASS',checks:['multi-role login requires selection','unassigned role denied','single-role auto selection','effective permission isolation including reservation reads','ADMIN-only role and category management','grant and revoke FUNCIONARIO with immediate token revalidation','account deactivation invalidates session','last ADMIN protection and concurrent demotions','paginated users, role filtering and access audit']}))
