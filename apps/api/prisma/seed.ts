import { PrismaClient } from '@prisma/client'

import { hashPassword } from '../src/modules/core/auth/password.js'
import { normalizeCpf } from '../src/modules/core/auth/normalization.js'

const prisma = new PrismaClient()

const permissionKeys = [
  'users.view',
  'users.manage',
  'members.view',
  'members.manage',
  'finance.view',
  'finance.manage',
  'reservations.view',
  'reservations.manage',
  'announcements.view',
  'announcements.manage',
  'events.view', 'events.manage',
  'access.view', 'access.manage',
  'visitors.view', 'visitors.manage',
] as const

const permissionsByRole: Record<string, readonly (typeof permissionKeys)[number][]> = {
  ADMIN: permissionKeys,
  SECRETARIA: [
    'users.view',
    'members.view',
    'members.manage',
    'finance.view',
    'finance.manage',
    'reservations.view',
    'reservations.manage',
    'announcements.view',
    'announcements.manage',
    'events.view', 'events.manage',
    'access.view', 'access.manage',
    'visitors.view', 'visitors.manage',
  ],
  FUNCIONARIO: [
    'members.view',
    'reservations.view',
    'reservations.manage',
    'announcements.view',
  ],
  SOCIO: ['reservations.view', 'announcements.view'],
}

