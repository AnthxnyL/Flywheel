import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Wrench, Gauge, FileText, AlertTriangle,
  ClipboardList, BookOpen, Trash2, ExternalLink,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
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
  author: { email: string; role: string } | null
}

interface Vehicle {
  id: string
  vin: string
  brand: string
  model: string
  year: number | null
  licensePlate: string | null
}

const ENTRY_TYPES = [
  { value: 'MAINTENANCE', label: 'Entretien', icon: Wrench },
  { value: 'REPAIR',      label: 'Réparation', icon: Wrench },
  { value: 'INSPECTION',  label: 'Contrôle technique', icon: ClipboardList },
  { value: 'RECALL',      label: 'Rappel constructeur', icon: AlertTriangle },
  { value: 'MILEAGE_UPDATE', label: 'Relevé km', icon: Gauge },
  { value: 'DOCUMENT',    label: 'Document', icon: FileText },
  { value: 'NOTE',        label: 'Note libre', icon: BookOpen },
] as const

type EntryTypeValue = typeof ENTRY_TYPES[number]['value']

function typeConfig(type: string) {
  const found = ENTRY_TYPES.find(t => t.value === type)
  return found ?? { value: type, label: type, icon: BookOpen }
}

function typeColors(type: string): string {
  switch (type) {
    case 'MAINTENANCE':    return 'bg-green-100 text-green-700'
    case 'REPAIR':         return 'bg-orange-100 text-orange-700'
    case 'INSPECTION':     return 'bg-purple-100 text-purple-700'
    case 'RECALL':         return 'bg-red-100 text-red-700'
    case 'MILEAGE_UPDATE': return 'bg-slate-100 text-slate-600'
    case 'DOCUMENT':       return 'bg-green-100 text-green-700'
    case 'NOTE':           return 'bg-yellow-100 text-yellow-700'
    default:               return 'bg-gray-100 text-gray-600'
  }
}

interface FormState {
  type: EntryTypeValue
  date: string
  title: string
  description: string
  mileageAtEvent: string
  cost: string
  documentUrl: string
}

const EMPTY_FORM: FormState = {
  type: 'MAINTENANCE',
  date: new Date().toISOString().slice(0, 10),
  title: '',
  description: '',
  mileageAtEvent: '',
  cost: '',
  documentUrl: '',
}

