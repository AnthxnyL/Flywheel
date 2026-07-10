import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Loader2, Info, AlertCircle, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'

interface Vehicle {
  id: string
  vin: string
  brand: string
  model: string
  year: number | null
  licensePlate: string | null
  mileage: number
  driverId: string | null
  driver: { id: string; email: string } | null
  createdAt: string
}

interface PlanPreset {
  operationType: string
  intervalKm: number | null
  intervalMonths: number | null
}

interface DecodedVin {
  vin: string
  brand: string
  model: string
  year: number | null
  fuelType: string | null
  engineDisplacement: string | null
  engineCylinders: string | null
  driveType: string | null
  bodyClass: string | null
  country: string | null
  source: 'nhtsa' | 'mock'
  maintenancePresets: PlanPreset[]
}

interface VehicleForm {
  vin: string; brand: string; model: string; year: string; licensePlate: string; mileage: string
}

type ModalStep = 'vin-input' | 'confirm' | 'manual'
type Filter = 'all' | 'assigned' | 'unassigned'

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

const INPUT: React.CSSProperties = {
  width: '100%', fontSize: 13, color: 'var(--fw-text)', background: 'var(--fw-bg)',
  border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '10px 12px',
  outline: 'none', boxSizing: 'border-box',
}

const PAGE_SIZE = 8

