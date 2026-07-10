import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import MaintenancePlanDriver from '../../components/MaintenancePlanDriver'
import NotificationSettings from '../../components/NotificationSettings'
import LogbookDriver from './LogbookPage'
import Invoices from '../../components/Invoices'
import { registerServiceWorker } from '../../services/push'
import { X } from 'lucide-react'

interface MileageRecord {
  id: string
  mileage: number
  recordedAt: string
  note: string | null
}

interface Vehicle {
  id: string
  vin: string
  brand: string
  model: string
  year: number | null
  licensePlate: string | null
  mileage: number
  initialMileage: number
  contracts: { id: string; type: string; startDate: string; endDate: string; mileageLimit: number }[]
  maintenanceRecords: { id: string; date: string; type: string; cost: number }[]
  mileageRecords: MileageRecord[]
}

type NavItem = 'dashboard' | 'plan' | 'logbook' | 'settings'


function FlywheelIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke="white" strokeWidth="2"/>
      <line x1="12" y1="3.5" x2="12" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <line x1="19.07" y1="16.5" x2="12" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <line x1="4.93" y1="16.5" x2="12" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="2" fill="white"/>
    </svg>
  )
}

function SidebarIcon({ active, badge, children }: { active?: boolean; badge?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', marginBottom: 4 }}>
      {active && <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 26, background: 'var(--fw-green)', borderRadius: '0 2px 2px 0' }} />}
      <div style={{ width: 42, height: 42, borderRadius: 10, background: active ? 'rgba(45,189,122,0.14)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
        {children}
        {badge && <div style={{ position: 'absolute', top: 8, right: 8, width: 7, height: 7, background: 'var(--fw-danger)', borderRadius: '50%', border: '2px solid #111110' }} />}
      </div>
    </div>
  )
}

