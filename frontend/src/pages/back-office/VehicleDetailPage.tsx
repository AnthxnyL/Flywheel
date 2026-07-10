import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { X, Plus, Link2, Link2Off } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import MaintenancePlanDealer from '../../components/MaintenancePlanDealer'

interface MileageRecord {
  id: string
  mileage: number
  recordedAt: string
  note: string | null
  recordedBy: { id: string; email: string; role: string } | null
}

interface VehicleDetail {
  id: string
  vin: string
  brand: string
  model: string
  year: number | null
  licensePlate: string | null
  mileage: number
  initialMileage: number
  driverId: string | null
  driver: { id: string; email: string } | null
  createdAt: string
  contracts: { id: string; type: string; startDate: string; endDate: string; mileageLimit: number }[]
  maintenanceRecords: { id: string; date: string; type: string; cost: number }[]
  mileageRecords: MileageRecord[]
}

interface Client {
  id: string
  email: string
  emailVerified: boolean
}

const MOCK_VISITS = [
  { id: '1', date: '2024-11-12', type: 'Révision annuelle', technician: 'Marc Durand', km: 28400, notes: 'Vidange + filtre à huile + filtre habitacle', cost: 189 },
  { id: '2', date: '2024-07-03', type: 'Contrôle freins', technician: 'Sophie Martin', km: 22100, notes: 'Plaquettes avant changées', cost: 142 },
  { id: '3', date: '2024-01-18', type: 'Remplacement pneumatiques', technician: 'Marc Durand', km: 17300, notes: 'Pneus hiver → pneus été (4 roues)', cost: 480 },
  { id: '4', date: '2023-09-05', type: 'Révision annuelle', technician: 'Pierre Lefebvre', km: 12800, notes: 'Vidange + points de contrôle', cost: 165 },
]

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

