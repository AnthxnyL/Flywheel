import { useEffect, useState } from 'react'
import { AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'
import api from '../services/api'
import type { PlanItem } from '../types/maintenance'

function statusColor(s: PlanItem['status']) {
  if (s === 'overdue') return 'border-red-200 bg-red-50'
  if (s === 'soon') return 'border-amber-200 bg-amber-50'
  return 'border-[var(--color-border)] bg-white'
}

function StatusBadge({ item }: { item: PlanItem }) {
  if (item.status === 'overdue') {
    const parts: string[] = []
    if (item.alertKm !== null) parts.push(`${Math.abs(item.alertKm).toLocaleString('fr-FR')} km de retard`)
    if (item.alertDays !== null) parts.push(`${Math.abs(item.alertDays)} j de retard`)
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
        <AlertTriangle size={11} />
        {parts.join(' · ')}
      </span>
    )
  }
  if (item.status === 'soon') {
    const parts: string[] = []
    if (item.alertKm !== null) parts.push(`dans ${item.alertKm.toLocaleString('fr-FR')} km`)
    if (item.alertDays !== null) parts.push(`dans ${item.alertDays} j`)
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
        <Clock size={11} />
        {parts.join(' · ')}
      </span>
    )
  }
  const parts: string[] = []
  if (item.nextDueKm !== null) parts.push(`à ${item.nextDueKm.toLocaleString('fr-FR')} km`)
  if (item.nextDueDate !== null)
    parts.push(new Date(item.nextDueDate).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }))
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
      <CheckCircle2 size={11} />
      {parts.join(' · ') || 'À jour'}
    </span>
  )
}

interface Props {
  vehicleId: string
}

export default function MaintenancePlanDriver({ vehicleId }: Props) {
  const [items, setItems] = useState<PlanItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<PlanItem[]>(`/vehicles/${vehicleId}/plan`)
      .then(res => setItems(res.data))
      .finally(() => setLoading(false))
  }, [vehicleId])

  const overdue = items.filter(i => i.status === 'overdue')
  const soon = items.filter(i => i.status === 'soon')
  const ok = items.filter(i => i.status === 'ok')
  const sorted = [...overdue, ...soon, ...ok]

  if (loading) return null

  if (sorted.length === 0) return (
    <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">
      <h3 className="font-semibold text-[var(--color-text-primary)] mb-2">Plan d'entretien</h3>
      <p className="text-sm text-[var(--color-text-secondary)]">Aucun plan défini par votre concessionnaire.</p>
    </div>
  )

  return (
    <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">
      <div className="mb-4">
        <h3 className="font-semibold text-[var(--color-text-primary)]">Plan d'entretien</h3>
        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
          {overdue.length > 0 && <span className="text-red-600 font-medium">{overdue.length} opération{overdue.length > 1 ? 's' : ''} en retard · </span>}
          {soon.length > 0 && <span className="text-amber-600 font-medium">{soon.length} bientôt · </span>}
          {ok.length} à jour
        </p>
      </div>

      <div className="space-y-2">
        {sorted.map(item => (
          <div key={item.id} className={`rounded-lg border p-4 ${statusColor(item.status)}`}>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{item.operationType}</p>
                  <StatusBadge item={item} />
                </div>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {[
                    item.intervalKm && `Tous les ${item.intervalKm.toLocaleString('fr-FR')} km`,
                    item.intervalMonths && `tous les ${item.intervalMonths} mois`,
                  ].filter(Boolean).join(' · ')}
                  {item.lastDoneDate && (
                    <span className="ml-2">
                      · Dernière fois : {new Date(item.lastDoneDate).toLocaleDateString('fr-FR')}
                      {item.lastDoneKm != null && ` à ${item.lastDoneKm.toLocaleString('fr-FR')} km`}
                    </span>
                  )}
                </p>
                {item.notes && <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 italic">{item.notes}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
