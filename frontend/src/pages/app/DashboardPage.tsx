import { useEffect, useState } from 'react'
import { Car, Calendar, FileText, Gauge, Plus } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import MaintenancePlanDriver from '../../components/MaintenancePlanDriver'
import NotificationSettings from '../../components/NotificationSettings'
import LogbookDriver from './LogbookPage'
import { registerServiceWorker } from '../../services/push'

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

export default function DriverDashboardPage() {
  const { user, logout } = useAuth()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)

  // Mileage declaration modal
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
  const lastMaintenance = vehicle?.maintenanceRecords[0] ?? null
  const mileagePercent = contract ? Math.min(100, Math.round((vehicle!.mileage / contract.mileageLimit) * 100)) : null

  async function handleAddMileage(e: React.FormEvent) {
    e.preventDefault()
    if (!vehicle || !mileageValue) return
    setSubmitting(true)
    setMileageError(null)
    try {
      await api.post(`/vehicles/${vehicle.id}/mileage`, {
        mileage: parseInt(mileageValue),
        note: mileageNote || undefined,
      })
      setMileageSuccess(true)
      setShowMileage(false)
      setMileageValue('')
      setMileageNote('')
      loadVehicles()
      setTimeout(() => setMileageSuccess(false), 4000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setMileageError(msg ?? 'Erreur lors de l\'enregistrement.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] px-6 py-4 flex justify-between items-center">
        <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Flywheel — Mon espace</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[var(--color-text-secondary)]">{user?.email}</span>
          <button
            onClick={logout}
            className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">Bonjour</h2>
        <p className="text-[var(--color-text-secondary)] mb-8">
          Votre espace de suivi d'entretien et de gestion de contrat.
        </p>

        {mileageSuccess && (
          <div className="mb-6 p-4 rounded-lg border bg-green-50 border-green-200 text-green-700 text-sm">
            Relevé kilométrique enregistré avec succès.
          </div>
        )}

        {loading ? (
          <div className="text-center py-10 text-[var(--color-text-secondary)]">Chargement…</div>
        ) : !vehicle ? (
          <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-10 text-center">
            <Car size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-[var(--color-text-secondary)]">Aucun véhicule associé à votre compte pour le moment.</p>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">Contactez votre concessionnaire.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Vehicle card */}
            <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Car size={20} className="text-[var(--color-primary)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                      {vehicle.brand} {vehicle.model}
                      {vehicle.year && <span className="font-normal text-[var(--color-text-secondary)] ml-1">({vehicle.year})</span>}
                    </h3>
                    {vehicle.licensePlate && (
                      <p className="text-sm text-[var(--color-text-secondary)]">{vehicle.licensePlate}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => { setMileageValue(String(vehicle.mileage)); setShowMileage(true) }}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-white transition"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <Plus size={13} />
                  Déclarer mon kilométrage
                </button>
              </div>

              <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
                <div>
                  <dt className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">VIN</dt>
                  <dd className="text-sm font-mono text-[var(--color-text-primary)] break-all">{vehicle.vin}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Kilométrage actuel</dt>
                  <dd className="text-sm font-medium text-[var(--color-text-primary)]">{vehicle.mileage.toLocaleString('fr-FR')} km</dd>
                </div>
                {contract && (
                  <div>
                    <dt className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Contrat</dt>
                    <dd className="text-sm text-[var(--color-text-primary)]">{contract.type} — {contract.mileageLimit.toLocaleString('fr-FR')} km</dd>
                  </div>
                )}
              </dl>

              {/* Mileage bar */}
              {contract && mileagePercent !== null && (
                <div>
                  <div className="flex justify-between text-xs text-[var(--color-text-secondary)] mb-1.5">
                    <span>Utilisation du forfait kilométrique</span>
                    <span className={mileagePercent >= 90 ? 'text-red-600 font-semibold' : mileagePercent >= 70 ? 'text-amber-600 font-semibold' : 'font-medium'}>
                      {mileagePercent}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-3 rounded-full transition-all"
                      style={{
                        width: `${mileagePercent}%`,
                        backgroundColor: mileagePercent >= 90 ? '#ef4444' : mileagePercent >= 70 ? '#f59e0b' : 'var(--color-primary)',
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-[var(--color-text-secondary)] mt-1">
                    <span>{vehicle.mileage.toLocaleString('fr-FR')} km parcourus</span>
                    <span>{(contract.mileageLimit - vehicle.mileage).toLocaleString('fr-FR')} km restants</span>
                  </div>
                </div>
              )}
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Gauge size={16} className="text-[var(--color-primary)]" />
                  <p className="text-sm font-medium text-[var(--color-text-secondary)]">Km parcourus en contrat</p>
                </div>
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                  +{(vehicle.mileage - vehicle.initialMileage).toLocaleString('fr-FR')} km
                </p>
              </div>

              <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={16} className="text-[var(--color-primary)]" />
                  <p className="text-sm font-medium text-[var(--color-text-secondary)]">Fin de contrat</p>
                </div>
                {contract ? (
                  <>
                    <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                      {new Date(contract.endDate).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                      {Math.max(0, Math.ceil((new Date(contract.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} jours restants
                    </p>
                  </>
                ) : (
                  <p className="text-2xl font-bold text-[var(--color-text-primary)]">—</p>
                )}
              </div>

              <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={16} className="text-[var(--color-primary)]" />
                  <p className="text-sm font-medium text-[var(--color-text-secondary)]">Dernier entretien</p>
                </div>
                {lastMaintenance ? (
                  <>
                    <p className="text-lg font-bold text-[var(--color-text-primary)]">{lastMaintenance.type}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                      {new Date(lastMaintenance.date).toLocaleDateString('fr-FR')} · {lastMaintenance.cost.toFixed(2)} €
                    </p>
                  </>
                ) : (
                  <p className="text-2xl font-bold text-[var(--color-text-primary)]">—</p>
                )}
              </div>
            </div>

            {/* Recent mileage records */}
            {vehicle.mileageRecords.length > 0 && (
              <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">
                <h3 className="font-semibold text-[var(--color-text-primary)] mb-4">Mes relevés kilométriques</h3>
                <div className="space-y-2">
                  {vehicle.mileageRecords.map((r, i) => (
                    <div key={r.id} className={`flex items-center justify-between py-2.5 ${i !== vehicle.mileageRecords.length - 1 ? 'border-b border-[var(--color-border)]' : ''}`}>
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">{r.mileage.toLocaleString('fr-FR')} km</p>
                        {r.note && <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{r.note}</p>}
                      </div>
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {new Date(r.recordedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Maintenance history */}
            {vehicle.maintenanceRecords.length > 0 && (
              <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">
                <h3 className="font-semibold text-[var(--color-text-primary)] mb-4">Historique d'entretien</h3>
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
              </div>
            )}

            {/* Maintenance plan (read-only) */}
            <MaintenancePlanDriver vehicleId={vehicle.id} />

            {/* Logbook */}
            <LogbookDriver vehicleId={vehicle.id} />

            {/* Notification preferences */}
            <NotificationSettings />
          </div>
        )}
      </main>

      {/* Mileage modal */}
      {showMileage && vehicle && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl border border-[var(--color-border)] p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">Déclarer mon kilométrage</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-5">
              Kilométrage actuel enregistré : <strong>{vehicle.mileage.toLocaleString('fr-FR')} km</strong>
            </p>
            {mileageError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {mileageError}
              </div>
            )}
            <form onSubmit={handleAddMileage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Nouveau kilométrage (km) *</label>
                <input
                  type="number"
                  min={vehicle.mileage}
                  value={mileageValue}
                  onChange={e => setMileageValue(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
                  placeholder={String(vehicle.mileage)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Note (optionnel)</label>
                <input
                  type="text"
                  value={mileageNote}
                  onChange={e => setMileageNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
                  placeholder="Ex : lecture au compteur ce jour"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowMileage(false); setMileageError(null); setMileageValue(''); setMileageNote('') }}
                  className="flex-1 py-2 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-gray-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting || !mileageValue}
                  className="flex-1 py-2 rounded-lg font-medium text-white text-sm transition disabled:opacity-60"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {submitting ? 'Enregistrement…' : 'Confirmer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