// Group events by year/month
function groupByMonth(events: TimelineEvent[]): Map<string, TimelineEvent[]> {
  const map = new Map<string, TimelineEvent[]>()
  for (const e of events) {
    const key = new Date(e.date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(e)
  }
  return map
}

export default function LogbookPage() {
  const { id: vehicleId } = useParams<{ id: string }>()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [filterType, setFilterType] = useState<string>('ALL')

  async function load() {
    try {
      const [vRes, lRes] = await Promise.all([
        api.get<Vehicle>(`/vehicles/${vehicleId}`),
        api.get<TimelineEvent[]>(`/vehicles/${vehicleId}/logbook`),
      ])
      setVehicle(vRes.data)
      setEvents(lRes.data)
    } catch {
      navigate('/back-office/fleet')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [vehicleId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post(`/vehicles/${vehicleId}/logbook`, {
        type: form.type,
        date: form.date,
        title: form.title,
        description: form.description || undefined,
        mileageAtEvent: form.mileageAtEvent ? parseInt(form.mileageAtEvent) : undefined,
        cost: form.cost ? parseFloat(form.cost) : undefined,
        documentUrl: form.documentUrl || undefined,
      })
      setShowForm(false)
      setForm(EMPTY_FORM)
      load()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(event: TimelineEvent) {
    if (event.source !== 'entry') return
    const rawId = event.id.replace('entry-', '')
    if (!confirm('Supprimer cette entrée du carnet ?')) return
    await api.delete(`/vehicles/${vehicleId}/logbook/${rawId}`)
    setEvents(ev => ev.filter(e => e.id !== event.id))
  }

  const filtered = filterType === 'ALL' ? events : events.filter(e => e.type === filterType)
  const grouped = groupByMonth(filtered)

  const totalCost = events
    .filter(e => e.cost != null)
    .reduce((sum, e) => sum + e.cost!, 0)

  if (loading) return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
      <p className="text-[var(--color-text-secondary)]">Chargement…</p>
    </div>
  )

  if (!vehicle) return null

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Flywheel</h1>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Back-office</span>
          </div>
          <nav className="flex items-center gap-1 ml-4">
            <Link to="/back-office/dashboard" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] px-3 py-1.5 rounded-md hover:bg-gray-100 transition">Tableau de bord</Link>
            <Link to="/back-office/fleet" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] px-3 py-1.5 rounded-md hover:bg-gray-100 transition">Flotte</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[var(--color-text-secondary)]">{user?.email}</span>
          <button onClick={logout} className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition">Déconnexion</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between mb-6">
          <div>
            <Link to={`/back-office/fleet/${vehicleId}`} className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-2 w-fit">
              <ArrowLeft size={16} />
              {vehicle.brand} {vehicle.model}
            </Link>
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Carnet de vie</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 font-mono">{vehicle.vin}</p>
          </div>
          <div className="flex items-center gap-3 mt-1">
            {totalCost > 0 && (
              <div className="text-right">
                <p className="text-xs text-[var(--color-text-secondary)]">Total dépenses</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)]">{totalCost.toFixed(2)} €</p>
              </div>
            )}
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white text-sm transition"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <Plus size={15} />
              Ajouter une entrée
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap mb-6">
          <button
            onClick={() => setFilterType('ALL')}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition ${filterType === 'ALL' ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-gray-50'}`}
          >
            Tout ({events.length})
          </button>
          {ENTRY_TYPES.map(t => {
            const count = events.filter(e => e.type === t.value).length
            if (count === 0) return null
            return (
              <button
                key={t.value}
                onClick={() => setFilterType(t.value)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition ${filterType === t.value ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-gray-50'}`}
              >
                {t.label} ({count})
              </button>
            )
          })}
        </div>

        {/* Timeline */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-[var(--color-text-secondary)]">Aucune entrée dans le carnet de vie.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Array.from(grouped.entries()).map(([month, monthEvents]) => (
              <div key={month}>
                <div className="flex items-center gap-3 mb-4">
                  <p className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">{month}</p>
                  <div className="flex-1 h-px bg-[var(--color-border)]" />
                </div>
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-[var(--color-border)]" />

                  <div className="space-y-3">
                    {monthEvents.map(event => {
                      const cfg = typeConfig(event.type)
                      const Icon = cfg.icon
                      const isEntry = event.source === 'entry'

                      return (
                        <div key={event.id} className="relative pl-10">
                          {/* Dot on the line */}
                          <div className={`absolute left-2.5 top-3 w-3 h-3 rounded-full border-2 border-white ${isEntry ? 'bg-[var(--color-primary)]' : 'bg-gray-300'}`} />

                          <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4 hover:shadow-sm transition">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0 flex-1">
                                <span className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${typeColors(event.type)}`}>
                                  <Icon size={13} />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{event.title}</p>
                                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${typeColors(event.type)}`}>{cfg.label}</span>
                                  </div>

                                  {event.description && (
                                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">{event.description}</p>
                                  )}

                                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                                    <span className="text-xs text-[var(--color-text-secondary)]">
                                      {new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                    {event.mileageAtEvent != null && (
                                      <span className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1">
                                        <Gauge size={11} />
                                        {event.mileageAtEvent.toLocaleString('fr-FR')} km
                                      </span>
                                    )}
                                    {event.cost != null && (
                                      <span className="text-xs font-medium text-[var(--color-text-primary)]">
                                        {event.cost.toFixed(2)} €
                                      </span>
                                    )}
                                    {event.author && (
                                      <span className="text-xs text-[var(--color-text-secondary)]">
                                        par {event.author.email}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {event.documentUrl && (
                                  <a
                                    href={event.documentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Voir le document"
                                    className="p-1.5 rounded-md text-[var(--color-primary)] hover:bg-green-50 transition"
                                  >
                                    <ExternalLink size={14} />
                                  </a>
                                )}
                                {isEntry && (
                                  <button
                                    onClick={() => handleDelete(event)}
                                    title="Supprimer"
                                    className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
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
      </main>

      {/* Add entry modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl border border-[var(--color-border)] p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-5">Ajouter une entrée au carnet</h3>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Type selector */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Type d'événement *</label>
                <div className="grid grid-cols-2 gap-2">
                  {ENTRY_TYPES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, type: t.value }))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition ${
                        form.type === t.value
                          ? 'border-[var(--color-primary)] bg-green-50 text-[var(--color-primary)]'
                          : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-gray-50'
                      }`}
                    >
                      <t.icon size={14} />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Titre *</label>
                  <input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
                    placeholder="Ex : Vidange + filtre à huile"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Date *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Kilométrage</label>
                  <input
                    type="number" min="0"
                    value={form.mileageAtEvent}
                    onChange={e => setForm(f => ({ ...f, mileageAtEvent: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
                    placeholder="15000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm resize-none"
                  placeholder="Détails de l'opération…"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Coût (€)</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={form.cost}
                    onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">URL document / facture</label>
                  <input
                    type="url"
                    value={form.documentUrl}
                    onChange={e => setForm(f => ({ ...f, documentUrl: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
                    placeholder="https://…"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
                  className="flex-1 py-2 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-gray-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting || !form.title || !form.date}
                  className="flex-1 py-2 rounded-lg font-medium text-white text-sm transition disabled:opacity-60"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {submitting ? 'Enregistrement…' : 'Ajouter au carnet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