const requiredEnv = (name: 'ADMIN_NAME' | 'ADMIN_CPF' | 'ADMIN_EMAIL' | 'ADMIN_PASSWORD') => {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} deve ser preenchida para executar o seed.`)
  return value
}

async function main() {
  const adminName = requiredEnv('ADMIN_NAME')
  const adminCpf = normalizeCpf(requiredEnv('ADMIN_CPF'))
  if (!adminCpf) throw new Error('ADMIN_CPF deve ser um CPF válido.')
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() || null
  const adminPassword = requiredEnv('ADMIN_PASSWORD')


  const permissions = await Promise.all(
    permissionKeys.map((key) =>
      prisma.permission.upsert({ where: { key }, update: {}, create: { key } }),
    ),
  )
  const permissionIds = new Map(permissions.map(({ id, key }) => [key, id]))

  for (const [name, rolePermissions] of Object.entries(permissionsByRole)) {
    const role = await prisma.role.upsert({ where: { name }, update: {}, create: { name } })

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
      prisma.rolePermission.createMany({
        data: rolePermissions.map((key) => ({
          roleId: role.id,
          permissionId: permissionIds.get(key)!,
        })),
      }),
    ])
  }

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'ADMIN' } })
  const passwordHash = await hashPassword(adminPassword)
  const person = await prisma.person.upsert({
    where: { cpf: adminCpf },
    update: { fullName: adminName, email: adminEmail },
    create: { fullName: adminName, cpf: adminCpf, email: adminEmail },
  })
  const admin = await prisma.user.upsert({
    where: { personId: person.id },
    update: { passwordHash, active: true, mustChangePassword: false },
    create: { personId: person.id, passwordHash, mustChangePassword: false },
  })

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  })

  for (const name of ['Patrimonial', 'Efetivo', 'Temporário', 'Correspondente', 'Veterano', 'Remido']) {
    await prisma.memberCategory.upsert({ where: { name }, update: { active: true }, create: { name } })
  }
  await prisma.clubSetting.upsert({ where: { id: 'club-default' }, update: {}, create: { id: 'club-default' } })
  const secretariaRole = await prisma.role.findUniqueOrThrow({ where: { name: 'SECRETARIA' } })
  const socioRole = await prisma.role.findUniqueOrThrow({ where: { name: 'SOCIO' } })
  const makePerson = (data: any) => prisma.person.upsert({ where: { cpf: data.cpf }, update: data, create: data })
  const secPerson = await makePerson({ id: 'person-secretaria-teste', fullName: 'Secretaria Teste', cpf: '15350946056', birthDate: new Date('1990-01-01T00:00:00Z'), phone: '55999990001', city: 'Santa Rosa' })
  const secUser = await prisma.user.upsert({ where: { personId: secPerson.id }, update: { passwordHash: await hashPassword('01011990'), mustChangePassword: false, active: true }, create: { personId: secPerson.id, passwordHash: await hashPassword('01011990'), mustChangePassword: false } })
  await prisma.userRole.upsert({ where: { userId_roleId: { userId: secUser.id, roleId: secretariaRole.id } }, update: {}, create: { userId: secUser.id, roleId: secretariaRole.id } })
  const socioPerson = await makePerson({ id: 'person-socio-teste', fullName: 'Sócio Teste', cpf: '11144477735', birthDate: new Date('1990-02-02T00:00:00Z'), phone: '55999990002', city: 'Santa Rosa' })
  const socioUser = await prisma.user.upsert({ where: { personId: socioPerson.id }, update: { passwordHash: await hashPassword('02021990'), mustChangePassword: false, active: true }, create: { personId: socioPerson.id, passwordHash: await hashPassword('02021990'), mustChangePassword: false } })
  await prisma.userRole.upsert({ where: { userId_roleId: { userId: socioUser.id, roleId: socioRole.id } }, update: {}, create: { userId: socioUser.id, roleId: socioRole.id } })
  const category = await prisma.memberCategory.findUniqueOrThrow({ where: { name: 'Patrimonial' } })
  const socioMember = await prisma.member.upsert({ where: { personId: socioPerson.id }, update: { status: 'ACTIVE', categoryId: category.id }, create: { personId: socioPerson.id, categoryId: category.id, admissionDate: new Date(), status: 'ACTIVE' } })
  for (const c of [
    { id: 'charge-socio-2025', year: 2025, status: 'PAID', due: '2025-01-10', paid: '2025-01-05' },
    { id: 'charge-socio-2026', year: 2026, status: 'PAID', due: '2026-01-10', paid: '2026-01-05' },
    { id: 'charge-socio-2027', year: 2027, status: 'PENDING', due: '2027-01-10', paid: null },
  ]) await prisma.financialCharge.upsert({ where: { id: c.id }, update: {}, create: { id: c.id, memberId: socioMember.id, responsibleMemberId: socioMember.id, type: 'ANNUAL_FEE', description: `Anuidade ${c.year}`, referenceYear: c.year, amount: 1600, dueDate: new Date(`${c.due}T00:00:00Z`), status: c.status as any, paidAt: c.paid ? new Date(`${c.paid}T00:00:00Z`) : null } })
  const dependentCategory = await prisma.memberCategory.upsert({ where: { name: 'Dependente' }, update: { active: true, isDependent: true, requiresHolder: true }, create: { id: 'category-dependent', name: 'Dependente', isDependent: true, requiresHolder: true } })
  const depPerson = await makePerson({ id: 'person-dependente-teste', fullName: 'Dependente Teste', cpf: '93541134780', birthDate: new Date('2010-03-03T00:00:00Z'), city: 'Santa Rosa' })
  await prisma.member.upsert({ where: { personId: depPerson.id }, update: { categoryId: dependentCategory.id, titularMemberId: socioMember.id, relationship: 'Filho(a)', status: 'ACTIVE' }, create: { id: 'member-dependente-teste', personId: depPerson.id, categoryId: dependentCategory.id, titularMemberId: socioMember.id, relationship: 'Filho(a)', admissionDate: new Date(), status: 'ACTIVE' } })
  const visitorPerson = await makePerson({ id: 'person-visitante-teste', fullName: 'Visitante Teste', cpf: '12345678909', phone: '55999990003', city: 'Santa Rosa' })
  const visitor = await prisma.visitor.upsert({ where: { personId: visitorPerson.id }, update: { active: true, blocked: false }, create: { personId: visitorPerson.id } })
  await prisma.visitorInvitation.upsert({ where: { id: 'invitation-visitante-teste-hoje' }, update: { status: 'SCHEDULED', scheduledDate: new Date() }, create: { id: 'invitation-visitante-teste-hoje', visitorId: visitor.id, sponsorMemberId: socioMember.id, scheduledDate: new Date(), status: 'SCHEDULED' } })
  const spaces = [
    { id: 'space-quiosque-1', name: 'Quiosque 1', description: 'Espaço externo com churrasqueira.', capacity: 20, price: 80 },
    { id: 'space-quiosque-2', name: 'Quiosque 2', description: 'Quiosque familiar para confraternizações.', capacity: 25, price: 100 },
    { id: 'space-salao-principal', name: 'Salão Principal', description: 'Salão amplo para eventos do clube.', capacity: 150, price: 300 },
    { id: 'space-tenis-1', name: 'Quadra de Tênis 1', description: 'Quadra esportiva do clube.', capacity: 4, price: 0 },
    { id: 'space-tenis-2', name: 'Quadra de Tênis 2', description: 'Quadra esportiva do clube.', capacity: 4, price: 0 },
  ]
  for (const s of spaces) await prisma.reservableSpace.upsert({ where: { id: s.id }, update: { ...s, active: true }, create: { ...s, active: true, requiresApproval: true } })
  const future = new Date(); future.setDate(future.getDate() + 7); future.setHours(0, 0, 0, 0)
  const later = new Date(); later.setDate(later.getDate() + 14); later.setHours(0, 0, 0, 0)
  await prisma.reservation.upsert({ where: { id: 'reservation-socio-aprovada' }, update: { memberId: socioMember.id, spaceId: 'space-quiosque-1', reservationDate: future, status: 'APPROVED', totalAmount: 80 }, create: { id: 'reservation-socio-aprovada', memberId: socioMember.id, spaceId: 'space-quiosque-1', reservationDate: future, status: 'APPROVED', totalAmount: 80, approvedAt: new Date() } })
  await prisma.reservation.upsert({ where: { id: 'reservation-socio-solicitada' }, update: { memberId: socioMember.id, spaceId: 'space-salao-principal', reservationDate: later, status: 'REQUESTED', totalAmount: 300 }, create: { id: 'reservation-socio-solicitada', memberId: socioMember.id, spaceId: 'space-salao-principal', reservationDate: later, status: 'REQUESTED', totalAmount: 300 } })
  const now = new Date(); const tomorrow = new Date(now.getTime()+86400000); const nextMonth = new Date(now.getTime()+14*86400000)
  const announcements = [
    { id:'announcement-piscina', title:'Manutenção da piscina', content:'Aviso demonstrativo: a piscina receberá manutenção programada.', startDate:new Date(now.getTime()-86400000), endDate:new Date(now.getTime()+7*86400000), audience:'ALL_MEMBERS' },
    { id:'announcement-horario', title:'Horário especial neste fim de semana', content:'O clube terá horário especial neste fim de semana.', startDate:new Date(now.getTime()-86400000), endDate:new Date(now.getTime()+5*86400000), audience:'ALL_MEMBERS' },
    { id:'announcement-assembleia', title:'Assembleia de associados', content:'Convocação demonstrativa para titulares do clube.', startDate:now, endDate:new Date(now.getTime()+30*86400000), audience:'HOLDERS_ONLY' },
  ]
  for (const a of announcements) await prisma.announcement.upsert({ where:{id:a.id}, update:a, create:{...a,active:true,createdByUserId:admin.id} })
  const events = [
    {id:'event-tenis-demo',title:'Torneio de Tênis',description:'Competição amistosa entre associados.',location:'Quadras de Tênis',startDateTime:tomorrow,memberPrice:0,guestPrice:30,capacity:40},
    {id:'event-jantar-demo',title:'Jantar do Clube',description:'Uma noite especial de confraternização.',location:'Salão Principal',startDateTime:nextMonth,memberPrice:80,guestPrice:120,capacity:150},
    {id:'event-social-demo',title:'Evento Social do Clube',description:'Encontro social para toda a família CISNE.',location:'Clube Ser Cisne',startDateTime:new Date(now.getTime()+21*86400000),memberPrice:0,guestPrice:0,capacity:200},
  ]
  for (const e of events) await prisma.clubEvent.upsert({where:{id:e.id},update:e,create:{...e,active:true,createdByUserId:admin.id}})
  await prisma.accessPoint.upsert({where:{id:'access-point-portaria-principal'},update:{name:'Portaria Principal',active:true},create:{id:'access-point-portaria-principal',name:'Portaria Principal',active:true}})

  if (process.env.NODE_ENV !== 'production') {
    const patrimonial = await prisma.memberCategory.findUniqueOrThrow({ where: { name: 'Patrimonial' } })
    const efetivo = await prisma.memberCategory.findUniqueOrThrow({ where: { name: 'Efetivo' } })
    const temporario = await prisma.memberCategory.findFirstOrThrow({ where: { name: { contains: 'Tempor' } } })
    const veterano = await prisma.memberCategory.findUniqueOrThrow({ where: { name: 'Veterano' } })
    const extras = [
      ['member-marcelo-pires','Marcelo Pires','43301467032','1983-06-12','55999112301','Patrimonial','ACTIVE','2018-03-12'],
      ['member-daniela-krause','Daniela Krause','54930390443','1987-11-24','55999223402','Patrimonial','ACTIVE','2021-07-05'],
      ['member-henrique-machado','Henrique Machado','83767879000','1979-03-05','55999334503','Efetivo','ACTIVE','2016-02-18'],
      ['member-camila-bertoldo','Camila Bertoldo','91313417645','1992-08-17','55999445604','Efetivo','SUSPENDED','2020-09-01'],
      ['member-paulo-viana','Paulo Viana','00683408690','1985-12-09','55999556705','Temporário','ACTIVE','2023-12-10'],
      ['member-sergio-klein','Sérgio Klein','11952871433','1965-01-30','55999667806','Veterano','ACTIVE','2005-04-15'],
    ]
    const members:any[]=[]
    for (const [id,name,cpf,birth,phone,cat,status,admission] of extras) { const person=await prisma.person.upsert({where:{cpf},update:{fullName:name,birthDate:new Date(`${birth}T00:00:00Z`),phone,city:'Santa Rosa'},create:{id:`person-${id}`,fullName:name,cpf,birthDate:new Date(`${birth}T00:00:00Z`),phone,city:'Santa Rosa'}}); const category=cat==='Patrimonial'?patrimonial:cat==='Efetivo'?efetivo:cat==='Veterano'?veterano:temporario; const member=await prisma.member.upsert({where:{personId:person.id},update:{categoryId:category.id,status:status as any,admissionDate:new Date(`${admission}T00:00:00Z`)},create:{id,personId:person.id,categoryId:category.id,status:status as any,admissionDate:new Date(`${admission}T00:00:00Z`)}});members.push({name,member,person}) }
    const depData=[['dep-roger-lucas','Lucas Almeida','76587057217','2012-04-14','roger'],['dep-roger-marina','Marina Almeida','19169841349','2015-09-22','roger'],['dep-marcelo-sofia','Sofia Pires','23750284148','2011-02-08','marcelo'],['dep-marcelo-rafael','Rafael Pires','29110675418','2014-07-19','marcelo']]
    // O demo pode ser executado em uma base que ainda não possua Róger Herpich.
    // Nesse caso criamos somente o titular administrativo (sem User/login) para
    // que os dependentes solicitados tenham sempre um vínculo válido.
    const rogerPerson = await prisma.person.upsert({
      where: { cpf: '52998224725' },
      update: { fullName: 'Róger Herpich', city: 'Santa Rosa' },
      create: { id: 'person-roger-herpich', fullName: 'Róger Herpich', cpf: '52998224725', city: 'Santa Rosa' },
    })
    const roger=await prisma.member.upsert({
      where: { personId: rogerPerson.id },
      update: { categoryId: patrimonial.id, status: 'ACTIVE' },
      create: { id: 'member-roger-herpich', personId: rogerPerson.id, categoryId: patrimonial.id, admissionDate: new Date(), status: 'ACTIVE' },
    })
    const marcelo=members.find(x=>x.name==='Marcelo Pires')
    for(const [id,name,cpf,birth,holder] of depData){const hm=holder==='roger'?roger:marcelo?.member;if(!hm)continue;const p=await prisma.person.upsert({where:{cpf},update:{fullName:name,birthDate:new Date(`${birth}T00:00:00Z`),city:'Santa Rosa'},create:{id:`person-${id}`,fullName:name,cpf,birthDate:new Date(`${birth}T00:00:00Z`),city:'Santa Rosa'}});await prisma.member.upsert({where:{personId:p.id},update:{categoryId:dependentCategory.id,titularMemberId:hm.id,relationship:'Filho(a)',status:'ACTIVE'},create:{id,personId:p.id,categoryId:dependentCategory.id,titularMemberId:hm.id,relationship:'Filho(a)',admissionDate:new Date(`${birth}T00:00:00Z`),status:'ACTIVE'}})}
    const charges=[['charge-marcelo-2027','Marcelo Pires','2027-03-12','PENDING'],['charge-daniela-2027','Daniela Krause','2027-07-05','PENDING'],['charge-henrique-2027','Henrique Machado','2027-02-18','PENDING'],['charge-camila-2026','Camila Bertoldo','2026-08-01','OVERDUE'],['charge-paulo-2026','Paulo Viana','2026-12-10','PENDING']]
    for(const [id,name,due,status] of charges){const x=members.find(m=>m.name===name);if(x)await prisma.financialCharge.upsert({where:{id},update:{status:status as any,dueDate:new Date(`${due}T00:00:00Z`),amount:1600,responsibleMemberId:x.member.id},create:{id,memberId:x.member.id,responsibleMemberId:x.member.id,type:'ANNUAL_FEE',description:`Anuidade ${due.slice(0,4)}`,referenceYear:Number(due.slice(0,4)),amount:1600,dueDate:new Date(`${due}T00:00:00Z`),status:status as any}})}
    const ap=await prisma.accessPoint.findUniqueOrThrow({where:{id:'access-point-portaria-principal'}});const entries=[['access-marcelo','Marcelo Pires','2026-09-14T18:22:00Z'],['access-daniela','Daniela Krause','2026-09-13T10:15:00Z'],['access-henrique','Henrique Machado','2026-09-15T19:10:00Z'],['access-paulo','Paulo Viana','2026-09-12T16:40:00Z'],['access-sergio','Sérgio Klein','2026-09-11T09:05:00Z']];for(const [id,name,when] of entries){const x=members.find(m=>m.name===name);if(x)await prisma.accessEvent.upsert({where:{id},update:{occurredAt:new Date(when)},create:{id,personId:x.person.id,accessPointId:ap.id,type:'ENTRY',method:'MANUAL',occurredAt:new Date(when)}})}
  }

  console.log(`Seed concluído. Administrador configurado: ${adminEmail ?? 'sem email'}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
