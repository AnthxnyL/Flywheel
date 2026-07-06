import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Car, Plus, ChevronRight, User, AlertCircle } from 'lucide-react'
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

interface CreateVehicleForm {
  vin: string
  brand: string
  model: string
  year: string
  licensePlate: string
  mileage: string
}

export default function FleetPage() {
  const { user, logout } = useAuth()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CreateVehicleForm>({
    vin: '', brand: '', model: '', year: '', licensePlate: '', mileage: '',
  })
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

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFeedback(null)
    try {
      await api.post('/vehicles', {
        vin: form.vin,
        brand: form.brand,
        model: form.model,
        year: form.year ? parseInt(form.year) : undefined,
        licensePlate: form.licensePlate || undefined,
        mileage: parseInt(form.mileage),
      })
      setFeedback({ type: 'success', msg: 'Véhicule ajouté avec succès.' })
      setShowForm(false)
      setForm({ vin: '', brand: '', model: '', year: '', licensePlate: '', mileage: '' })
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
            onClick={() => setShowForm(true)}
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
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {feedback.msg}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-[var(--color-text-secondary)]">Chargement…</div>
        ) : vehicles.length === 0 ? (
          <div className="text-center py-20">
            <Car size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-[var(--color-text-secondary)]">Aucun véhicule dans la flotte.</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-sm font-medium underline"
              style={{ color: 'var(--color-primary)' }}
            >
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
                      <Link
                        to={`/back-office/fleet/${v.id}`}
                        className="text-[var(--color-primary)] hover:underline flex items-center gap-1 justify-end"
                      >
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

      {/* Add vehicle modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl border border-[var(--color-border)] p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-5">Ajouter un véhicule</h3>
            <form onSubmit={handleCreate} className="space-y-4" noValidate>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">VIN *</label>
                <input
                  name="vin" value={form.vin} onChange={handleChange} required
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm font-mono"
                  placeholder="VF1RFD00062696185"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Marque *</label>
                  <input
                    name="brand" value={form.brand} onChange={handleChange} required
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
                    placeholder="Renault"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Modèle *</label>
                  <input
                    name="model" value={form.model} onChange={handleChange} required
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
                    placeholder="Clio"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Année</label>
                  <input
                    name="year" value={form.year} onChange={handleChange} type="number" min="1990" max="2030"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
                    placeholder="2022"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Immatriculation</label>
                  <input
                    name="licensePlate" value={form.licensePlate} onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
                    placeholder="AB-123-CD"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Kilométrage actuel *</label>
                <input
                  name="mileage" value={form.mileage} onChange={handleChange} required type="number" min="0"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
                  placeholder="15000"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-gray-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit" disabled={submitting || !form.vin || !form.brand || !form.model || !form.mileage}
                  className="flex-1 py-2 rounded-lg font-medium text-white text-sm transition disabled:opacity-60"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {submitting ? 'Création…' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
