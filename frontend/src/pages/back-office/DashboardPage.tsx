import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'

function FlywheelLogo() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke="#2DBD7A" strokeWidth="2"/>
      <line x1="12" y1="3.5" x2="12" y2="12" stroke="#2DBD7A" strokeWidth="2" strokeLinecap="round"/>
      <line x1="19.07" y1="16.5" x2="12" y2="12" stroke="#2DBD7A" strokeWidth="2" strokeLinecap="round"/>
      <line x1="4.93" y1="16.5" x2="12" y2="12" stroke="#2DBD7A" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="2" fill="#2DBD7A"/>
    </svg>
  )
}

export default function DealerDashboardPage() {
  const { user, logout } = useAuth()

  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  async function handleCreateClient(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFeedback(null)
    try {
      await api.post('/auth/clients', { email, firstName, lastName })
      setFeedback({ type: 'success', msg: `Lien d'activation envoyé à ${email}` })
      setEmail(''); setFirstName(''); setLastName('')
      setShowForm(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFeedback({ type: 'error', msg: msg ?? 'Une erreur est survenue' })
    } finally {
      setLoading(false)
    }
  }

  const displayName = user?.email?.split('@')[0] ?? 'Concessionnaire'
  const initials = (user?.email ?? 'JP').slice(0, 2).toUpperCase()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--fw-bg)', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* TOP NAV */}
      <header style={{ height: 64, background: 'white', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', padding: '0 28px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 44 }}>
          <div style={{ width: 32, height: 32, background: 'var(--fw-sidebar)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FlywheelLogo />
          </div>
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 18, color: 'var(--fw-text)', letterSpacing: '-0.3px' }}>flywheel</span>
        </div>
        <nav style={{ display: 'flex', gap: 2, flex: 1 }}>
          <div style={{ padding: '7px 14px', borderRadius: 7, background: 'var(--fw-bg)', fontSize: 13, fontWeight: 600, color: 'var(--fw-text)' }}>Tableau de bord</div>
          <Link to="/back-office/fleet" style={{ padding: '7px 14px', borderRadius: 7, fontSize: 13, fontWeight: 500, color: 'var(--fw-text-2)', textDecoration: 'none' }}>Flotte</Link>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fw-text)' }}>{displayName}</div>
            <div style={{ fontSize: 11, color: 'var(--fw-text-2)' }}>{user?.email}</div>
          </div>
          <div onClick={logout} title="Déconnexion" style={{ width: 36, height: 36, background: 'var(--fw-sidebar)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 12, color: 'white', cursor: 'pointer' }}>
            {initials}
          </div>
        </div>
      </header>

      <div style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 22, color: 'var(--fw-text)', letterSpacing: '-0.3px' }}>Tableau de bord</div>
            <div style={{ fontSize: 12, color: 'var(--fw-text-2)', marginTop: 2 }}>Bienvenue — gérez vos clients et la flotte de véhicules.</div>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowForm(true)}
            style={{ fontSize: 13, fontWeight: 600, color: 'white', background: 'var(--fw-green)', border: 'none', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><line x1="12" y1="5" x2="12" y2="19" stroke="white" strokeWidth="2.5" strokeLinecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
            Ajouter un client
          </button>
        </div>

        {feedback && (
          <div style={{ padding: '10px 16px', borderRadius: 10, fontSize: 13, background: feedback.type === 'success' ? 'var(--fw-green-tint)' : 'var(--fw-danger-tint)', border: `1px solid ${feedback.type === 'success' ? '#a7f3d0' : '#fca5a5'}`, color: feedback.type === 'success' ? '#1A7A4A' : '#B01C1C' }}>
            {feedback.msg}
          </div>
        )}

        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { label: 'Véhicules en flotte', value: '—', sub: 'Total enregistrés', icon: '🚗' },
            { label: 'Alertes actives', value: '—', sub: 'Maintenance urgente', icon: '⚠️' },
            { label: 'Clients actifs', value: '—', sub: 'Comptes activés', icon: '👥' },
          ].map(({ label, value, sub, icon }) => (
            <div key={label} style={{ background: 'white', borderRadius: 12, padding: '18px 20px', boxShadow: 'var(--fw-shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--fw-text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</div>
                <span style={{ fontSize: 16 }}>{icon}</span>
              </div>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 30, color: 'var(--fw-text)', letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--fw-text-3)', marginTop: 6 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Link to="/back-office/fleet" style={{ background: 'white', borderRadius: 12, padding: '18px 22px', boxShadow: 'var(--fw-shadow-sm)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 46, height: 46, background: 'var(--fw-bg)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🚗</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--fw-text)', marginBottom: 3 }}>Gérer la flotte</div>
              <div style={{ fontSize: 12, color: 'var(--fw-text-2)' }}>Véhicules, assignations, alertes maintenance</div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--fw-green)', fontWeight: 500, flexShrink: 0 }}>Accéder →</div>
          </Link>
          <div onClick={() => setShowForm(true)} style={{ background: 'white', borderRadius: 12, padding: '18px 22px', boxShadow: 'var(--fw-shadow-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 46, height: 46, background: 'var(--fw-green-tint)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>👤</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--fw-text)', marginBottom: 3 }}>Inviter un client</div>
              <div style={{ fontSize: 12, color: 'var(--fw-text-2)' }}>Envoyer un lien d'activation par email</div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--fw-green)', fontWeight: 500, flexShrink: 0 }}>Inviter →</div>
          </div>
        </div>
      </div>

      {/* Add client modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,17,16,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(3px)' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, width: 500, boxShadow: '0 24px 64px rgba(0,0,0,0.22)', animation: 'fw-scaleIn 0.18s ease' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
              <div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 20, color: 'var(--fw-text)', letterSpacing: '-0.2px' }}>Ajouter un client</div>
                <div style={{ fontSize: 12, color: 'var(--fw-text-2)', marginTop: 3 }}>Un email d'activation sera envoyé automatiquement au client.</div>
              </div>
              <button onClick={() => setShowForm(false)} style={{ width: 32, height: 32, background: 'var(--fw-bg)', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={13} color="var(--fw-text)" />
              </button>
            </div>
            <form onSubmit={handleCreateClient} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fw-text)', display: 'block', marginBottom: 7 }}>Prénom</label>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jean"
                    style={{ width: '100%', fontSize: 13, color: 'var(--fw-text)', background: 'var(--fw-bg)', border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '10px 12px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fw-text)', display: 'block', marginBottom: 7 }}>Nom</label>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dupont"
                    style={{ width: '100%', fontSize: 13, color: 'var(--fw-text)', background: 'var(--fw-bg)', border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '10px 12px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fw-text)', display: 'block', marginBottom: 7 }}>Email *</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="client@exemple.fr"
                  style={{ width: '100%', fontSize: 13, color: 'var(--fw-text)', background: 'var(--fw-bg)', border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '10px 12px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ fontSize: 13, fontWeight: 500, color: 'var(--fw-text)', background: 'var(--fw-bg)', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer' }}>Annuler</button>
                <button type="submit" disabled={loading || !email} style={{ fontSize: 13, fontWeight: 600, color: 'white', background: 'var(--fw-green)', border: 'none', padding: '10px 22px', borderRadius: 8, cursor: 'pointer', opacity: loading || !email ? 0.6 : 1 }}>
                  {loading ? 'Envoi…' : "Envoyer l'invitation →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
