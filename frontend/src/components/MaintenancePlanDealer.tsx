import { useEffect, useState } from 'react'
import { Plus, CheckCircle2, Pencil, Trash2, AlertTriangle, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import api from '../services/api'
import type { PlanItem } from '../types/maintenance'

// Preset operations with default intervals (constructeur presets)
const PRESETS = [
  { label: 'Vidange + filtre à huile', intervalKm: 15000, intervalMonths: 12 },
  { label: 'Filtre à air', intervalKm: 30000, intervalMonths: 24 },
  { label: 'Filtre d\'habitacle', intervalKm: 20000, intervalMonths: 12 },
  { label: 'Filtre à carburant', intervalKm: 30000, intervalMonths: 24 },
  { label: 'Plaquettes de frein avant', intervalKm: 40000, intervalMonths: null },
  { label: 'Plaquettes de frein arrière', intervalKm: 60000, intervalMonths: null },
  { label: 'Courroie de distribution', intervalKm: 120000, intervalMonths: 60 },
  { label: 'Liquide de frein', intervalKm: null, intervalMonths: 24 },
  { label: 'Liquide de refroidissement', intervalKm: null, intervalMonths: 48 },
  { label: 'Pneumatiques', intervalKm: 40000, intervalMonths: null },
  { label: 'Bougies d\'allumage', intervalKm: 30000, intervalMonths: null },
  { label: 'Contrôle technique', intervalKm: null, intervalMonths: 24 },
]

interface FormState {
  operationType: string
  dueDate: string
  intervalKm: string
  intervalMonths: string
  lastDoneKm: string
  lastDoneDate: string
  notes: string
}

const EMPTY_FORM: FormState = {
  operationType: '', dueDate: '', intervalKm: '', intervalMonths: '',
  lastDoneKm: '', lastDoneDate: '', notes: '',
}

function statusColor(s: PlanItem['status']) {
  if (s === 'overdue') return 'text-red-600 bg-red-50 border-red-200'
  if (s === 'soon') return 'text-amber-600 bg-amber-50 border-amber-200'
  return 'text-green-700 bg-green-50 border-green-200'
}

function StatusIcon({ status }: { status: PlanItem['status'] }) {
  if (status === 'overdue') return <AlertTriangle size={14} className="shrink-0" />
  if (status === 'soon') return <Clock size={14} className="shrink-0" />
  return <CheckCircle2 size={14} className="shrink-0" />
}

function statusLabel(item: PlanItem): string {
  if (item.status === 'overdue') {
    const parts: string[] = []
    if (item.alertKm !== null) parts.push(`${Math.abs(item.alertKm).toLocaleString('fr-FR')} km de retard`)
    if (item.alertDays !== null) parts.push(`${Math.abs(item.alertDays)} j de retard`)
    return parts.join(' · ')
  }
  if (item.status === 'soon') {
    const parts: string[] = []
    if (item.alertKm !== null) parts.push(`dans ${item.alertKm.toLocaleString('fr-FR')} km`)
    if (item.alertDays !== null) parts.push(`dans ${item.alertDays} j`)
    return parts.join(' · ')
  }
  const parts: string[] = []
  if (item.nextDueKm !== null) parts.push(`à ${item.nextDueKm.toLocaleString('fr-FR')} km`)
  if (item.nextDueDate !== null)
    parts.push(new Date(item.nextDueDate).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }))
  return parts.join(' · ') || 'À jour'
}

interface Props {
  vehicleId: string
  currentMileage: number
}

