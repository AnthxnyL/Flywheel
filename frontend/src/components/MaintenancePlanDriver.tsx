import { useEffect, useState } from 'react'
import { AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'
import api from '../services/api'
import type { PlanItem } from '../types/maintenance'

function statusStyle(s: PlanItem['status']): { border: string; bg: string; dot: string } {
  if (s === 'overdue') return { border: 'rgba(217,48,37,0.2)', bg: '#FEF0EF', dot: '#D93025' }
  if (s === 'soon') return { border: 'rgba(232,151,13,0.2)', bg: '#FEF6E7', dot: '#E8970D' }
  return { border: 'rgba(45,189,122,0.2)', bg: '#EDFAF4', dot: '#2DBD7A' }
}

function StatusBadge({ item }: { item: PlanItem }) {
  if (item.status === 'overdue') {
    const parts: string[] = []
    if (item.alertKm !== null) parts.push(`${Math.abs(item.alertKm).toLocaleString('fr-FR')} km de retard`)
    if (item.alertDays !== null) parts.push(`${Math.abs(item.alertDays)} j de retard`)
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#FEECEB', color: '#B01C1C', fontWeight: 600 }}>
        <AlertTriangle size={10} />
        {parts.join(' · ') || 'En retard'}
      </span>
    )
  }
  if (item.status === 'soon') {
    const parts: string[] = []
    if (item.alertKm !== null) parts.push(`dans ${item.alertKm.toLocaleString('fr-FR')} km`)
    if (item.alertDays !== null) parts.push(`J-${item.alertDays}`)
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#FEF6E7', color: '#8A5500', fontWeight: 600 }}>
        <Clock size={10} />
        {parts.join(' · ') || 'Bientôt'}
      </span>
    )
  }
  const parts: string[] = []
  if (item.nextDueKm !== null) parts.push(`à ${item.nextDueKm.toLocaleString('fr-FR')} km`)
  if (item.nextDueDate !== null)
    parts.push(new Date(item.nextDueDate).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }))
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#EDFAF4', color: '#1A7A4A', fontWeight: 600 }}>
      <CheckCircle2 size={10} />
      {parts.join(' · ') || 'À jour'}
    </span>
  )
}

interface Props {
  vehicleId: string
  currentMileage?: number
}

export default function MaintenancePlanDriver({ vehicleId, currentMileage = 0 }: Props) {
  const [items, setItems] = useState<PlanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmItem, setConfirmItem] = useState<PlanItem | null>(null)
  const [doneKm, setDoneKm] = useState(String(currentMileage))
  const [doneDate, setDoneDate] = useState(new Date().toISOString().slice(0, 10))
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    api.get<PlanItem[]>(`/vehicles/${vehicleId}/plan`)
      .then(res => setItems(res.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [vehicleId])

  async function handleMarkDone() {
    if (!confirmItem) return
    setSubmitting(true)
    try {
      await api.post(`/vehicles/${vehicleId}/plan/${confirmItem.id}/done`, {
        doneAtKm: parseInt(doneKm) || undefined,
        doneAtDate: doneDate || undefined,
      })
      setConfirmItem(null)
      load()
    } finally {
      setSubmitting(false)
    }
  }

  const overdue = items.filter(i => i.status === 'overdue')
  const soon = items.filter(i => i.status === 'soon')
  const ok = items.filter(i => i.status === 'ok')
  const sorted = [...overdue, ...soon, ...ok]

  if (loading) return null

  if (sorted.length === 0) return (
    <div style={{ background: 'white', borderRadius: 14, border: '1px solid rgba(0,0,0,0.07)', padding: '20px 22px' }}>
      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--fw-text)', marginBottom: 6 }}>Plan d'entretien</div>
      <p style={{ fontSize: 13, color: 'var(--fw-text-2)' }}>Aucun plan défini par votre concessionnaire.</p>
    </div>
  )

  return (
    <div style={{ background: 'white', borderRadius: 14, border: '1px solid rgba(0,0,0,0.07)', padding: '20px 22px' }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--fw-text)' }}>Plan d'entretien</div>
        <p style={{ fontSize: 12, color: 'var(--fw-text-2)', marginTop: 3 }}>
          {overdue.length > 0 && <span style={{ color: '#D93025', fontWeight: 600 }}>{overdue.length} en retard · </span>}
          {soon.length > 0 && <span style={{ color: '#E8970D', fontWeight: 600 }}>{soon.length} bientôt · </span>}
          <span>{ok.length} à jour</span>
          <span style={{ marginLeft: 8, color: 'var(--fw-text-3)' }}>· Appuyez pour valider</span>
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map(item => {
          const { border, bg, dot } = statusStyle(item.status)
          const dueDateStr = item.nextDueDate
            ? new Date(item.nextDueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
            : null
          return (
            <button
              key={item.id}
              onClick={() => { setConfirmItem(item); setDoneKm(String(currentMileage)); setDoneDate(new Date().toISOString().slice(0, 10)) }}
              style={{ width: '100%', textAlign: 'left', background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '13px 16px', cursor: 'pointer', transition: 'opacity 0.15s' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fw-text)' }}>{item.operationType}</span>
                    <StatusBadge item={item} />
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--fw-text-2)', paddingLeft: 16 }}>
                    {[
                      item.intervalKm && `Tous les ${item.intervalKm.toLocaleString('fr-FR')} km`,
                      item.intervalMonths && `tous les ${item.intervalMonths} mois`,
                    ].filter(Boolean).join(' · ')}
                    {dueDateStr && <span> · Échéance : <strong>{dueDateStr}</strong></span>}
                    {item.lastDoneDate && (
                      <span style={{ marginLeft: 4 }}>
                        · Dernière fois : {new Date(item.lastDoneDate).toLocaleDateString('fr-FR')}
                        {item.lastDoneKm != null && ` à ${item.lastDoneKm.toLocaleString('fr-FR')} km`}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--fw-text-3)', flexShrink: 0, marginTop: 2 }}>Valider ✓</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Confirmation modal */}
      {confirmItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,17,16,0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(3px)', padding: '40px 16px 16px' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }}>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 17, color: 'var(--fw-text)', marginBottom: 4 }}>
              ✓ Valider l'entretien
            </div>
            <div style={{ fontSize: 13, color: 'var(--fw-text-2)', marginBottom: 20 }}>{confirmItem.operationType}</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fw-text)', display: 'block', marginBottom: 6 }}>Kilométrage actuel</label>
                <input
                  type="number"
                  value={doneKm}
                  onChange={e => setDoneKm(e.target.value)}
                  style={{ width: '100%', fontSize: 13, background: 'var(--fw-bg)', border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '9px 12px', outline: 'none', boxSizing: 'border-box', fontFamily: "'JetBrains Mono', monospace" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fw-text)', display: 'block', marginBottom: 6 }}>Date de réalisation</label>
                <input
                  type="date"
                  value={doneDate}
                  onChange={e => setDoneDate(e.target.value)}
                  style={{ width: '100%', fontSize: 13, background: 'var(--fw-bg)', border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '9px 12px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                <button
                  onClick={() => setConfirmItem(null)}
                  style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--fw-text)', background: 'var(--fw-bg)', border: 'none', padding: '10px', borderRadius: 8, cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleMarkDone}
                  disabled={submitting}
                  style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'white', background: '#2DBD7A', border: 'none', padding: '10px', borderRadius: 8, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? 'Enregistrement…' : 'Confirmer la réalisation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
