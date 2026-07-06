import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Car, Plus, ChevronRight, User, AlertCircle, Search, CheckCircle2, Loader2, Info } from 'lucide-react'
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
  vin: string
  brand: string
  model: string
  year: string
  licensePlate: string
  mileage: string
}

type ModalStep = 'vin-input' | 'confirm' | 'manual'

export default function FleetPage() {
  const { user, logout } = useAuth()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modalStep, setModalStep] = useState<ModalStep>('vin-input')

  // VIN decode step
  const [vinInput, setVinInput] = useState('')
  const [decoding, setDecoding] = useState(false)
  const [decodeError, setDecodeError] = useState<string | null>(null)
  const [decoded, setDecoded] = useState<DecodedVin | null>(null)
  const [applyPlan, setApplyPlan] = useState(true)

  // Vehicle form
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
    setVinInput('')
    setDecodeError(null)
    setDecoded(null)
    setApplyPlan(true)
    setForm({ vin: '', brand: '', model: '', year: '', licensePlate: '', mileage: '' })
    setModalStep('vin-input')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
  }

  async function handleDecode(e: React.FormEvent) {
    e.preventDefault()
    if (!vinInput.trim()) return
    setDecoding(true)
    setDecodeError(null)
    setDecoded(null)
    try {
      const res = await api.get<DecodedVin>(`/vehicles/decode-vin/${vinInput.trim().toUpperCase()}`)
      setDecoded(res.data)
      setForm({
        vin: res.data.vin,
        brand: res.data.brand,
        model: res.data.model,
        year: res.data.year ? String(res.data.year) : '',
        licensePlate: '',
        mileage: '',
      })
      setModalStep('confirm')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setDecodeError(msg ?? 'Impossible de décoder ce VIN.')
    } finally {
      setDecoding(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFeedback(null)
    try {
      const vehicle = await api.post<{ id: string }>('/vehicles', {
        vin: form.vin,
        brand: form.brand,
        model: form.model,
        year: form.year ? parseInt(form.year) : undefined,
        licensePlate: form.licensePlate || undefined,
        mileage: parseInt(form.mileage),
      })

      // Auto-create maintenance plan if requested
      if (applyPlan && decoded?.maintenancePresets?.length) {
        await Promise.allSettled(
          decoded.maintenancePresets.map(p =>
            api.post(`/vehicles/${vehicle.data.id}/plan`, p)
          )
        )
      }

      setFeedback({ type: 'success', msg: `Véhicule ${form.brand} ${form.model} ajouté avec succès.` })
      closeModal()
      loadVehicles()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
      setFeedback({ type: 'error', msg: Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Erreur lors de la création.') })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Flywheel</h1>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Back-office</span>
          </div>
          <nav className="flex items-center gap-1 ml-4">
            <Link to="/back-office/dashboard" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] px-3 py-1.5 rounded-md hover:bg-gray-100 transition">
              Tableau de bord
            </Link>
            <Link to="/back-office/fleet" className="text-sm font-medium text-[var(--color-primary)] bg-blue-50 px-3 py-1.5 rounded-md">
              Flotte
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[var(--color-text-secondary)]">{user?.email}</span>
          <button onClick={logout} className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition">
            Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Flotte de véhicules</h2>
            <p className="text-[var(--color-text-secondary)] mt-1">{vehicles.length} véhicule{vehicles.length !== 1 ? 's' : ''} au total</p>
          </div>
          <button
            onClick={openModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white text-sm transition"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Plus size={16} />
            Ajouter un véhicule
          </button>
        </div>

        {feedback && (
          <div className={`mb-6 p-4 rounded-lg border text-sm flex items-start gap-2 ${
            feedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
            {feedback.msg}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-[var(--color-text-secondary)]">Chargement…</div>
        ) : vehicles.length === 0 ? (
          <div className="text-center py-20">
            <Car size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-[var(--color-text-secondary)]">Aucun véhicule dans la flotte.</p>
            <button onClick={openModal} className="mt-4 text-sm font-medium underline" style={{ color: 'var(--color-primary)' }}>
              Ajouter le premier véhicule
            </button>
          </div>
        ) : (
          <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-gray-50">
                  <th className="text-left px-5 py-3 font-medium text-[var(--color-text-secondary)]">Véhicule</th>
                  <th className="text-left px-5 py-3 font-medium text-[var(--color-text-secondary)]">VIN</th>
                  <th className="text-left px-5 py-3 font-medium text-[var(--color-text-secondary)]">Immatriculation</th>
                  <th className="text-left px-5 py-3 font-medium text-[var(--color-text-secondary)]">Kilométrage</th>
                  <th className="text-left px-5 py-3 font-medium text-[var(--color-text-secondary)]">Client</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v, i) => (
                  <tr key={v.id} className={`${i !== vehicles.length - 1 ? 'border-b border-[var(--color-border)]' : ''} hover:bg-gray-50 transition`}>
                    <td className="px-5 py-4 font-medium text-[var(--color-text-primary)]">
                      {v.brand} {v.model}
                      {v.year && <span className="ml-1 text-[var(--color-text-secondary)] font-normal">({v.year})</span>}
                    </td>
                    <td className="px-5 py-4 text-[var(--color-text-secondary)] font-mono text-xs">{v.vin}</td>
                    <td className="px-5 py-4 text-[var(--color-text-secondary)]">{v.licensePlate ?? '—'}</td>
                    <td className="px-5 py-4 text-[var(--color-text-secondary)]">{v.mileage.toLocaleString('fr-FR')} km</td>
                    <td className="px-5 py-4">
                      {v.driver ? (
                        <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                          <User size={14} />
                          {v.driver.email}
                        </span>
                      ) : (
                        <span className="text-amber-600 text-xs font-medium bg-amber-50 px-2 py-0.5 rounded-full">Non assigné</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link to={`/back-office/fleet/${v.id}`} className="text-[var(--color-primary)] hover:underline flex items-center gap-1 justify-end">
                        Voir <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* ── Add vehicle modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl border border-[var(--color-border)] w-full max-w-xl max-h-[90vh] overflow-y-auto">

            {/* ── Step 1: VIN input ── */}
            {modalStep === 'vin-input' && (
              <div className="p-6">
                <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">Ajouter un véhicule</h3>
                <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                  Saisissez le VIN pour identifier automatiquement le modèle et pré-remplir le plan d'entretien constructeur.
                </p>

                <form onSubmit={handleDecode} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Numéro VIN (17 caractères) *
                    </label>
                    <div className="relative">
                      <input
                        value={vinInput}
                        onChange={e => { setVinInput(e.target.value.toUpperCase()); setDecodeError(null) }}
                        maxLength={17}
                        required
                        className="w-full px-3 py-2 pr-10 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm font-mono tracking-wider uppercase"
                        placeholder="VF1RFDD00AB123456"
                      />
                      <span className={`absolute right-3 top-2.5 text-xs font-medium ${vinInput.length === 17 ? 'text-green-600' : 'text-[var(--color-text-secondary)]'}`}>
                        {vinInput.length}/17
                      </span>
                    </div>
                    {decodeError && (
                      <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle size={12} /> {decodeError}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={closeModal} className="flex-1 py-2 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-gray-50 transition">
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={decoding || vinInput.length !== 17}
                      className="flex-1 py-2 rounded-lg font-medium text-white text-sm transition disabled:opacity-60 flex items-center justify-center gap-2"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                      {decoding ? <><Loader2 size={14} className="animate-spin" /> Décodage…</> : <><Search size={14} /> Décoder le VIN</>}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setForm({ vin: '', brand: '', model: '', year: '', licensePlate: '', mileage: '' }); setDecoded(null); setModalStep('manual') }}
                    className="w-full text-center text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition"
                  >
                    Saisie manuelle sans décodage
                  </button>
                </form>
              </div>
            )}

            {/* ── Step 2: Confirm decoded data ── */}
            {modalStep === 'confirm' && decoded && (
              <div className="p-6">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 size={18} className="text-green-600" />
                  <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Véhicule identifié</h3>
                  {decoded.source === 'mock' && (
                    <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium ml-auto">Données partielles</span>
                  )}
                  {decoded.source === 'nhtsa' && (
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium ml-auto">Source NHTSA</span>
                  )}
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] mb-5">
                  Vérifiez les informations et complétez les champs manquants.
                </p>

                {/* Decoded summary */}
                <div className="bg-gray-50 rounded-lg p-4 mb-5 grid grid-cols-2 gap-3 text-sm">
                  {[
                    ['Marque', decoded.brand],
                    ['Modèle', decoded.model || '—'],
                    ['Année', decoded.year ? String(decoded.year) : '—'],
                    ['Motorisation', decoded.fuelType ?? '—'],
                    ['Cylindrée', decoded.engineDisplacement ? `${decoded.engineDisplacement} L` : '—'],
                    ['Pays', decoded.country ?? '—'],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
                      <p className="font-medium text-[var(--color-text-primary)]">{val}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1">Marque *</label>
                      <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} required
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1">Modèle *</label>
                      <input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} required
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm" placeholder="Ex : Clio" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1">Année</label>
                      <input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} min="1990" max="2030"
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1">Immatriculation</label>
                      <input value={form.licensePlate} onChange={e => setForm(f => ({ ...f, licensePlate: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm" placeholder="AB-123-CD" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1">Kilométrage actuel *</label>
                      <input type="number" min="0" value={form.mileage} onChange={e => setForm(f => ({ ...f, mileage: e.target.value }))} required
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm" placeholder="15000" />
                    </div>
                  </div>

                  {/* Plan d'entretien */}
                  {decoded.maintenancePresets.length > 0 && (
                    <div className="rounded-lg border border-[var(--color-border)] p-4">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={applyPlan}
                          onChange={e => setApplyPlan(e.target.checked)}
                          className="mt-0.5 accent-[var(--color-primary)]"
                        />
                        <div>
                          <p className="text-sm font-medium text-[var(--color-text-primary)]">
                            Appliquer le plan d'entretien constructeur
                          </p>
                          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                            {decoded.maintenancePresets.length} opérations pré-configurées
                            {decoded.fuelType ? ` pour motorisation ${decoded.fuelType}` : ''}
                          </p>
                          {applyPlan && (
                            <ul className="mt-2 space-y-0.5">
                              {decoded.maintenancePresets.slice(0, 4).map(p => (
                                <li key={p.operationType} className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1.5">
                                  <span className="w-1 h-1 rounded-full bg-[var(--color-primary)] shrink-0" />
                                  {p.operationType}
                                  <span className="text-gray-400">
                                    {[p.intervalKm && `${p.intervalKm.toLocaleString('fr-FR')} km`, p.intervalMonths && `${p.intervalMonths} mois`].filter(Boolean).join(' / ')}
                                  </span>
                                </li>
                              ))}
                              {decoded.maintenancePresets.length > 4 && (
                                <li className="text-xs text-[var(--color-text-secondary)] pl-2.5">
                                  + {decoded.maintenancePresets.length - 4} opération{decoded.maintenancePresets.length - 4 > 1 ? 's' : ''}…
                                </li>
                              )}
                            </ul>
                          )}
                        </div>
                      </label>
                    </div>
                  )}

                  {decoded.source === 'mock' && (
                    <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <Info size={13} className="mt-0.5 shrink-0" />
                      Ce véhicule n'a pas été trouvé dans la base NHTSA. La marque a été identifiée via le WMI du VIN. Vérifiez et complétez les informations.
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setModalStep('vin-input')}
                      className="flex-1 py-2 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-gray-50 transition">
                      Retour
                    </button>
                    <button type="submit" disabled={submitting || !form.brand || !form.model || !form.mileage}
                      className="flex-1 py-2 rounded-lg font-medium text-white text-sm transition disabled:opacity-60"
                      style={{ backgroundColor: 'var(--color-primary)' }}>
                      {submitting ? 'Création…' : 'Créer le véhicule'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ── Step: Manual entry (no VIN decode) ── */}
            {modalStep === 'manual' && (
              <div className="p-6">
                <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-5">Ajouter un véhicule manuellement</h3>
                <form onSubmit={handleCreate} className="space-y-4" noValidate>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">VIN *</label>
                    <input value={form.vin} onChange={e => setForm(f => ({ ...f, vin: e.target.value.toUpperCase() }))} required maxLength={17}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm font-mono"
                      placeholder="VF1RFDD00AB123456" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Marque *</label>
                      <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} required
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm" placeholder="Renault" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Modèle *</label>
                      <input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} required
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm" placeholder="Clio" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Année</label>
                      <input type="number" min="1990" max="2030" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm" placeholder="2022" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Immatriculation</label>
                      <input value={form.licensePlate} onChange={e => setForm(f => ({ ...f, licensePlate: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm" placeholder="AB-123-CD" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Kilométrage actuel *</label>
                    <input type="number" min="0" value={form.mileage} onChange={e => setForm(f => ({ ...f, mileage: e.target.value }))} required
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm" placeholder="15000" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setModalStep('vin-input')}
                      className="flex-1 py-2 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-gray-50 transition">
                      Retour
                    </button>
                    <button type="submit" disabled={submitting || !form.vin || !form.brand || !form.model || !form.mileage}
                      className="flex-1 py-2 rounded-lg font-medium text-white text-sm transition disabled:opacity-60"
                      style={{ backgroundColor: 'var(--color-primary)' }}>
                      {submitting ? 'Création…' : 'Ajouter'}
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