export default function MaintenancePlanDealer({ vehicleId, currentMileage }: Props) {
  const [items, setItems] = useState<PlanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [showMarkDone, setShowMarkDone] = useState<string | null>(null)
  const [markDoneKm, setMarkDoneKm] = useState(String(currentMileage))
  const [markDoneDate, setMarkDoneDate] = useState(new Date().toISOString().slice(0, 10))

  async function load() {
    const res = await api.get<PlanItem[]>(`/vehicles/${vehicleId}/plan`)
    setItems(res.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [vehicleId])

  function openCreate() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setShowPresets(false)
    setShowForm(true)
  }

  function openEdit(item: PlanItem) {
    setEditId(item.id)
    setForm({
      operationType: item.operationType,
      dueDate: item.dueDate ? item.dueDate.slice(0, 10) : '',
      intervalKm: item.intervalKm != null ? String(item.intervalKm) : '',
      intervalMonths: item.intervalMonths != null ? String(item.intervalMonths) : '',
      lastDoneKm: item.lastDoneKm != null ? String(item.lastDoneKm) : '',
      lastDoneDate: item.lastDoneDate ? item.lastDoneDate.slice(0, 10) : '',
      notes: item.notes ?? '',
    })
    setShowPresets(false)
    setShowForm(true)
  }

  function applyPreset(p: typeof PRESETS[number]) {
    setForm(f => ({
      ...f,
      operationType: p.label,
      intervalKm: p.intervalKm != null ? String(p.intervalKm) : '',
      intervalMonths: p.intervalMonths != null ? String(p.intervalMonths) : '',
    }))
    setShowPresets(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const body = {
      operationType: form.operationType,
      dueDate: form.dueDate || undefined,
      intervalKm: form.intervalKm ? parseInt(form.intervalKm) : undefined,
      intervalMonths: form.intervalMonths ? parseInt(form.intervalMonths) : undefined,
      lastDoneKm: form.lastDoneKm ? parseInt(form.lastDoneKm) : undefined,
      lastDoneDate: form.lastDoneDate || undefined,
      notes: form.notes || undefined,
    }
    try {
      if (editId) {
        await api.patch(`/vehicles/${vehicleId}/plan/${editId}`, body)
      } else {
        await api.post(`/vehicles/${vehicleId}/plan`, body)
      }
      setShowForm(false)
      setEditId(null)
      setForm(EMPTY_FORM)
      load()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleMarkDone(itemId: string) {
    await api.post(`/vehicles/${vehicleId}/plan/${itemId}/done`, {
      doneAtKm: parseInt(markDoneKm) || undefined,
      doneAtDate: markDoneDate || undefined,
    })
    setShowMarkDone(null)
    load()
  }

  async function handleDelete(itemId: string) {
    if (!confirm('Supprimer cette opération du plan ?')) return
    await api.delete(`/vehicles/${vehicleId}/plan/${itemId}`)
    load()
  }

  const overdue = items.filter(i => i.status === 'overdue')
  const soon = items.filter(i => i.status === 'soon')
  const ok = items.filter(i => i.status === 'ok')
  const sorted = [...overdue, ...soon, ...ok]

  return (
    <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-[var(--color-text-primary)]">Plan d'entretien</h3>
          {!loading && (
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              {overdue.length > 0 && <span className="text-red-600 font-medium">{overdue.length} en retard · </span>}
              {soon.length > 0 && <span className="text-amber-600 font-medium">{soon.length} bientôt · </span>}
              {ok.length} à jour
            </p>
          )}
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-white transition"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <Plus size={13} />
          Ajouter
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-text-secondary)]">Chargement…</p>
      ) : sorted.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-[var(--color-text-secondary)]">Aucune opération planifiée.</p>
          <button onClick={openCreate} className="mt-2 text-sm font-medium underline" style={{ color: 'var(--color-primary)' }}>
            Ajouter la première opération
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(item => (
            <div key={item.id} className="rounded-lg border border-[var(--color-border)] p-4 hover:bg-gray-50 transition">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{item.operationType}</p>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor(item.status)}`}>
                      <StatusIcon status={item.status} />
                      {statusLabel(item)}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
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
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => { setShowMarkDone(item.id); setMarkDoneKm(String(currentMileage)); setMarkDoneDate(new Date().toISOString().slice(0, 10)) }}
                    title="Marquer comme fait"
                    className="p-1.5 rounded-md text-green-600 hover:bg-green-50 transition"
                  >
                    <CheckCircle2 size={15} />
                  </button>
                  <button
                    onClick={() => openEdit(item)}
                    title="Modifier"
                    className="p-1.5 rounded-md text-[var(--color-text-secondary)] hover:bg-gray-100 transition"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    title="Supprimer"
                    className="p-1.5 rounded-md text-red-500 hover:bg-red-50 transition"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl border border-[var(--color-border)] p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">
              {editId ? 'Modifier l\'opération' : 'Ajouter une opération'}
            </h3>

            {/* Presets */}
            {!editId && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setShowPresets(v => !v)}
                  className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] mb-2"
                >
                  {showPresets ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  Préconisations constructeur
                </button>
                {showPresets && (
                  <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {PRESETS.map(p => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => applyPreset(p)}
                        className="text-left text-sm px-3 py-2 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-green-50 transition"
                      >
                        <span className="font-medium">{p.label}</span>
                        <span className="text-[var(--color-text-secondary)] ml-2 text-xs">
                          {[p.intervalKm && `${p.intervalKm.toLocaleString('fr-FR')} km`, p.intervalMonths && `${p.intervalMonths} mois`].filter(Boolean).join(' · ')}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Opération *</label>
                <input
                  value={form.operationType}
                  onChange={e => setForm(f => ({ ...f, operationType: e.target.value }))}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
                  placeholder="Ex : Vidange + filtre à huile"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Date d'échéance</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
                />
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">Prioritaire sur les intervalles. La couleur change à l'approche de la date.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Intervalle km <span className="font-normal text-[var(--color-text-secondary)]">(optionnel)</span></label>
                  <input
                    type="number" min="1"
                    value={form.intervalKm}
                    onChange={e => setForm(f => ({ ...f, intervalKm: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
                    placeholder="15000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Intervalle mois <span className="font-normal text-[var(--color-text-secondary)]">(optionnel)</span></label>
                  <input
                    type="number" min="1"
                    value={form.intervalMonths}
                    onChange={e => setForm(f => ({ ...f, intervalMonths: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
                    placeholder="12"
                  />
                </div>
              </div>

              <div className="border-t border-[var(--color-border)] pt-3">
                <p className="text-xs text-[var(--color-text-secondary)] mb-3">Dernière réalisation (optionnel — sert de base au calcul)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Kilométrage</label>
                    <input
                      type="number" min="0"
                      value={form.lastDoneKm}
                      onChange={e => setForm(f => ({ ...f, lastDoneKm: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
                      placeholder="12000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Date</label>
                    <input
                      type="date"
                      value={form.lastDoneDate}
                      onChange={e => setForm(f => ({ ...f, lastDoneDate: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Note</label>
                <input
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
                  placeholder="Informations complémentaires…"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY_FORM) }}
                  className="flex-1 py-2 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-gray-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting || !form.operationType || (!form.dueDate && !form.intervalKm && !form.intervalMonths)}
                  className="flex-1 py-2 rounded-lg font-medium text-white text-sm transition disabled:opacity-60"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {submitting ? 'Enregistrement…' : editId ? 'Mettre à jour' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mark done modal */}
      {showMarkDone && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl border border-[var(--color-border)] p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">Marquer comme effectué</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Kilométrage au moment de l'opération</label>
                <input
                  type="number" min="0"
                  value={markDoneKm}
                  onChange={e => setMarkDoneKm(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Date de réalisation</label>
                <input
                  type="date"
                  value={markDoneDate}
                  onChange={e => setMarkDoneDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowMarkDone(null)}
                  className="flex-1 py-2 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-gray-50 transition"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleMarkDone(showMarkDone!)}
                  className="flex-1 py-2 rounded-lg font-medium text-white text-sm transition"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
