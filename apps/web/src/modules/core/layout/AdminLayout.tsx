import { RoleSwitcher } from '../auth/RoleSelection'
import { roleLabel } from '../ui/format'
import { Bell, CalendarDays, CalendarRange, CircleDollarSign, Home, LogOut, Menu, Settings, ShieldCheck, UserRound, Users, X, Tags, UserRoundCheck } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { hasPermission } from '../auth/permissions'

export type AdminSection = 'dashboard' | 'members' | 'logs' | 'administration' | 'finance' | 'annualities' | 'reservations' | 'reservation-spaces' | 'announcements' | 'events' | 'visitors' | 'access'
type Props = { children: ReactNode; active: AdminSection; onNavigate: (section: AdminSection) => void; user: any; logout: () => void; health: 'checking' | 'online' | 'offline' }
type NavItem = { key: AdminSection; label: string; icon: any; permission?: string; children?: NavItem[] }
const items: NavItem[] = [
  { key: 'dashboard', label: 'Visão geral', icon: Home },
  { key: 'members', label: 'Sócios', icon: Users, permission: 'members.view' },
  { key: 'logs', label: 'LOGS', icon: ShieldCheck, permission: 'users.manage' },
  { key: 'administration', label: 'Painel Administrativo', icon: Tags, permission: 'users.manage' },
  { key: 'finance', label: 'Financeiro', icon: CircleDollarSign, permission: 'finance.view' },
  { key: 'annualities', label: 'Anuidades', icon: CalendarRange, permission: 'finance.view' },
  { key: 'reservations', label: 'Reservas', icon: CalendarDays, permission: 'reservations.view', children: [{ key: 'reservation-spaces', label: 'Gerenciar espaços', icon: Settings, permission: 'reservations.manage' }] },
  { key: 'announcements', label: 'Avisos', icon: Bell, permission: 'announcements.view' },
  { key: 'events', label: 'Eventos', icon: CalendarDays, permission: 'events.view' },
  { key: 'visitors', label: 'Visitantes', icon: UserRoundCheck, permission: 'visitors.view' },
  { key: 'access', label: 'Controle de Acesso', icon: ShieldCheck, permission: 'access.view' },
]

export function AdminLayout({ children, active, onNavigate, user, logout, health }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = (section: AdminSection) => { setMenuOpen(false); onNavigate(section) }
  return <div className="app-shell"><aside className={`sidebar ${menuOpen ? 'sidebar--open' : ''}`}><div className="brand"><img src="/cisne222.png" alt="Clube Ser Cisne" className="brand__mark" /><div><strong>Clube Ser Cisne</strong><span>Santa Rosa · RS</span></div><button className="icon-button sidebar__close" type="button" aria-label="Fechar menu" onClick={() => setMenuOpen(false)}><X size={21} /></button></div><nav className="sidebar__nav" aria-label="Navegação principal"><span className="nav-label">Menu principal</span>{items.map(({ key, label, icon: Icon, permission, children }) => { const permitted = !permission || hasPermission(user, permission); const childActive = children?.some(child => active === child.key); return <div className={children ? 'nav-group' : undefined} key={key}><button className={`nav-item ${active === key || childActive ? 'nav-item--active' : ''}`} type="button" disabled={!permitted} title={!permitted ? 'Sem permissão' : label} onClick={() => navigate(key)}><Icon size={20} strokeWidth={1.8} /><span>{label}</span>{!permitted && <small>Sem acesso</small>}</button>{permitted && children?.length ? <div className="nav-subitems" aria-label={`${label}: opções`}>{children.filter(child => !child.permission || hasPermission(user, child.permission)).map(child => { const ChildIcon = child.icon; return <button className={`nav-item nav-item--subitem ${active === child.key ? 'nav-item--active' : ''}`} type="button" key={child.key} title={child.label} onClick={() => navigate(child.key)}><ChildIcon size={17} strokeWidth={1.8} /><span>{child.label}</span></button> })}</div> : null}</div> })}</nav><div className="sidebar__footer"><ShieldCheck size={19} /><div><strong>Ambiente administrativo</strong><span>{user?.roles?.map((role: string) => roleLabel[role] || 'Usuário').join(' · ')}</span></div></div></aside>{menuOpen && <button className="backdrop" type="button" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />}
    <div className="main-content"><header className="topbar"><button className="icon-button menu-button" type="button" aria-label="Abrir menu" onClick={() => setMenuOpen(true)}><Menu size={23} /></button><div className="topbar__title"><strong>Painel administrativo</strong><span>Clube Ser Cisne</span></div><div className={`api-status api-status--${health}`} role="status"><span className="api-status__dot" />{health === 'checking' ? 'Verificando sistema' : health === 'online' ? 'Sistema disponível' : 'Sistema indisponível'}</div><RoleSwitcher /><div className="user-menu"><UserRound size={18} /><span>{user?.name}</span><button type="button" onClick={logout} title="Sair"><LogOut size={17} /><span>Sair</span></button></div></header>{children}</div>
  </div>
}
