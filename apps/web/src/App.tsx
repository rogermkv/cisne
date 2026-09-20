import { Bell, CalendarDays, CircleDollarSign, ShieldCheck, Tags, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getHealth } from './api/health'
import { useAuth } from './modules/core/auth/AuthProvider'
import { hasPermission } from './modules/core/auth/permissions'
import { LoginPage } from './modules/core/auth/LoginPage'
import { PasswordChangePage } from './modules/core/auth/PasswordChangePage'
import { AdminLayout, type AdminSection } from './modules/core/layout/AdminLayout'
import { MembersPage } from './modules/core/members/MembersPage'
import { MemberCategoriesPage } from './modules/core/members/MemberCategoriesPage'
import { AdminFinancePage } from './modules/core/finance/AdminFinancePage'
import { AdminReservationsPage } from './modules/core/reservations/AdminReservationsPage'
import { AdminCommunicationsPage } from './modules/core/communications/AdminCommunicationsPage'
import { AccessPage } from './modules/core/access/AccessPage'
import { MemberHome } from './modules/core/member-area/MemberHome'

const cards: Array<{ section: AdminSection; title: string; description: string; icon: any; tone: string; permission: string }> = [
  { section: 'members', title: 'Sócios', description: 'Gestão do quadro social', icon: Users, tone: 'teal', permission: 'members.view' },
  { section: 'categories', title: 'Tipos de Sócio', description: 'Modalidades e regras', icon: Tags, tone: 'teal', permission: 'members.manage' },
  { section: 'finance', title: 'Financeiro', description: 'Controle financeiro do clube', icon: CircleDollarSign, tone: 'gold', permission: 'finance.view' },
  { section: 'reservations', title: 'Reservas', description: 'Agenda dos espaços', icon: CalendarDays, tone: 'blue', permission: 'reservations.view' },
  { section: 'announcements', title: 'Avisos', description: 'Comunicados', icon: Bell, tone: 'coral', permission: 'announcements.view' },
  { section: 'access', title: 'Controle de Acesso', description: 'Entradas registradas', icon: ShieldCheck, tone: 'teal', permission: 'access.view' },
]
function Dashboard({ user, onNavigate }: any) { return <div className="page"><section className="welcome"><div><span className="eyebrow">Bem-vindo, {user?.name}</span><h1>Clube Ser Cisne</h1><p>Sistema de Gestão</p></div></section><section><div className="section-heading"><h2>Áreas do sistema</h2></div><div className="module-grid">{cards.map(({ section, title, description, icon: Icon, tone, permission }) => { const permitted = hasPermission(user, permission); return <article className={`module-card ${!permitted ? 'module-card--denied' : ''}`} key={section} onClick={() => permitted && onNavigate(section)}><div className={`module-card__icon module-card__icon--${tone}`}><Icon size={24} /></div><div><h3>{title}</h3><p>{description}</p></div><span className="module-card__tag">{permitted ? 'Abrir módulo' : 'Sem permissão'}</span></article> })}</div></section></div> }
function AdminPanel() { const { user, logout } = useAuth(); const [active, setActive] = useState<AdminSection>('dashboard'); const [health, setHealth] = useState<any>('checking'); useEffect(() => { getHealth().then((r) => setHealth(r.status === 'OK' ? 'online' : 'offline')).catch(() => setHealth('offline')) }, []); const back = () => setActive('dashboard'); const content = active === 'dashboard' ? <Dashboard user={user} onNavigate={setActive} /> : active === 'members' ? <MembersPage onBack={back} /> : active === 'categories' ? <MemberCategoriesPage onBack={back} /> : active === 'finance' ? <AdminFinancePage onBack={back} /> : active === 'reservations' ? <AdminReservationsPage onBack={back} /> : active === 'announcements' ? <AdminCommunicationsPage kind="announcements" onBack={back} /> : active === 'events' ? <AdminCommunicationsPage kind="events" onBack={back} /> : <AccessPage onBack={back} />; return <AdminLayout active={active} onNavigate={setActive} user={user} logout={logout} health={health}>{content}</AdminLayout> }
export function App() { const { user, loading } = useAuth(); if (loading) return <div className="auth-loading">Carregando sessão…</div>; if (!user) return <LoginPage />; if (user.roles.includes('SOCIO')) return <MemberHome onLogout={() => { sessionStorage.removeItem('cisne.accessToken'); window.location.reload() }} />; return user.mustChangePassword ? <PasswordChangePage /> : <AdminPanel /> }
