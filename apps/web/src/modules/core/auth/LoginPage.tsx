import { LockKeyhole, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ApiError } from '../../../api/client'
import { useAuth } from './AuthProvider'

const formatCpf = (value: string) => value.replace(/\D/g, '').slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')

export function LoginPage() {
  const { login } = useAuth(); const [cpf, setCpf] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [submitting, setSubmitting] = useState(false)
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setError(''); setSubmitting(true); try { await login(cpf, password) } catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : 'Não foi possível conectar à API.') } finally { setSubmitting(false) } }
  return <main className="login-page"><div className="login-orbit login-orbit-one"/><div className="login-orbit login-orbit-two"/><section className="login-card" aria-labelledby="login-title"><div className="login-brand"><img src="/cisne222.png" alt="Clube Ser Cisne" /><div><strong>Clube Ser Cisne</strong><span>Sistema de Gestão · Santa Rosa/RS</span></div></div><div className="login-heading"><span className="eyebrow">Acesso institucional</span><h1 id="login-title">Bem-vindo ao seu clube</h1><p>Entre com suas credenciais para acessar o painel administrativo.</p></div><form className="login-form" onSubmit={handleSubmit}><label><span>CPF</span><div className="input-field"><UserRound size={18} aria-hidden="true" /><input inputMode="numeric" pattern="[0-9.\- ]{11,14}" value={cpf} onChange={(event) => setCpf(formatCpf(event.target.value))} autoComplete="username" required /></div></label><label><span>Senha</span><div className="input-field"><LockKeyhole size={18} aria-hidden="true" /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></div></label>{error && <div className="form-error" role="alert">{error}</div>}<button className="login-button" type="submit" disabled={submitting}>{submitting ? 'Entrando…' : 'Entrar no painel'}</button></form><div className="login-footnote"><span>●</span> Ambiente seguro do Clube Ser Cisne</div></section></main>
}