type Tab = 'fiche' | 'kilometrage' | 'passages' | 'plan'

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('fiche')

  const [showAssign, setShowAssign] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState('')
  const [assigning, setAssigning] = useState(false)

  const [showMileage, setShowMileage] = useState(false)
  const [mileageValue, setMileageValue] = useState('')
  const [mileageNote, setMileageNote] = useState('')
  const [addingMileage, setAddingMileage] = useState(false)

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  async function loadVehicle() {
    try {
      const res = await api.get<VehicleDetail>(`/vehicles/${id}`)
      setVehicle(res.data)
    } catch {
      navigate('/back-office/fleet')
    } finally {
      setLoading(false)
    }
  }

  async function loadClients() {
    const res = await api.get<Client[]>('/auth/clients')
    setClients(res.data)
  }

  useEffect(() => { loadVehicle(); loadClients() }, [id])

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedDriver) return
    setAssigning(true); setFeedback(null)
    try {
      await api.post(`/vehicles/${id}/assign`, { driverId: selectedDriver })
      setFeedback({ type: 'success', msg: 'Véhicule assigné avec succès.' })
      setShowAssign(false); setSelectedDriver(''); loadVehicle()
    } catch {
      setFeedback({ type: 'error', msg: "Impossible d'assigner ce véhicule." })
    } finally { setAssigning(false) }
  }

  async function handleUnassign() {
    if (!confirm('Désassigner ce véhicule de son client ?')) return
    setFeedback(null)
    try {
      await api.delete(`/vehicles/${id}/assign`)
      setFeedback({ type: 'success', msg: 'Véhicule désassigné.' }); loadVehicle()
    } catch {
      setFeedback({ type: 'error', msg: 'Impossible de désassigner ce véhicule.' })
    }
  }

  async function handleAddMileage(e: React.FormEvent) {
    e.preventDefault()
    if (!mileageValue) return
    setAddingMileage(true); setFeedback(null)
    try {
      await api.post(`/vehicles/${id}/mileage`, { mileage: parseInt(mileageValue), note: mileageNote || undefined })
      setFeedback({ type: 'success', msg: 'Relevé de kilométrage enregistré.' })
      setShowMileage(false); setMileageValue(''); setMileageNote(''); loadVehicle()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFeedback({ type: 'error', msg: msg ?? "Erreur lors de l'enregistrement." })
    } finally { setAddingMileage(false) }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--fw-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--fw-text-2)' }}>Chargement…</span>
      </div>
    )
  }
  if (!vehicle) return null

  const availableClients = clients.filter(c => c.emailVerified)
  const contract = vehicle.contracts[0] ?? null
  const mileagePercent = contract ? Math.min(100, Math.round((vehicle.mileage / contract.mileageLimit) * 100)) : null
  const initials = (user?.email ?? 'JP').slice(0, 2).toUpperCase()
  const driverInitials = vehicle.driver?.email?.slice(0, 2).toUpperCase() ?? '?'

  const TABS: { key: Tab; label: string }[] = [
    { key: 'fiche', label: 'Fiche véhicule' },
    { key: 'kilometrage', label: 'Kilométrage' },
    { key: 'passages', label: 'Passages réseau' },
    { key: 'plan', label: "Plan d'entretien" },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--fw-bg)', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* TOP NAV — breadcrumb style (maquette 1d) */}
      <header style={{ height: 64, background: 'white', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', padding: '0 28px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 32 }}>
          <div style={{ width: 32, height: 32, background: 'var(--fw-sidebar)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FlywheelLogo />
          </div>
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 18, color: 'var(--fw-text)', letterSpacing: '-0.3px' }}>flywheel</span>
        </div>
        {/* Breadcrumb inline dans le nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <Link to="/back-office/fleet" style={{ fontSize: 13, color: 'var(--fw-text-2)', textDecoration: 'none' }}>Flotte</Link>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#ADADAF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fw-text)' }}>{vehicle.brand} {vehicle.model}</span>
          {vehicle.licensePlate && (
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--fw-text-3)', background: 'var(--fw-bg)', padding: '2px 8px', borderRadius: 4 }}>{vehicle.licensePlate}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fw-text)' }}>{user?.email?.split('@')[0]}</div>
            <div style={{ fontSize: 11, color: 'var(--fw-text-2)' }}>{user?.email}</div>
          </div>
          <div onClick={logout} title="Déconnexion" style={{ width: 36, height: 36, background: 'var(--fw-sidebar)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 12, color: 'white', cursor: 'pointer' }}>
            {initials}
          </div>
        </div>
      </header>

      <div style={{ padding: '20px 28px 0' }}>

        {feedback && (
          <div style={{ marginBottom: 14, padding: '10px 16px', borderRadius: 10, fontSize: 13, background: feedback.type === 'success' ? 'var(--fw-green-tint)' : 'var(--fw-danger-tint)', border: `1px solid ${feedback.type === 'success' ? '#a7f3d0' : '#fca5a5'}`, color: feedback.type === 'success' ? '#1A7A4A' : '#B01C1C' }}>
            {feedback.msg}
          </div>
        )}

        {/* ROW 1 — Hero + Client (maquette 1d layout) */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.5fr', gap: 12, marginBottom: 12 }}>

          {/* Hero card avec photo placeholder SVG (stripe pattern comme maquette) */}
          <div style={{ background: 'white', borderRadius: 12, boxShadow: 'var(--fw-shadow-sm)', display: 'flex', height: 188, overflow: 'hidden' }}>
            {/* Photo placeholder */}
            <div style={{ width: 220, position: 'relative', flexShrink: 0 }}>
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', inset: 0 }} preserveAspectRatio="xMidYMid slice">
                <defs><pattern id="sp-det" patternUnits="userSpaceOnUse" width="24" height="24" patternTransform="rotate(45)"><rect width="12" height="24" fill="rgba(0,0,0,0.022)"/></pattern></defs>
                <rect width="100%" height="100%" fill="#F5F4F2"/>
                <rect width="100%" height="100%" fill="url(#sp-det)"/>
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(0,0,0,0.22)', textAlign: 'center' }}>photo véhicule</div>
              </div>
              <div style={{ position: 'absolute', top: 0, right: 0, width: 50, height: '100%', background: 'linear-gradient(to right, transparent, white)' }} />
            </div>
            {/* Infos */}
            <div style={{ flex: 1, padding: '18px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 22, color: 'var(--fw-text)', letterSpacing: '-0.3px', marginBottom: 2 }}>{vehicle.brand} {vehicle.model}</div>
                <div style={{ fontSize: 13, color: 'var(--fw-text-2)', marginBottom: 16 }}>{vehicle.year ? `${vehicle.year} · ` : ''}Ajouté le {new Date(vehicle.createdAt).toLocaleDateString('fr-FR')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  {[
                    { l: 'VIN', v: vehicle.vin, mono: true },
                    { l: 'Immatriculation', v: vehicle.licensePlate ?? '—', mono: true },
                    { l: 'Kilométrage', v: `${vehicle.mileage.toLocaleString('fr-FR')} km`, mono: true },
                    { l: 'Km initial', v: `${vehicle.initialMileage.toLocaleString('fr-FR')} km`, mono: true },
                    { l: 'Contrat', v: contract ? `${contract.type} · Actif` : '—', green: !!contract },
                    { l: 'Expire', v: contract ? new Date(contract.endDate).toLocaleDateString('fr-FR') : '—' },
                  ].map(({ l, v, mono, green }) => (
                    <div key={l}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fw-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{l}</div>
                      <div style={{ fontFamily: mono ? "'JetBrains Mono', monospace" : undefined, fontSize: mono ? 11 : 12, color: green ? 'var(--fw-green)' : 'var(--fw-text)', fontWeight: green ? 500 : undefined, wordBreak: 'break-all' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Client card */}
          <div style={{ background: 'white', borderRadius: 12, padding: '18px 20px', boxShadow: 'var(--fw-shadow-sm)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--fw-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>Client assigné</div>
              {vehicle.driver ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 40, height: 40, background: '#D4EDE0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#1A7A4A', flexShrink: 0 }}>{driverInitials}</div>
                  <div>
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--fw-text)', marginBottom: 1 }}>{vehicle.driver.email.split('@')[0]}</div>
                    <div style={{ fontSize: 12, color: 'var(--fw-text-2)' }}>{vehicle.driver.email}</div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--fw-text-2)', marginBottom: 14 }}>Aucun client assigné à ce véhicule.</div>
              )}
            </div>
            {vehicle.driver ? (
              <button onClick={handleUnassign} style={{ width: '100%', fontSize: 12, fontWeight: 500, color: 'var(--fw-danger)', background: 'var(--fw-danger-tint)', border: 'none', padding: '9px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Link2Off size={13} /> Désassigner
              </button>
            ) : (
              <button onClick={() => setShowAssign(true)} style={{ width: '100%', fontSize: 12, fontWeight: 600, color: 'var(--fw-text)', background: 'var(--fw-bg)', border: 'none', padding: '9px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Link2 size={13} /> Assigner un client
              </button>
            )}
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: '9px 16px', fontSize: 13, fontWeight: tab === t.key ? 600 : 500, color: tab === t.key ? 'var(--fw-text)' : 'var(--fw-text-2)', background: 'none', border: 'none', cursor: 'pointer', borderBottom: tab === t.key ? '2px solid var(--fw-green)' : '2px solid transparent', marginBottom: -1 }}>
              {t.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          {tab === 'fiche' && (
            <Link to={`/back-office/fleet/${vehicle.id}/logbook`} style={{ fontSize: 12, fontWeight: 500, color: 'var(--fw-green)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5, padding: '9px 4px' }}>
              Carnet de vie →
            </Link>
          )}
        </div>
      </div>

      {/* TAB CONTENT */}
      <div style={{ padding: '14px 28px 40px' }}>

        {/* ── FICHE ── inspirée maquette 1d row 2 */}
        {tab === 'fiche' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.6fr 1.3fr', gap: 12 }}>

            {/* Kilométrage sparkline */}
            <div style={{ background: 'white', borderRadius: 12, padding: '18px 20px', boxShadow: 'var(--fw-shadow-sm)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--fw-text)' }}>Kilométrage</div>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 500, color: 'var(--fw-text)', letterSpacing: '-0.5px', lineHeight: 1 }}>
                  {vehicle.mileage.toLocaleString('fr-FR')} <span style={{ fontSize: 13, color: 'var(--fw-text-2)', fontWeight: 400 }}>km</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--fw-text-2)', marginTop: 3 }}>+{(vehicle.mileage - vehicle.initialMileage).toLocaleString('fr-FR')} km depuis le début</div>
              </div>
              {/* Sparkline */}
              <svg width="100%" height="52" viewBox="0 0 200 52" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                <defs><linearGradient id="spgrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2DBD7A" stopOpacity="0.14"/><stop offset="100%" stopColor="#2DBD7A" stopOpacity="0"/></linearGradient></defs>
                <path d="M0,52 L40,44 L80,35 L120,24 L160,15 L200,8 L200,52 Z" fill="url(#spgrad)"/>
                <path d="M0,52 L40,44 L80,35 L120,24 L160,15 L200,8" stroke="#2DBD7A" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="200" cy="8" r="3.5" fill="#2DBD7A"/>
              </svg>
              {contract && mileagePercent !== null && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--fw-text-2)', marginBottom: 5 }}>
                    <span>Contrat {contract.type} · {contract.mileageLimit.toLocaleString('fr-FR')} km max</span>
                    <span style={{ fontWeight: 600, color: mileagePercent >= 90 ? 'var(--fw-danger)' : mileagePercent >= 70 ? 'var(--fw-warning)' : 'var(--fw-green)' }}>{mileagePercent}%</span>
                  </div>
                  <div style={{ background: 'var(--fw-bg)', borderRadius: 100, height: 5, overflow: 'hidden' }}>
                    <div style={{ height: 5, borderRadius: 100, width: `${mileagePercent}%`, background: mileagePercent >= 90 ? 'var(--fw-danger)' : mileagePercent >= 70 ? 'var(--fw-warning)' : 'var(--fw-green)' }} />
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fw-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Historique</div>
                {vehicle.mileageRecords.slice(0, 4).map(r => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--fw-text)' }}>{r.mileage.toLocaleString('fr-FR')} km</span>
                    <span style={{ fontSize: 11, color: 'var(--fw-text-3)' }}>{new Date(r.recordedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: '2-digit', year: '2-digit' })}</span>
                  </div>
                ))}
                {vehicle.mileageRecords.length === 0 && <div style={{ fontSize: 11, color: 'var(--fw-text-3)' }}>Aucun relevé.</div>}
              </div>
            </div>

            {/* Plan d'entretien — grid 2×2 (maquette 1d) */}
            <div style={{ background: 'white', borderRadius: 12, padding: '18px 20px', boxShadow: 'var(--fw-shadow-sm)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--fw-text)' }}>Plan d'entretien</div>
                <button onClick={() => setTab('plan')} style={{ fontSize: 11, color: 'var(--fw-green)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>Modifier →</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, flex: 1 }}>
                {[
                  { label: 'Vidange huile', status: 'J-7 Urgent', date: '15 juil. 2025', km: '50 000', bg: 'var(--fw-warning-tint)', border: 'rgba(232,151,13,0.2)', badgeColor: '#8A5500', dot: 'var(--fw-warning)' },
                  { label: 'Contrôle freins', status: 'J+45', date: '20 août 2025', km: '55 000', bg: 'var(--fw-bg)', border: 'rgba(0,0,0,0.06)', badgeColor: 'var(--fw-text-2)', dot: '#F59E0B' },
                  { label: 'Révision 60 000 km', status: 'Planifié', date: '15 nov. 2025', km: '60 000', bg: 'var(--fw-info-tint)', border: 'rgba(46,111,219,0.15)', badgeColor: '#1A4FA0', dot: 'var(--fw-info)' },
                  { label: 'Filtres habitacle', status: '✓ Fait', date: '12 fév. 2025', km: '45 000', bg: 'var(--fw-green-tint)', border: 'rgba(45,189,122,0.2)', badgeColor: '#1A7A4A', dot: 'var(--fw-green)', done: true },
                ].map(({ label, status, date, km, bg, border, badgeColor, dot, done }) => (
                  <div key={label} style={{ background: bg, borderRadius: 10, padding: '13px 14px', border: `1px solid ${border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 9.5, fontWeight: 700, color: badgeColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{status}</span>
                      <div style={{ width: 7, height: 7, background: dot, borderRadius: '50%', opacity: done ? 0.5 : 1 }} />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: done ? 500 : 600, color: done ? 'var(--fw-text-2)' : 'var(--fw-text)', textDecoration: done ? 'line-through' : undefined, marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--fw-text-2)' }}>{date}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: 'var(--fw-text-2)' }}>{km} km</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Carnet de vie aperçu */}
            <div style={{ background: 'white', borderRadius: 12, padding: '18px 20px', boxShadow: 'var(--fw-shadow-sm)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--fw-text)' }}>Carnet de vie</div>
                <Link to={`/back-office/fleet/${vehicle.id}/logbook`} style={{ fontSize: 11, color: 'var(--fw-green)', fontWeight: 500, textDecoration: 'none' }}>Tout voir →</Link>
              </div>
              {vehicle.maintenanceRecords.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--fw-text-2)' }}>Aucune intervention enregistrée.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {vehicle.maintenanceRecords.slice(0, 4).map((r, i) => (
                    <div key={r.id} style={{ display: 'flex', gap: 9, padding: '8px 0', borderBottom: i < Math.min(vehicle.maintenanceRecords.length, 4) - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                      <div style={{ width: 28, height: 28, background: 'var(--fw-bg)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13 }}>🔧</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--fw-text)' }}>{r.type}</div>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: 'var(--fw-text-2)', marginTop: 1 }}>{r.cost.toFixed(0)} €</div>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: 'var(--fw-text-3)', marginTop: 1 }}>{new Date(r.date).toLocaleDateString('fr-FR')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── KILOMÉTRAGE ── */}
        {tab === 'kilometrage' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { label: 'Kilométrage initial', value: `${vehicle.initialMileage.toLocaleString('fr-FR')} km` },
                { label: 'Kilométrage actuel', value: `${vehicle.mileage.toLocaleString('fr-FR')} km` },
                { label: 'Parcourus', value: `+${(vehicle.mileage - vehicle.initialMileage).toLocaleString('fr-FR')} km` },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'white', borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--fw-shadow-sm)' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--fw-text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 22, color: 'var(--fw-text)' }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ background: 'white', borderRadius: 12, boxShadow: 'var(--fw-shadow-sm)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center' }}>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--fw-text)' }}>Historique des relevés</div>
                <button onClick={() => { setMileageValue(String(vehicle.mileage)); setShowMileage(true) }}
                  style={{ fontSize: 12, fontWeight: 600, color: 'white', background: 'var(--fw-green)', border: 'none', padding: '7px 14px', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Plus size={12} /> Nouveau relevé
                </button>
              </div>
              {vehicle.mileageRecords.length === 0 ? (
                <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--fw-text-2)' }}>Aucun relevé enregistré.</div>
              ) : vehicle.mileageRecords.map((r, i) => (
                <div key={r.id} style={{ padding: '12px 20px', borderBottom: i < vehicle.mileageRecords.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 15, color: 'var(--fw-text)', minWidth: 110 }}>{r.mileage.toLocaleString('fr-FR')} km</div>
                  <div style={{ flex: 1 }}>
                    {r.note && <div style={{ fontSize: 12, color: 'var(--fw-text-2)' }}>{r.note}</div>}
                    {r.recordedBy && <div style={{ fontSize: 11, color: 'var(--fw-text-3)', marginTop: 2 }}>{r.recordedBy.role === 'DEALER' ? 'Concessionnaire' : 'Client'} · {r.recordedBy.email}</div>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fw-text-3)', flexShrink: 0 }}>{new Date(r.recordedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PASSAGES RÉSEAU ── */}
        {tab === 'passages' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, fontSize: 13, color: 'var(--fw-text-2)' }}>{MOCK_VISITS.length} passages en réseau</div>
              <span className="fw-badge fw-badge-info">Données mockées</span>
            </div>
            <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--fw-shadow-sm)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 130px 80px 80px', padding: '10px 20px', background: '#FAFAF9', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                {['Date', 'Intervention', 'Technicien', 'Km', 'Coût'].map(h => (
                  <div key={h} style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--fw-text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</div>
                ))}
              </div>
              {MOCK_VISITS.map((v, i) => (
                <div key={v.id} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 130px 80px 80px', padding: '14px 20px', borderBottom: i < MOCK_VISITS.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', alignItems: 'start' }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--fw-text-2)' }}>{new Date(v.date).toLocaleDateString('fr-FR')}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fw-text)', marginBottom: 3 }}>{v.type}</div>
                    <div style={{ fontSize: 11, color: 'var(--fw-text-2)' }}>{v.notes}</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fw-text)' }}>{v.technician}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--fw-text-2)' }}>{v.km.toLocaleString('fr-FR')}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: 'var(--fw-text)' }}>{v.cost} €</div>
                </div>
              ))}
            </div>
            <div style={{ background: 'white', borderRadius: 12, padding: '14px 20px', boxShadow: 'var(--fw-shadow-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fw-text-2)' }}>Total dépensé</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 18, color: 'var(--fw-text)' }}>{MOCK_VISITS.reduce((s, v) => s + v.cost, 0)} €</span>
            </div>
          </div>
        )}

        {/* ── PLAN D'ENTRETIEN ── */}
        {tab === 'plan' && (
          <MaintenancePlanDealer vehicleId={vehicle.id} currentMileage={vehicle.mileage} />
        )}
      </div>

      {/* Mileage modal */}
      {showMileage && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,17,16,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(3px)' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 30, width: 460, boxShadow: '0 24px 64px rgba(0,0,0,0.22)', animation: 'fw-scaleIn 0.18s ease' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 18, color: 'var(--fw-text)' }}>Nouveau relevé kilométrique</div>
                <div style={{ fontSize: 12, color: 'var(--fw-text-2)', marginTop: 2 }}>Actuel : {vehicle.mileage.toLocaleString('fr-FR')} km</div>
              </div>
              <button onClick={() => { setShowMileage(false); setMileageValue(''); setMileageNote('') }} style={{ width: 30, height: 30, background: 'var(--fw-bg)', border: 'none', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} color="var(--fw-text)" /></button>
            </div>
            <form onSubmit={handleAddMileage} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fw-text)', display: 'block', marginBottom: 6 }}>Kilométrage (km) *</label>
                <input type="number" min={vehicle.mileage} value={mileageValue} onChange={e => setMileageValue(e.target.value)} required placeholder={String(vehicle.mileage)}
                  style={{ width: '100%', fontSize: 14, fontFamily: "'JetBrains Mono', monospace", color: 'var(--fw-text)', background: 'var(--fw-bg)', border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '10px 12px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fw-text)', display: 'block', marginBottom: 6 }}>Note (optionnel)</label>
                <input type="text" value={mileageNote} onChange={e => setMileageNote(e.target.value)} placeholder="Ex : révision annuelle, passage atelier…"
                  style={{ width: '100%', fontSize: 13, color: 'var(--fw-text)', background: 'var(--fw-bg)', border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '10px 12px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
                <button type="button" onClick={() => { setShowMileage(false); setMileageValue(''); setMileageNote('') }} style={{ fontSize: 13, fontWeight: 500, color: 'var(--fw-text)', background: 'var(--fw-bg)', border: 'none', padding: '10px 18px', borderRadius: 8, cursor: 'pointer' }}>Annuler</button>
                <button type="submit" disabled={addingMileage || !mileageValue} style={{ fontSize: 13, fontWeight: 600, color: 'white', background: 'var(--fw-green)', border: 'none', padding: '10px 18px', borderRadius: 8, cursor: 'pointer', opacity: addingMileage || !mileageValue ? 0.6 : 1 }}>
                  {addingMileage ? 'Enregistrement…' : 'Enregistrer →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign modal */}
      {showAssign && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,17,16,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(3px)' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 30, width: 460, boxShadow: '0 24px 64px rgba(0,0,0,0.22)', animation: 'fw-scaleIn 0.18s ease' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 18, color: 'var(--fw-text)' }}>Assigner un client</div>
                <div style={{ fontSize: 12, color: 'var(--fw-text-2)', marginTop: 2 }}>Sélectionnez le client à rattacher à ce véhicule.</div>
              </div>
              <button onClick={() => { setShowAssign(false); setSelectedDriver('') }} style={{ width: 30, height: 30, background: 'var(--fw-bg)', border: 'none', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} color="var(--fw-text)" /></button>
            </div>
            <form onSubmit={handleAssign} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {availableClients.length === 0 ? (
                <div style={{ padding: '12px 14px', background: 'var(--fw-warning-tint)', borderRadius: 8, fontSize: 13, color: '#8A5500' }}>Aucun client activé disponible.</div>
              ) : (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fw-text)', display: 'block', marginBottom: 6 }}>Client *</label>
                  <select value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)} required
                    style={{ width: '100%', fontSize: 13, color: 'var(--fw-text)', background: 'var(--fw-bg)', border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '10px 12px', outline: 'none', boxSizing: 'border-box' }}>
                    <option value="">Choisir un client…</option>
                    {availableClients.map(c => <option key={c.id} value={c.id}>{c.email}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowAssign(false); setSelectedDriver('') }} style={{ fontSize: 13, fontWeight: 500, color: 'var(--fw-text)', background: 'var(--fw-bg)', border: 'none', padding: '10px 18px', borderRadius: 8, cursor: 'pointer' }}>Annuler</button>
                <button type="submit" disabled={assigning || !selectedDriver} style={{ fontSize: 13, fontWeight: 600, color: 'white', background: 'var(--fw-green)', border: 'none', padding: '10px 18px', borderRadius: 8, cursor: 'pointer', opacity: assigning || !selectedDriver ? 0.6 : 1 }}>
                  {assigning ? 'Assignation…' : 'Confirmer →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