export default function DriverDashboardPage() {
  const { user, logout } = useAuth()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [navItem, setNavItem] = useState<NavItem>('dashboard')

  const [showMileage, setShowMileage] = useState(false)
  const [mileageValue, setMileageValue] = useState('')
  const [mileageNote, setMileageNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [mileageError, setMileageError] = useState<string | null>(null)
  const [mileageSuccess, setMileageSuccess] = useState(false)

  useEffect(() => { registerServiceWorker().catch(() => null) }, [])

  async function loadVehicles() {
    api.get<Vehicle[]>('/vehicles/mine')
      .then(res => setVehicles(res.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadVehicles() }, [])

  const vehicle = vehicles[0] ?? null
  const contract = vehicle?.contracts[0] ?? null
  const mileagePercent = contract ? Math.min(100, Math.round((vehicle!.mileage / contract.mileageLimit) * 100)) : null
  const daysLeft = contract ? Math.max(0, Math.ceil((new Date(contract.endDate).getTime() - Date.now()) / 86400000)) : null
  const initials = (user?.email ?? 'DR').slice(0, 2).toUpperCase()
  const firstName = user?.email?.split('@')[0] ?? 'Conducteur'

  async function handleAddMileage(e: React.FormEvent) {
    e.preventDefault()
    if (!vehicle || !mileageValue) return
    setSubmitting(true); setMileageError(null)
    try {
      await api.post(`/vehicles/${vehicle.id}/mileage`, { mileage: parseInt(mileageValue), note: mileageNote || undefined })
      setMileageSuccess(true); setShowMileage(false); setMileageValue(''); setMileageNote('')
      loadVehicles()
      setTimeout(() => setMileageSuccess(false), 4000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setMileageError(msg ?? "Erreur lors de l'enregistrement.")
    } finally { setSubmitting(false) }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Inter', system-ui, sans-serif", overflow: 'hidden' }}>

      {/* ── SIDEBAR SOMBRE 64px (maquette 1b) ── */}
      <div style={{ width: 64, background: '#111110', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '18px 0', flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ width: 38, height: 38, background: 'var(--fw-green)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 30, flexShrink: 0 }}>
          <FlywheelIcon />
        </div>

        {/* Nav icons */}
        <SidebarIcon active={navItem === 'dashboard'}>
          <div onClick={() => setNavItem('dashboard')}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
              <path d="M3 13H21" stroke={navItem === 'dashboard' ? '#2DBD7A' : 'rgba(255,255,255,0.3)'} strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M5 13V17a1 1 0 001 1h12a1 1 0 001-1v-4" stroke={navItem === 'dashboard' ? '#2DBD7A' : 'rgba(255,255,255,0.3)'} strokeWidth="1.5"/>
              <path d="M5.5 13L7.5 7h9l2 6" stroke={navItem === 'dashboard' ? '#2DBD7A' : 'rgba(255,255,255,0.3)'} strokeWidth="1.5" strokeLinejoin="round"/>
              <circle cx="8.5" cy="18.5" r="1.5" fill={navItem === 'dashboard' ? '#2DBD7A' : 'rgba(255,255,255,0.3)'}/>
              <circle cx="15.5" cy="18.5" r="1.5" fill={navItem === 'dashboard' ? '#2DBD7A' : 'rgba(255,255,255,0.3)'}/>
            </svg>
          </div>
        </SidebarIcon>

        <SidebarIcon active={navItem === 'logbook'}>
          <div onClick={() => setNavItem('logbook')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="8" height="8" rx="1.5" stroke={navItem === 'logbook' ? '#2DBD7A' : 'rgba(255,255,255,0.3)'} strokeWidth="1.5"/>
              <rect x="13" y="3" width="8" height="8" rx="1.5" stroke={navItem === 'logbook' ? '#2DBD7A' : 'rgba(255,255,255,0.3)'} strokeWidth="1.5"/>
              <rect x="3" y="13" width="8" height="8" rx="1.5" stroke={navItem === 'logbook' ? '#2DBD7A' : 'rgba(255,255,255,0.3)'} strokeWidth="1.5"/>
              <rect x="13" y="13" width="8" height="8" rx="1.5" stroke={navItem === 'logbook' ? '#2DBD7A' : 'rgba(255,255,255,0.3)'} strokeWidth="1.5"/>
            </svg>
          </div>
        </SidebarIcon>

        <SidebarIcon active={navItem === 'plan'} badge>
          <div onClick={() => setNavItem('plan')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 9c0-3.3-2.7-6-6-6S6 5.7 6 9v4.5L4.5 15h15L18 13.5V9Z" stroke={navItem === 'plan' ? '#2DBD7A' : 'rgba(255,255,255,0.3)'} strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M10.5 19.5a1.5 1.5 0 003 0" stroke={navItem === 'plan' ? '#2DBD7A' : 'rgba(255,255,255,0.3)'} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </SidebarIcon>

        <SidebarIcon active={navItem === 'settings'}>
          <div onClick={() => setNavItem('settings')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" stroke={navItem === 'settings' ? '#2DBD7A' : 'rgba(255,255,255,0.3)'} strokeWidth="1.5"/>
              <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke={navItem === 'settings' ? '#2DBD7A' : 'rgba(255,255,255,0.3)'} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </SidebarIcon>

        <div style={{ flex: 1 }} />
        {/* User avatar */}
        <div onClick={logout} title="Déconnexion" style={{ width: 36, height: 36, background: 'var(--fw-green)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 12, color: 'white', cursor: 'pointer', marginBottom: 18, flexShrink: 0 }}>
          {initials}
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, background: 'var(--fw-bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top breadcrumb */}
        <div style={{ padding: '20px 28px 0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12, color: 'var(--fw-text-2)' }}>
            Mon espace <span style={{ margin: '0 5px', opacity: 0.4 }}>/</span>
            <span style={{ color: 'var(--fw-text)', fontWeight: 600 }}>{navItem === 'dashboard' ? 'Mon Véhicule' : navItem === 'logbook' ? 'Carnet de vie' : navItem === 'plan' ? "Plan d'entretien" : 'Paramètres'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fw-text)' }}>{firstName}</span>
            <div style={{ width: 30, height: 30, background: 'var(--fw-green)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 11, color: 'white' }}>{initials}</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 28px 28px' }}>

          {/* ── PLAN D'ENTRETIEN view ── */}
          {navItem === 'plan' && vehicle && <MaintenancePlanDriver vehicleId={vehicle.id} />}

          {/* ── CARNET view ── */}
          {navItem === 'logbook' && vehicle && <LogbookDriver vehicleId={vehicle.id} />}

          {/* ── SETTINGS view ── */}
          {navItem === 'settings' && <NotificationSettings />}

          {/* ── DASHBOARD view ── */}
          {navItem === 'dashboard' && (
            loading ? (
              <div style={{ textAlign: 'center', paddingTop: 60, fontSize: 13, color: 'var(--fw-text-2)' }}>Chargement…</div>
            ) : !vehicle ? (
              <div style={{ background: 'white', borderRadius: 14, padding: '40px 24px', textAlign: 'center', boxShadow: 'var(--fw-shadow-sm)', marginTop: 20 }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🚗</div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 16, color: 'var(--fw-text)', marginBottom: 6 }}>Aucun véhicule assigné</div>
                <div style={{ fontSize: 13, color: 'var(--fw-text-2)' }}>Contactez votre concessionnaire pour associer un véhicule.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                {mileageSuccess && (
                  <div style={{ padding: '10px 16px', borderRadius: 10, fontSize: 13, background: 'var(--fw-green-tint)', border: '1px solid #a7f3d0', color: '#1A7A4A' }}>
                    Relevé kilométrique enregistré avec succès.
                  </div>
                )}

                {/* ── HERO CARD (maquette 1b) ── */}
                <div style={{ background: 'white', borderRadius: 14, boxShadow: 'var(--fw-shadow-sm)', display: 'flex', height: 228, overflow: 'hidden' }}>
                  {/* Info left */}
                  <div style={{ flex: '0 0 390px', padding: '26px 30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--fw-text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>Mon Véhicule</div>
                      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 28, color: 'var(--fw-text)', letterSpacing: '-0.5px', lineHeight: 1.1, marginBottom: 3 }}>{vehicle.brand} {vehicle.model}</div>
                      {vehicle.year && <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500, fontSize: 15, color: 'var(--fw-text-2)', marginBottom: 18 }}>{vehicle.year}</div>}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--fw-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', width: 40 }}>VIN</span>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: 'var(--fw-text)', background: 'var(--fw-bg)', padding: '3px 10px', borderRadius: 6, letterSpacing: '0.04em' }}>{vehicle.vin}</span>
                        </div>
                        {vehicle.licensePlate && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--fw-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', width: 40 }}>Plaque</span>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--fw-text)', background: 'var(--fw-bg)', padding: '3px 12px', borderRadius: 6, letterSpacing: '0.1em', fontWeight: 500 }}>{vehicle.licensePlate}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {contract && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 7, height: 7, background: 'var(--fw-green)', borderRadius: '50%', animation: 'fw-blink 2s ease-in-out infinite' }} />
                        <span style={{ fontSize: 12, color: 'var(--fw-green)', fontWeight: 500 }}>{contract.type} · Expire le {new Date(contract.endDate).toLocaleDateString('fr-FR')}</span>
                      </div>
                    )}
                  </div>
                  {/* Photo placeholder stripe pattern */}
                  <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', inset: 0 }} preserveAspectRatio="xMidYMid slice">
                      <defs><pattern id="sp-drv" patternUnits="userSpaceOnUse" width="28" height="28" patternTransform="rotate(45)"><rect width="14" height="28" fill="rgba(0,0,0,0.022)"/></pattern></defs>
                      <rect width="100%" height="100%" fill="#F5F4F2"/>
                      <rect width="100%" height="100%" fill="url(#sp-drv)"/>
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'rgba(0,0,0,0.25)', fontWeight: 500 }}>{vehicle.brand} {vehicle.model}{vehicle.year ? ` — ${vehicle.year}` : ''}</div>
                    </div>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: 72, height: '100%', background: 'linear-gradient(to right, white, transparent)' }} />
                  </div>
                </div>

                {/* ── 3 KPI CARDS (maquette 1b) ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>

                  {/* Km */}
                  <div style={{ background: 'white', borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--fw-shadow-sm)' }}>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--fw-text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Kilométrage actuel</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 30, fontWeight: 500, color: 'var(--fw-text)', letterSpacing: '-0.5px', lineHeight: 1, marginBottom: 5 }}>
                      {vehicle.mileage.toLocaleString('fr-FR')} <span style={{ fontSize: 14, color: 'var(--fw-text-2)', fontWeight: 400 }}>km</span>
                    </div>
                    {mileagePercent !== null && (
                      <>
                        <div style={{ background: 'rgba(0,0,0,0.06)', borderRadius: 100, height: 4, overflow: 'hidden', marginBottom: 5 }}>
                          <div style={{ height: 4, borderRadius: 100, width: `${mileagePercent}%`, background: mileagePercent >= 90 ? 'var(--fw-danger)' : mileagePercent >= 70 ? 'var(--fw-warning)' : 'var(--fw-green)' }} />
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--fw-text-2)' }}>{mileagePercent}% du forfait utilisé</div>
                      </>
                    )}
                  </div>

                  {/* Échéance urgente (animation pulse) */}
                  <div style={{ background: 'white', borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--fw-shadow-sm)', border: '1.5px solid transparent', animation: 'fw-urgentpulse 2.5s ease-in-out infinite' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--fw-text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Prochaine échéance</div>
                      <span className="fw-badge fw-badge-warning" style={{ fontSize: 9.5, fontWeight: 700 }}>J-7 · URGENT</span>
                    </div>
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 17, fontWeight: 700, color: 'var(--fw-warning)', marginBottom: 3 }}>Vidange huile moteur</div>
                    <div style={{ fontSize: 11, color: 'var(--fw-text-2)', marginBottom: 10 }}>Recommandé à 50 000 km</div>
                    <button style={{ width: '100%', fontSize: 12, fontWeight: 600, color: 'white', background: 'var(--fw-warning)', border: 'none', padding: '7px', borderRadius: 7, cursor: 'pointer' }}>
                      Prendre rendez-vous →
                    </button>
                  </div>

                  {/* Statut contrat */}
                  <div style={{ background: 'white', borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--fw-shadow-sm)' }}>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--fw-text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Statut contrat</div>
                    {contract ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                          <div style={{ width: 8, height: 8, background: 'var(--fw-green)', borderRadius: '50%' }} />
                          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 17, color: 'var(--fw-text)' }}>Actif</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--fw-text-2)', lineHeight: 1.6 }}>{contract.type} · Expire le <strong style={{ color: 'var(--fw-text)' }}>{new Date(contract.endDate).toLocaleDateString('fr-FR')}</strong></div>
                        <div style={{ fontSize: 11, color: 'var(--fw-text-3)', marginTop: 2 }}>{daysLeft} jours restants</div>
                      </>
                    ) : (
                      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 22, color: 'var(--fw-text)' }}>—</div>
                    )}
                  </div>
                </div>

                {/* ── PLAN + CARNET (maquette 1b bottom row) ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 10 }}>

                  {/* Plan d'entretien timeline */}
                  <div style={{ background: 'white', borderRadius: 12, padding: '18px 22px', boxShadow: 'var(--fw-shadow-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}>
                      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--fw-text)' }}>Plan d'entretien</div>
                      <button onClick={() => setNavItem('plan')} style={{ fontSize: 11, color: 'var(--fw-green)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>Voir tout →</button>
                    </div>
                    <div>
                      {[
                        { label: 'Vidange huile moteur', date: '15 juil. 2025', km: '50 000', badge: 'J-7 Urgent', badgeBg: 'var(--fw-warning-tint)', badgeColor: '#8A5500', dot: 'var(--fw-warning)', dotOpacity: 1 },
                        { label: 'Contrôle freins avant', date: '20 août 2025', km: '55 000', badge: 'J+45', badgeBg: 'var(--fw-warning-tint)', badgeColor: '#6B4200', dot: '#F59E0B', dotOpacity: 0.55 },
                        { label: 'Révision complète 60 000 km', date: '15 nov. 2025', km: '60 000', badge: 'Planifié', badgeBg: 'var(--fw-info-tint)', badgeColor: '#1A4FA0', dot: 'var(--fw-info)', dotOpacity: 0.55 },
                        { label: 'Remplacement filtres habitacle', date: '12 fév. 2025', km: '45 000', badge: '✓ Fait', badgeBg: 'var(--fw-green-tint)', badgeColor: '#1A7A4A', dot: 'var(--fw-green)', dotOpacity: 0.5, done: true },
                      ].map((item, i, arr) => (
                        <div key={item.label} style={{ display: 'flex', gap: 13, padding: '9px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: 2 }}>
                            <div style={{ width: 10, height: 10, background: item.dot, borderRadius: '50%', border: i === 0 ? '2px solid white' : undefined, boxShadow: i === 0 ? `0 0 0 1.5px ${item.dot}` : undefined, opacity: item.dotOpacity }} />
                            {i < arr.length - 1 && <div style={{ width: 1, flex: 1, minHeight: 20, marginTop: 4, background: 'rgba(0,0,0,0.08)' }} />}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                              <div style={{ fontSize: 12.5, fontWeight: item.done ? 400 : 600, color: item.done ? 'var(--fw-text-3)' : 'var(--fw-text)', textDecoration: item.done ? 'line-through' : undefined }}>{item.label}</div>
                              <span style={{ fontSize: 9.5, fontWeight: 700, color: item.badgeColor, background: item.badgeBg, padding: '2px 7px', borderRadius: 20 }}>{item.badge}</span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--fw-text-2)' }}>{item.date} · {item.km} km</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Carnet de vie aperçu */}
                  <div style={{ background: 'white', borderRadius: 12, padding: '18px 22px', boxShadow: 'var(--fw-shadow-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}>
                      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--fw-text)' }}>Carnet de vie</div>
                      <button onClick={() => setNavItem('logbook')} style={{ fontSize: 11, color: 'var(--fw-green)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>Tout voir →</button>
                    </div>
                    {vehicle.maintenanceRecords.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--fw-text-2)' }}>Aucune entrée dans le carnet.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                        {vehicle.maintenanceRecords.slice(0, 3).map((r, i) => (
                          <div key={r.id} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                            <div style={{ width: 34, height: 34, background: i === 0 ? 'var(--fw-green-tint)' : 'var(--fw-bg)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 15 }}>{i === 0 ? '✓' : '🔧'}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fw-text)', marginBottom: 1 }}>{r.type}</div>
                              {i === 0 && <div style={{ fontSize: 11, color: 'var(--fw-green)', fontWeight: 500, marginBottom: 2 }}>Conforme · {r.cost.toFixed(0)} €</div>}
                              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--fw-text-3)' }}>{new Date(r.date).toLocaleDateString('fr-FR')}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                      <button onClick={() => { setMileageValue(String(vehicle.mileage)); setShowMileage(true) }}
                        style={{ width: '100%', fontSize: 12, fontWeight: 600, color: 'white', background: 'var(--fw-green)', border: 'none', padding: '9px', borderRadius: 8, cursor: 'pointer' }}>
                        Déclarer mon kilométrage →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Mileage modal */}
      {showMileage && vehicle && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,17,16,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(3px)' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 30, width: 460, boxShadow: '0 24px 64px rgba(0,0,0,0.22)', animation: 'fw-scaleIn 0.18s ease' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 18, color: 'var(--fw-text)' }}>Déclarer mon kilométrage</div>
                <div style={{ fontSize: 12, color: 'var(--fw-text-2)', marginTop: 2 }}>Actuel enregistré : <strong style={{ color: 'var(--fw-text)' }}>{vehicle.mileage.toLocaleString('fr-FR')} km</strong></div>
              </div>
              <button onClick={() => { setShowMileage(false); setMileageError(null); setMileageValue(''); setMileageNote('') }} style={{ width: 30, height: 30, background: 'var(--fw-bg)', border: 'none', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={12} color="var(--fw-text)" />
              </button>
            </div>
            {mileageError && <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--fw-danger-tint)', border: '1px solid #fca5a5', borderRadius: 8, color: '#B01C1C', fontSize: 13 }}>{mileageError}</div>}
            <form onSubmit={handleAddMileage} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fw-text)', display: 'block', marginBottom: 6 }}>Nouveau kilométrage (km) *</label>
                <input type="number" min={vehicle.mileage} value={mileageValue} onChange={e => setMileageValue(e.target.value)} required placeholder={String(vehicle.mileage)}
                  style={{ width: '100%', fontSize: 20, fontFamily: "'JetBrains Mono', monospace", color: 'var(--fw-text)', background: 'var(--fw-bg)', border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '12px 14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fw-text)', display: 'block', marginBottom: 6 }}>Note (optionnel)</label>
                <input type="text" value={mileageNote} onChange={e => setMileageNote(e.target.value)} placeholder="Ex : lecture au compteur ce jour"
                  style={{ width: '100%', fontSize: 13, color: 'var(--fw-text)', background: 'var(--fw-bg)', border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '10px 12px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
                <button type="button" onClick={() => { setShowMileage(false); setMileageError(null); setMileageValue(''); setMileageNote('') }} style={{ fontSize: 13, fontWeight: 500, color: 'var(--fw-text)', background: 'var(--fw-bg)', border: 'none', padding: '10px 18px', borderRadius: 8, cursor: 'pointer' }}>Annuler</button>
                <button type="submit" disabled={submitting || !mileageValue} style={{ fontSize: 13, fontWeight: 600, color: 'white', background: 'var(--fw-green)', border: 'none', padding: '10px 18px', borderRadius: 8, cursor: 'pointer', opacity: submitting || !mileageValue ? 0.6 : 1 }}>
                  {submitting ? 'Enregistrement…' : 'Confirmer →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
