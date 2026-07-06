import { useEffect, useState } from 'react'
import { Wrench, Gauge, FileText, AlertTriangle, ClipboardList, BookOpen, ExternalLink } from 'lucide-react'
import api from '../../services/api'

interface TimelineEvent {
  id: string
  source: 'entry' | 'mileage' | 'maintenance'
  type: string
  date: string
  title: string
  description: string | null
  mileageAtEvent: number | null
  cost: number | null
  documentUrl: string | null
}

const TYPE_META: Record<string, { label: string; icon: React.ElementType; colors: string }> = {
  MAINTENANCE:    { label: 'Entretien',             icon: Wrench,       colors: 'bg-blue-100 text-blue-700' },
  REPAIR:         { label: 'Réparation',            icon: Wrench,       colors: 'bg-orange-100 text-orange-700' },
  INSPECTION:     { label: 'Contrôle technique',    icon: ClipboardList,colors: 'bg-purple-100 text-purple-700' },
  RECALL:         { label: 'Rappel constructeur',   icon: AlertTriangle,colors: 'bg-red-100 text-red-700' },
  MILEAGE_UPDATE: { label: 'Relevé km',             icon: Gauge,        colors: 'bg-slate-100 text-slate-600' },
  DOCUMENT:       { label: 'Document',              icon: FileText,     colors: 'bg-green-100 text-green-700' },
  NOTE:           { label: 'Note',                  icon: BookOpen,     colors: 'bg-yellow-100 text-yellow-700' },
}

function groupByYear(events: TimelineEvent[]): Map<string, TimelineEvent[]> {
  const map = new Map<string, TimelineEvent[]>()
  for (const e of events) {
    const key = new Date(e.date).getFullYear().toString()
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(e)
  }
  return map
}

interface Props {
  vehicleId: string
}

export default function LogbookDriver({ vehicleId }: Props) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<TimelineEvent[]>(`/vehicles/${vehicleId}/logbook`)
      .then(r => setEvents(r.data))
      .finally(() => setLoading(false))
  }, [vehicleId])

  const totalCost = events.filter(e => e.cost != null).reduce((s, e) => s + e.cost!, 0)
  const grouped = groupByYear(events)

  if (loading) return null

  return (
    <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-[var(--color-text-primary)]">Carnet de vie</h3>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{events.length} événement{events.length !== 1 ? 's' : ''} enregistré{events.length !== 1 ? 's' : ''}</p>
        </div>
        {totalCost > 0 && (
          <div className="text-right">
            <p className="text-xs text-[var(--color-text-secondary)]">Total dépenses</p>
            <p className="font-bold text-[var(--color-text-primary)]">{totalCost.toFixed(2)} €</p>
          </div>
        )}
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)]">Aucun événement enregistré.</p>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([year, yearEvents]) => (
            <div key={year}>
              <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">{year}</p>
              <div className="relative">
                <div className="absolute left-3.5 top-0 bottom-0 w-px bg-[var(--color-border)]" />
                <div className="space-y-2">
                  {yearEvents.map(event => {
                    const meta = TYPE_META[event.type] ?? { label: event.type, icon: BookOpen, colors: 'bg-gray-100 text-gray-600' }
                    const Icon = meta.icon
                    return (
                      <div key={event.id} className="relative pl-9">
                        <div className="absolute left-2.5 top-3 w-2.5 h-2.5 rounded-full bg-[var(--color-border)] border-2 border-white" />
                        <div className="rounded-lg border border-[var(--color-border)] p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                              <span className={`shrink-0 w-6 h-6 rounded flex items-center justify-center ${meta.colors}`}>
                                <Icon size={11} />
                              </span>
                              <p className="text-sm font-medium text-[var(--color-text-primary)]">{event.title}</p>
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${meta.colors}`}>{meta.label}</span>
                            </div>
                            {event.documentUrl && (
                              <a href={event.documentUrl} target="_blank" rel="noopener noreferrer"
                                 className="shrink-0 p-1 rounded text-[var(--color-primary)] hover:bg-blue-50 transition">
                                <ExternalLink size={13} />
                              </a>
                            )}
                          </div>
                          {event.description && (
                            <p className="text-xs text-[var(--color-text-secondary)] mt-1.5 ml-8">{event.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5 ml-8 flex-wrap">
                            <span className="text-xs text-[var(--color-text-secondary)]">
                              {new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            {event.mileageAtEvent != null && (
                              <span className="text-xs text-[var(--color-text-secondary)]">· {event.mileageAtEvent.toLocaleString('fr-FR')} km</span>
                            )}
                            {event.cost != null && (
                              <span className="text-xs font-medium text-[var(--color-text-primary)]">· {event.cost.toFixed(2)} €</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
