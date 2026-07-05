import { useEffect, useState } from 'react'
import { Car, Calendar, FileText, Gauge } from 'lucide-react'
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
  contracts: { id: string; type: string; startDate: string; endDate: string; mileageLimit: number }[]
  maintenanceRecords: { id: string; date: string; type: string; cost: number }[]
}

export default function DriverDashboardPage() {
  const { user, logout } = useAuth()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Vehicle[]>('/vehicles/mine')
      .then(res => setVehicles(res.data))
      .finally(() => setLoading(false))
  }, [])

  const vehicle = vehicles[0] ?? null
  const contract = vehicle?.contracts[0] ?? null
  const lastMaintenance = vehicle?.maintenanceRecords[0] ?? null

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
              <div className="flex items-center gap-3 mb-5">
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

              <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <dt className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">VIN</dt>
                  <dd className="text-sm font-mono text-[var(--color-text-primary)] break-all">{vehicle.vin}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Kilométrage</dt>
                  <dd className="text-sm font-medium text-[var(--color-text-primary)]">{vehicle.mileage.toLocaleString('fr-FR')} km</dd>
                </div>
                {contract && (
                  <div>
                    <dt className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Contrat</dt>
                    <dd className="text-sm text-[var(--color-text-primary)]">{contract.type} — {contract.mileageLimit.toLocaleString('fr-FR')} km</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Gauge size={16} className="text-[var(--color-primary)]" />
                  <p className="text-sm font-medium text-[var(--color-text-secondary)]">Kilométrage contrat</p>
                </div>
                {contract ? (
                  <>
                    <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                      {Math.round((vehicle.mileage / contract.mileageLimit) * 100)}%
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                      {vehicle.mileage.toLocaleString('fr-FR')} / {contract.mileageLimit.toLocaleString('fr-FR')} km
                    </p>
                  </>
                ) : (
                  <p className="text-2xl font-bold text-[var(--color-text-primary)]">—</p>
                )}
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
          </div>
        )}
      </main>
    </div>
  )
}
