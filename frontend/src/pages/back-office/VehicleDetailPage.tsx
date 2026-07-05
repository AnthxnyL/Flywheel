import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Car, User, Link2, Link2Off, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'

interface VehicleDetail {
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
  contracts: { id: string; type: string; startDate: string; endDate: string; mileageLimit: number }[]
  maintenanceRecords: { id: string; date: string; type: string; cost: number }[]
}

interface Client {
  id: string
  email: string
  emailVerified: boolean
}

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showAssign, setShowAssign] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState('')
  const [assigning, setAssigning] = useState(false)
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

  useEffect(() => {
    loadVehicle()
    loadClients()
  }, [id])

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedDriver) return
    setAssigning(true)
    setFeedback(null)
    try {
      await api.post(`/vehicles/${id}/assign`, { driverId: selectedDriver })
      setFeedback({ type: 'success', msg: 'Véhicule assigné avec succès.' })
      setShowAssign(false)
      setSelectedDriver('')
      loadVehicle()
    } catch {
      setFeedback({ type: 'error', msg: "Impossible d'assigner ce véhicule." })
    } finally {
      setAssigning(false)
    }
  }

  async function handleUnassign() {
    if (!confirm('Désassigner ce véhicule de son client ?')) return
    setFeedback(null)
    try {
      await api.delete(`/vehicles/${id}/assign`)
      setFeedback({ type: 'success', msg: 'Véhicule désassigné.' })
      loadVehicle()
    } catch {
      setFeedback({ type: 'error', msg: 'Impossible de désassigner ce véhicule.' })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <p className="text-[var(--color-text-secondary)]">Chargement…</p>
      </div>
    )
  }

  if (!vehicle) return null

  const availableClients = clients.filter(c => c.emailVerified)

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
            <Link to="/back-office/fleet" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] px-3 py-1.5 rounded-md hover:bg-gray-100 transition">
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

      <main className="max-w-4xl mx-auto px-6 py-10">
        <Link to="/back-office/fleet" className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-6 w-fit">
          <ArrowLeft size={16} />
          Retour à la flotte
        </Link>

        {feedback && (
          <div className={`mb-6 p-4 rounded-lg border text-sm flex items-start gap-2 ${
            feedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
            {feedback.msg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Vehicle info */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Car size={20} className="text-[var(--color-primary)]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                    {vehicle.brand} {vehicle.model}
                  </h2>
                  {vehicle.year && <p className="text-sm text-[var(--color-text-secondary)]">{vehicle.year}</p>}
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">VIN</dt>
                  <dd className="text-sm font-mono text-[var(--color-text-primary)] break-all">{vehicle.vin}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Immatriculation</dt>
                  <dd className="text-sm text-[var(--color-text-primary)]">{vehicle.licensePlate ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Kilométrage</dt>
                  <dd className="text-sm text-[var(--color-text-primary)] font-medium">{vehicle.mileage.toLocaleString('fr-FR')} km</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Ajouté le</dt>
                  <dd className="text-sm text-[var(--color-text-primary)]">
                    {new Date(vehicle.createdAt).toLocaleDateString('fr-FR')}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Maintenance records */}
            <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">
              <h3 className="font-semibold text-[var(--color-text-primary)] mb-4">Historique d'entretien</h3>
              {vehicle.maintenanceRecords.length === 0 ? (
                <p className="text-sm text-[var(--color-text-secondary)]">Aucune intervention enregistrée.</p>
              ) : (
                <div className="space-y-3">
                  {vehicle.maintenanceRecords.map(r => (
                    <div key={r.id} className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">{r.type}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">{new Date(r.date).toLocaleDateString('fr-FR')}</p>
                      </div>
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">{r.cost.toFixed(2)} €</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Client card */}
          <div className="space-y-4">
            <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
              <h3 className="font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <User size={16} />
                Client assigné
              </h3>

              {vehicle.driver ? (
                <div className="space-y-3">
                  <p className="text-sm text-[var(--color-text-primary)] break-all">{vehicle.driver.email}</p>
                  <button
                    onClick={handleUnassign}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition"
                  >
                    <Link2Off size={14} />
                    Désassigner
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-[var(--color-text-secondary)]">Aucun client assigné à ce véhicule.</p>
                  <button
                    onClick={() => setShowAssign(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-white text-sm font-medium transition"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    <Link2 size={14} />
                    Assigner un client
                  </button>
                </div>
              )}
            </div>

            {/* Contracts */}
            {vehicle.contracts.length > 0 && (
              <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
                <h3 className="font-semibold text-[var(--color-text-primary)] mb-3">Contrats</h3>
                {vehicle.contracts.map(c => (
                  <div key={c.id} className="text-sm space-y-1">
                    <p className="font-medium text-[var(--color-text-primary)]">{c.type}</p>
                    <p className="text-[var(--color-text-secondary)]">
                      {new Date(c.startDate).toLocaleDateString('fr-FR')} → {new Date(c.endDate).toLocaleDateString('fr-FR')}
                    </p>
                    <p className="text-[var(--color-text-secondary)]">{c.mileageLimit.toLocaleString('fr-FR')} km max</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Assign modal */}
      {showAssign && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl border border-[var(--color-border)] p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">Assigner un client</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-5">
              Sélectionnez le client auquel rattacher ce véhicule.
            </p>
            <form onSubmit={handleAssign} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Client *</label>
                {availableClients.length === 0 ? (
                  <p className="text-sm text-amber-600">Aucun client activé disponible. Créez et activez un compte client d'abord.</p>
                ) : (
                  <select
                    value={selectedDriver}
                    onChange={e => setSelectedDriver(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
                    required
                  >
                    <option value="">Choisir un client…</option>
                    {availableClients.map(c => (
                      <option key={c.id} value={c.id}>{c.email}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button" onClick={() => { setShowAssign(false); setSelectedDriver('') }}
                  className="flex-1 py-2 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-gray-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit" disabled={assigning || !selectedDriver}
                  className="flex-1 py-2 rounded-lg font-medium text-white text-sm transition disabled:opacity-60"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {assigning ? 'Assignation…' : 'Confirmer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
