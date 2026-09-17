import { Bell, CalendarDays, CircleDollarSign, ShieldCheck, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getHealth } from './api/health'
import { useAuth } from './modules/core/auth/AuthProvider'
import { hasPermission } from './modules/core/auth/permissions'
import { LoginPage } from './modules/core/auth/LoginPage'
import { PasswordChangePage } from './modules/core/auth/PasswordChangePage'
import { AdminLayout, type AdminSection } from './modules/core/layout/AdminLayout'
import { MembersPage } from './modules/core/members/MembersPage'
import { AdminFinancePage } from './modules/core/finance/AdminFinancePage'
import { AdminReservationsPage } from './modules/core/reservations/AdminReservationsPage'
import { AdminCommunicationsPage } from './modules/core/communications/AdminCommunicationsPage'
import { AccessPage } from './modules/core/access/AccessPage'
import { MemberHome } from './modules/core/member-area/MemberHome'

type HealthState = 'checking' | 'online' | 'offline'
const cards: Array<{ section: AdminSection; title: string; description: string; icon: any; tone: string; permission: string }> = [
  { section: 'members', title: 'Sócios', description: 'Gestão do quadro social', icon: Users, tone: 'teal', permission: 'members.view' },
  { section: 'finance', title: 'Financeiro', description: 'Controle financeiro do clube', icon: CircleDollarSign, tone: 'gold', permission: 'finance.view' },
  { section: 'reservations', title: 'Reservas', description: 'Agenda dos espaços do clube', icon: CalendarDays, tone: 'blue', permission: 'reservations.view' },
  { section: 'announcements', title: 'Avisos', description: 'Comunicados para associados', icon: Bell, tone: 'coral', permission: 'announcements.view' },
  { section: 'events', title: 'Eventos', description: 'Agenda social do clube', icon: CalendarDays, tone: 'blue', permission: 'events.view' },
  { section: 'access', title: 'Controle de Acesso', description: 'Operação da portaria', icon: ShieldCheck, tone: 'teal', permission: 'access.view' },
]

function LoadingScreen() { return <div className="auth-loading" role="status">Carregando sessão…</div> }

function Dashboard({ user, onNavigate }: { user: any; onNavigate: (section: AdminSection) => void }) {
  return <div className="page"><section className="welcome" aria-labelledby="welcome-title"><div><span className="eyebrow">Bem-vindo, {user?.name}</span><h1 id="welcome-title">Clube Ser Cisne</h1><p>Sistema de Gestão</p></div><div className="welcome__detail" aria-hidden="true"><span>Santa Rosa</span><strong>RS</strong></div></section><section aria-labelledby="modules-title"><div className="section-heading"><div><span className="eyebrow">Estrutura preparada</span><h2 id="modules-title">Áreas do sistema</h2></div><span className="section-heading__note">Módulos disponíveis</span></div><div className="module-grid">{cards.map(({ section, title, description, icon: Icon, tone, permission }) => { const permitted = hasPermission(user, permission); return <article className={`module-card ${!permitted ? 'module-card--denied' : ''}`} key={section} onClick={() => permitted && onNavigate(section)}><div className={`module-card__icon module-card__icon--${tone}`}><Icon size={24} strokeWidth={1.8} /></div><div><h3>{title}</h3><p>{description}</p></div><span className="module-card__tag">{permitted ? 'Abrir módulo' : 'Sem permissão'}</span></article> })}</div></section></div>
}

function AdminPanel() {
  const { user, logout } = useAuth(); const [active, setActive] = useState<AdminSection>('dashboard'); const [health, setHealth] = useState<HealthState>('checking')
  useEffect(() => { const controller = new AbortController(); getHealth(controller.signal).then((response) => setHealth(response.status === 'OK' ? 'online' : 'offline')).catch(() => setHealth('offline')); return () => controller.abort() }, [])
  const content = active === 'dashboard' ? <Dashboard user={user} onNavigate={setActive} /> : active === 'members' ? <MembersPage onBack={() => setActive('dashboard')} /> : active === 'finance' ? <AdminFinancePage onBack={() => setActive('dashboard')} /> : active === 'reservations' ? <AdminReservationsPage onBack={() => setActive('dashboard')} /> : active === 'announcements' ? <AdminCommunicationsPage kind="announcements" onBack={() => setActive('dashboard')} /> : active === 'events' ? <AdminCommunicationsPage kind="events" onBack={() => setActive('dashboard')} /> : <AccessPage onBack={() => setActive('dashboard')} />
  return <AdminLayout active={active} onNavigate={setActive} user={user} logout={logout} health={health}>{content}</AdminLayout>
}

export function App() { const { user, loading } = useAuth(); if (loading) return <LoadingScreen />; if (!user) return <LoginPage />; if (user.roles.includes('SOCIO')) return <MemberHome onLogout={() => { sessionStorage.removeItem('cisne.accessToken'); window.location.reload() }} />; return user.mustChangePassword ? <PasswordChangePage /> : <AdminPanel /> }