export default function FleetPage() {
  const { user, logout } = useAuth()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modalStep, setModalStep] = useState<ModalStep>('vin-input')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(1)
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  const [vinInput, setVinInput] = useState('')
  const [decoding, setDecoding] = useState(false)
  const [decodeError, setDecodeError] = useState<string | null>(null)
  const [decoded, setDecoded] = useState<DecodedVin | null>(null)
  const [applyPlan, setApplyPlan] = useState(true)

  const [form, setForm] = useState<VehicleForm>({ vin: '', brand: '', model: '', year: '', licensePlate: '', mileage: '' })
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  async function loadVehicles() {
    try {
      const res = await api.get<Vehicle[]>('/vehicles')
      setVehicles(res.data)
    } catch {
      setFeedback({ type: 'error', msg: 'Impossible de charger la flotte.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadVehicles() }, [])

  function openModal() {
    setVinInput(''); setDecodeError(null); setDecoded(null); setApplyPlan(true)
    setForm({ vin: '', brand: '', model: '', year: '', licensePlate: '', mileage: '' })
    setModalStep('vin-input'); setShowModal(true)
  }

  async function handleDecode(e: React.FormEvent) {
    e.preventDefault()
    if (!vinInput.trim()) return
    setDecoding(true); setDecodeError(null); setDecoded(null)
    try {
      const res = await api.get<DecodedVin>(`/vehicles/decode-vin/${vinInput.trim().toUpperCase()}`)
      setDecoded(res.data)
      setForm({ vin: res.data.vin, brand: res.data.brand, model: res.data.model, year: res.data.year ? String(res.data.year) : '', licensePlate: '', mileage: '' })
      setModalStep('confirm')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setDecodeError(msg ?? 'Impossible de décoder ce VIN.')
    } finally { setDecoding(false) }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true); setFeedback(null)
    try {
      const vehicle = await api.post<{ id: string }>('/vehicles', {
        vin: form.vin, brand: form.brand, model: form.model,
        year: form.year ? parseInt(form.year) : undefined,
        licensePlate: form.licensePlate || undefined,
        mileage: parseInt(form.mileage),
      })
      if (applyPlan && decoded?.maintenancePresets?.length) {
        await Promise.allSettled(decoded.maintenancePresets.map(p => api.post(`/vehicles/${vehicle.data.id}/plan`, p)))
      }
      setFeedback({ type: 'success', msg: `Véhicule ${form.brand} ${form.model} ajouté avec succès.` })
      setShowModal(false); loadVehicles()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
      setFeedback({ type: 'error', msg: Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Erreur lors de la création.') })
    } finally { setSubmitting(false) }
  }

  // Filter + search + paginate
  const filtered = vehicles.filter(v => {
    const q = search.toLowerCase()
    const matchSearch = !q || v.brand.toLowerCase().includes(q) || v.model.toLowerCase().includes(q) || v.vin.toLowerCase().includes(q) || (v.driver?.email ?? '').toLowerCase().includes(q) || (v.licensePlate ?? '').toLowerCase().includes(q)
    const matchFilter = filter === 'all' || (filter === 'assigned' && v.driver) || (filter === 'unassigned' && !v.driver)
    return matchSearch && matchFilter
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageVehicles = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const assignedCount = vehicles.filter(v => v.driver).length
  const unassignedCount = vehicles.filter(v => !v.driver).length
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
          <Link to="/back-office/dashboard" style={{ padding: '7px 14px', borderRadius: 7, fontSize: 13, fontWeight: 500, color: 'var(--fw-text-2)', textDecoration: 'none' }}>Tableau de bord</Link>
          <div style={{ padding: '7px 14px', borderRadius: 7, background: 'var(--fw-bg)', fontSize: 13, fontWeight: 600, color: 'var(--fw-text)' }}>Flotte</div>
        </nav>
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

      <div style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Toolbar — inspiré maquette 1c */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 22, color: 'var(--fw-text)', letterSpacing: '-0.3px' }}>Flotte</div>
            <div style={{ fontSize: 12, color: 'var(--fw-text-2)', marginTop: 1 }}>{vehicles.length} véhicule{vehicles.length !== 1 ? 's' : ''} · {assignedCount} assigné{assignedCount !== 1 ? 's' : ''}</div>
          </div>
          <div style={{ flex: 1 }} />
          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', border: '1px solid rgba(0,0,0,0.09)', borderRadius: 8, padding: '8px 14px', width: 230 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="#ADADAF" strokeWidth="2"/><path d="M21 21L16.65 16.65" stroke="#ADADAF" strokeWidth="2" strokeLinecap="round"/></svg>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Véhicule, VIN, client…"
              style={{ border: 'none', outline: 'none', fontSize: 13, color: 'var(--fw-text)', background: 'transparent', flex: 1 }} />
            {search && <button onClick={() => { setSearch(''); setPage(1) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fw-text-3)', lineHeight: 1 }}>×</button>}
          </div>
          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 5 }}>
            {([
              { key: 'all', label: 'Tous', count: vehicles.length },
              { key: 'assigned', label: 'Assigné', count: assignedCount },
              { key: 'unassigned', label: 'Non assigné', count: unassignedCount },
            ] as const).map(({ key, label, count }) => (
              <button key={key} onClick={() => { setFilter(key); setPage(1) }}
                style={{ fontSize: 11, fontWeight: filter === key ? 600 : 500, color: filter === key ? (key === 'unassigned' ? 'var(--fw-text-2)' : '#1A7A4A') : 'var(--fw-text-2)', background: filter === key ? (key === 'all' ? 'var(--fw-green-tint)' : key === 'assigned' ? 'var(--fw-green-tint)' : 'rgba(0,0,0,0.06)') : 'white', border: `1px solid ${filter === key ? 'rgba(45,189,122,0.3)' : 'rgba(0,0,0,0.09)'}`, padding: '5px 12px', borderRadius: 20, cursor: 'pointer' }}>
                {label} {count}
              </button>
            ))}
          </div>
          <button style={{ fontSize: 13, fontWeight: 500, color: 'var(--fw-text)', background: 'white', border: '1px solid rgba(0,0,0,0.1)', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>
            Exporter
          </button>
          <button onClick={openModal}
            style={{ fontSize: 13, fontWeight: 600, color: 'white', background: 'var(--fw-green)', border: 'none', padding: '8px 18px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><line x1="12" y1="5" x2="12" y2="19" stroke="white" strokeWidth="2.5" strokeLinecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
            Ajouter un véhicule
          </button>
        </div>

        {feedback && (
          <div style={{ padding: '10px 16px', borderRadius: 10, fontSize: 13, background: feedback.type === 'success' ? 'var(--fw-green-tint)' : 'var(--fw-danger-tint)', border: `1px solid ${feedback.type === 'success' ? '#a7f3d0' : '#fca5a5'}`, color: feedback.type === 'success' ? '#1A7A4A' : '#B01C1C' }}>
            {feedback.msg}
          </div>
        )}

        {/* Fleet table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', fontSize: 13, color: 'var(--fw-text-2)' }}>Chargement…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🚗</div>
            <div style={{ fontSize: 13, color: 'var(--fw-text-2)' }}>{search ? 'Aucun résultat pour cette recherche.' : 'Aucun véhicule dans la flotte.'}</div>
            {!search && <button onClick={openModal} style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: 'var(--fw-green)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Ajouter le premier véhicule</button>}
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--fw-shadow-sm)' }}>
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.7fr 0.9fr 1fr 1.4fr 1.1fr 36px', padding: '11px 20px', background: '#FAFAF9', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
              {['Véhicule', 'VIN', 'Plaque', 'Km', 'Client', 'Statut', ''].map(h => (
                <div key={h} style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--fw-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</div>
              ))}
            </div>
            {pageVehicles.map((v, i) => {
              const isHovered = hoveredRow === v.id
              const hasAlert = false // extend later: flag based on maintenance due
              const bgColor = isHovered ? (hasAlert ? '#FFF5F5' : '#FAFAF9') : (hasAlert ? '#FFFBFB' : 'white')
              return (
                <Link key={v.id} to={`/back-office/fleet/${v.id}`} style={{ textDecoration: 'none', display: 'grid', gridTemplateColumns: '2fr 1.7fr 0.9fr 1fr 1.4fr 1.1fr 36px', padding: '13px 20px', borderBottom: i < pageVehicles.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', borderLeft: hasAlert ? '3px solid var(--fw-danger)' : '3px solid transparent', background: bgColor, alignItems: 'center', transition: 'background 0.1s' }}
                  onMouseEnter={() => setHoveredRow(v.id)} onMouseLeave={() => setHoveredRow(null)}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fw-text)' }}>{v.brand} {v.model}</div>
                    {v.year && <div style={{ fontSize: 11, color: 'var(--fw-text-2)', marginTop: 1 }}>{v.year}</div>}
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--fw-text-2)' }}>{v.vin}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: 'var(--fw-text)', fontWeight: 500 }}>{v.licensePlate ?? '—'}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: 'var(--fw-text)' }}>{v.mileage.toLocaleString('fr-FR')} km</div>
                  <div style={{ fontSize: 13, color: v.driver ? 'var(--fw-text)' : 'var(--fw-text-3)', fontStyle: v.driver ? undefined : 'italic' }}>{v.driver?.email ?? '—'}</div>
                  <div>
                    {v.driver
                      ? <span className="fw-badge fw-badge-green">Assigné</span>
                      : <span className="fw-badge fw-badge-gray">Non assigné</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5" r="1.5" fill="#ADADAF"/><circle cx="12" cy="12" r="1.5" fill="#ADADAF"/><circle cx="12" cy="19" r="1.5" fill="#ADADAF"/></svg>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, color: 'var(--fw-text-2)' }}>
              Affichage {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} sur {filtered.length} véhicules
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ width: 32, height: 32, background: 'white', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: 'var(--fw-text-2)', opacity: page === 1 ? 0.4 : 1 }}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  style={{ width: 32, height: 32, background: p === page ? 'var(--fw-sidebar)' : 'white', border: p === page ? 'none' : '1px solid rgba(0,0,0,0.1)', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: p === page ? 'white' : 'var(--fw-text-2)', fontWeight: p === page ? 600 : 400 }}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ width: 32, height: 32, background: 'white', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: 'var(--fw-text-2)', opacity: page === totalPages ? 0.4 : 1 }}>›</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add vehicle modal ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,17,16,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(3px)', padding: '0 16px' }}>
          <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', animation: 'fw-scaleIn 0.18s ease' }}>

            {/* Step 1: VIN */}
            {modalStep === 'vin-input' && (
              <div style={{ padding: 32 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 20, color: 'var(--fw-text)', letterSpacing: '-0.2px' }}>Ajouter un véhicule</div>
                    <div style={{ fontSize: 12, color: 'var(--fw-text-2)', marginTop: 2 }}>Étape 1 sur 2 — Identification VIN</div>
                  </div>
                  <button onClick={() => setShowModal(false)} style={{ width: 32, height: 32, background: 'var(--fw-bg)', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} color="var(--fw-text)" /></button>
                </div>
                {/* Progress bar */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                  <div style={{ flex: 1, height: 3, background: 'var(--fw-sidebar)', borderRadius: 2 }} />
                  <div style={{ flex: 1, height: 3, background: 'rgba(0,0,0,0.1)', borderRadius: 2 }} />
                </div>
                <form onSubmit={handleDecode} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fw-text)', display: 'block', marginBottom: 7 }}>Numéro VIN (17 caractères) *</label>
                    <div style={{ display: 'flex', gap: 9 }}>
                      <div style={{ flex: 1, position: 'relative' }}>
                        <input value={vinInput} onChange={e => { setVinInput(e.target.value.toUpperCase()); setDecodeError(null) }}
                          maxLength={17} required placeholder="WBA8E9C0XJA000000"
                          style={{ ...INPUT, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, letterSpacing: '0.06em', paddingRight: 40 }} />
                        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 500, color: vinInput.length === 17 ? 'var(--fw-green)' : 'var(--fw-text-3)' }}>{vinInput.length}/17</span>
                      </div>
                      <button type="submit" disabled={decoding || vinInput.length !== 17}
                        style={{ fontSize: 13, fontWeight: 600, color: 'white', background: 'var(--fw-sidebar)', border: 'none', padding: '10px 18px', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap', opacity: vinInput.length !== 17 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {decoding ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Décodage…</> : 'Décoder →'}
                      </button>
                    </div>
                    {decodeError && <div style={{ marginTop: 6, fontSize: 11, color: 'var(--fw-danger)', display: 'flex', alignItems: 'center', gap: 5 }}><AlertCircle size={11} /> {decodeError}</div>}
                    <div style={{ fontSize: 11, color: 'var(--fw-text-2)', marginTop: 8 }}>Le décodage VIN identifie automatiquement la marque, le modèle et la motorisation.</div>
                  </div>
                  {/* Divider */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.07)' }} />
                    <span style={{ fontSize: 11, color: 'var(--fw-text-3)' }}>ou</span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.07)' }} />
                  </div>
                  <button type="button" onClick={() => { setForm({ vin: '', brand: '', model: '', year: '', licensePlate: '', mileage: '' }); setDecoded(null); setModalStep('manual') }}
                    style={{ background: 'var(--fw-bg)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 9, padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11, textAlign: 'left' }}>
                    <div style={{ width: 36, height: 36, background: 'white', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✏️</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fw-text)' }}>Saisie manuelle</div>
                      <div style={{ fontSize: 11, color: 'var(--fw-text-2)' }}>Renseigner les informations sans décodage</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 'auto', flexShrink: 0 }}><path d="M9 18l6-6-6-6" stroke="#ADADAF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => setShowModal(false)} style={{ fontSize: 13, fontWeight: 500, color: 'var(--fw-text)', background: 'var(--fw-bg)', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer' }}>Annuler</button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 2: Confirm */}
            {modalStep === 'confirm' && decoded && (
              <div style={{ padding: 32 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                      <CheckCircle2 size={16} color="var(--fw-green)" />
                      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 20, color: 'var(--fw-text)' }}>Véhicule identifié</div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--fw-text-2)' }}>Étape 2 sur 2 — Vérification et kilométrage</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {decoded.source === 'mock'
                      ? <span className="fw-badge fw-badge-warning">Données partielles</span>
                      : <span className="fw-badge fw-badge-green">Source NHTSA</span>}
                    <button onClick={() => setShowModal(false)} style={{ width: 32, height: 32, background: 'var(--fw-bg)', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} color="var(--fw-text)" /></button>
                  </div>
                </div>
                {/* Progress bar full */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                  <div style={{ flex: 1, height: 3, background: 'var(--fw-sidebar)', borderRadius: 2 }} />
                  <div style={{ flex: 1, height: 3, background: 'var(--fw-sidebar)', borderRadius: 2 }} />
                </div>
                {/* Decoded summary */}
                <div style={{ background: 'var(--fw-bg)', borderRadius: 10, padding: '14px 16px', marginBottom: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[['Marque', decoded.brand], ['Modèle', decoded.model || '—'], ['Année', decoded.year ? String(decoded.year) : '—'], ['Motorisation', decoded.fuelType ?? '—'], ['Cylindrée', decoded.engineDisplacement ? `${decoded.engineDisplacement} L` : '—'], ['Pays d\'origine', decoded.country ?? '—']].map(([l, v]) => (
                    <div key={l}>
                      <div style={{ fontSize: 10, color: 'var(--fw-text-3)', marginBottom: 2 }}>{l}</div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fw-text)' }}>{v}</div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { label: 'Marque *', key: 'brand' as const, placeholder: 'BMW' },
                      { label: 'Modèle *', key: 'model' as const, placeholder: 'Série 3' },
                      { label: 'Année', key: 'year' as const, placeholder: '2023', type: 'number' },
                      { label: 'Immatriculation', key: 'licensePlate' as const, placeholder: 'AB-456-CD' },
                    ].map(({ label, key, placeholder, type }) => (
                      <div key={key}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fw-text)', display: 'block', marginBottom: 6 }}>{label}</label>
                        <input type={type ?? 'text'} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} required={label.includes('*')} placeholder={placeholder} style={INPUT} />
                      </div>
                    ))}
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fw-text)', display: 'block', marginBottom: 6 }}>Kilométrage actuel *</label>
                      <input type="number" min="0" value={form.mileage} onChange={e => setForm(f => ({ ...f, mileage: e.target.value }))} required placeholder="15000" style={{ ...INPUT, fontFamily: "'JetBrains Mono', monospace" }} />
                    </div>
                  </div>
                  {decoded.maintenancePresets.length > 0 && (
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', background: 'var(--fw-bg)', borderRadius: 10, padding: '12px 14px', border: '1.5px solid rgba(0,0,0,0.07)' }}>
                      <input type="checkbox" checked={applyPlan} onChange={e => setApplyPlan(e.target.checked)} style={{ marginTop: 2 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fw-text)', marginBottom: 2 }}>Appliquer le plan d'entretien constructeur</div>
                        <div style={{ fontSize: 11, color: 'var(--fw-text-2)' }}>{decoded.maintenancePresets.length} opérations pré-configurées{decoded.fuelType ? ` · ${decoded.fuelType}` : ''}</div>
                        {applyPlan && (
                          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {decoded.maintenancePresets.slice(0, 4).map(p => (
                              <div key={p.operationType} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--fw-text-2)' }}>
                                <div style={{ width: 5, height: 5, background: 'var(--fw-green)', borderRadius: '50%', flexShrink: 0 }} />
                                {p.operationType}
                                <span style={{ color: 'var(--fw-text-3)' }}>{[p.intervalKm && `${p.intervalKm.toLocaleString('fr-FR')} km`, p.intervalMonths && `${p.intervalMonths} mois`].filter(Boolean).join(' / ')}</span>
                              </div>
                            ))}
                            {decoded.maintenancePresets.length > 4 && <div style={{ fontSize: 11, color: 'var(--fw-text-3)', paddingLeft: 11 }}>+ {decoded.maintenancePresets.length - 4} opérations…</div>}
                          </div>
                        )}
                      </div>
                    </label>
                  )}
                  {decoded.source === 'mock' && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11, color: '#8A5500', background: 'var(--fw-warning-tint)', border: '1px solid rgba(232,151,13,0.25)', borderRadius: 8, padding: '10px 12px' }}>
                      <Info size={12} style={{ marginTop: 1, flexShrink: 0 }} /> VIN non trouvé dans la base NHTSA. La marque a été identifiée via le WMI. Vérifiez les informations.
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
                    <button type="button" onClick={() => setModalStep('vin-input')} style={{ fontSize: 13, fontWeight: 500, color: 'var(--fw-text)', background: 'var(--fw-bg)', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer' }}>Retour</button>
                    <button type="submit" disabled={submitting || !form.brand || !form.model || !form.mileage} style={{ fontSize: 13, fontWeight: 600, color: 'white', background: 'var(--fw-green)', border: 'none', padding: '10px 22px', borderRadius: 8, cursor: 'pointer', opacity: submitting || !form.brand || !form.model || !form.mileage ? 0.6 : 1 }}>
                      {submitting ? 'Création…' : 'Créer le véhicule →'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Step: Manual */}
            {modalStep === 'manual' && (
              <div style={{ padding: 32 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
                  <div>
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 20, color: 'var(--fw-text)' }}>Saisie manuelle</div>
                    <div style={{ fontSize: 12, color: 'var(--fw-text-2)', marginTop: 2 }}>Renseignez les informations du véhicule.</div>
                  </div>
                  <button onClick={() => setShowModal(false)} style={{ width: 32, height: 32, background: 'var(--fw-bg)', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} color="var(--fw-text)" /></button>
                </div>
                <form onSubmit={handleCreate} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fw-text)', display: 'block', marginBottom: 6 }}>VIN *</label>
                    <input value={form.vin} onChange={e => setForm(f => ({ ...f, vin: e.target.value.toUpperCase() }))} required maxLength={17} placeholder="VF1RFDD00AB123456"
                      style={{ ...INPUT, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { l: 'Marque *', k: 'brand' as const, ph: 'Renault', req: true },
                      { l: 'Modèle *', k: 'model' as const, ph: 'Clio', req: true },
                      { l: 'Année', k: 'year' as const, ph: '2022', req: false },
                      { l: 'Immatriculation', k: 'licensePlate' as const, ph: 'AB-123-CD', req: false },
                    ].map(({ l, k, ph, req }) => (
                      <div key={k}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fw-text)', display: 'block', marginBottom: 6 }}>{l}</label>
                        <input value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} required={req} placeholder={ph} style={INPUT} />
                      </div>
                    ))}
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fw-text)', display: 'block', marginBottom: 6 }}>Kilométrage actuel *</label>
                      <input type="number" min="0" value={form.mileage} onChange={e => setForm(f => ({ ...f, mileage: e.target.value }))} required placeholder="15000"
                        style={{ ...INPUT, fontFamily: "'JetBrains Mono', monospace" }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
                    <button type="button" onClick={() => setModalStep('vin-input')} style={{ fontSize: 13, fontWeight: 500, color: 'var(--fw-text)', background: 'var(--fw-bg)', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer' }}>Retour</button>
                    <button type="submit" disabled={submitting || !form.vin || !form.brand || !form.model || !form.mileage} style={{ fontSize: 13, fontWeight: 600, color: 'white', background: 'var(--fw-green)', border: 'none', padding: '10px 22px', borderRadius: 8, cursor: 'pointer', opacity: submitting || !form.vin || !form.brand || !form.model || !form.mileage ? 0.6 : 1 }}>
                      {submitting ? 'Création…' : 'Ajouter →'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
