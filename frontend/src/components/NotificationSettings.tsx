import { useEffect, useState } from 'react'
import { Bell, Mail, Smartphone, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import api from '../services/api'
import { isPushSupported, registerServiceWorker, subscribeToPush, unsubscribeFromPush } from '../services/push'

interface Preferences {
  emailEnabled: boolean
  pushEnabled: boolean
  remindJ30: boolean
  remindJ7: boolean
  remindJ1: boolean
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function NotificationSettings() {
  const [prefs, setPrefs] = useState<Preferences | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default')
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const pushSupported = isPushSupported()

  useEffect(() => {
    api.get<Preferences>('/notifications/preferences').then(r => setPrefs(r.data))
    if (pushSupported) {
      setPushPermission(Notification.permission)
      navigator.serviceWorker.ready.then(reg =>
        reg.pushManager.getSubscription().then(sub => setPushSubscribed(!!sub))
      )
    }
  }, [])

  async function save(updated: Preferences) {
    setPrefs(updated)
    setSaveStatus('saving')
    try {
      await api.put('/notifications/preferences', updated)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
    }
  }

  function toggle(key: keyof Preferences) {
    if (!prefs) return
    save({ ...prefs, [key]: !prefs[key] })
  }

  async function handlePushToggle() {
    if (!prefs) return
    setPushLoading(true)
    try {
      if (pushSubscribed) {
        await unsubscribeFromPush()
        setPushSubscribed(false)
        save({ ...prefs, pushEnabled: false })
      } else {
        await registerServiceWorker()
        const permission = await Notification.requestPermission()
        setPushPermission(permission)
        if (permission !== 'granted') return
        await subscribeToPush()
        setPushSubscribed(true)
        save({ ...prefs, pushEnabled: true })
      }
    } catch (err) {
      console.error('Push toggle failed', err)
    } finally {
      setPushLoading(false)
    }
  }

  if (!prefs) return null

  const delays = [
    { key: 'remindJ30' as const, label: 'J-30', desc: '30 jours avant' },
    { key: 'remindJ7'  as const, label: 'J-7',  desc: '7 jours avant' },
    { key: 'remindJ1'  as const, label: 'J-1',  desc: 'La veille' },
  ]

  return (
    <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <Bell size={16} className="text-[var(--color-primary)]" />
          Rappels d'entretien
        </h3>
        {saveStatus === 'saving' && <Loader2 size={14} className="animate-spin text-[var(--color-text-secondary)]" />}
        {saveStatus === 'saved'  && <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 size={13} /> Enregistré</span>}
        {saveStatus === 'error'  && <span className="flex items-center gap-1 text-xs text-red-600"><AlertCircle size={13} /> Erreur</span>}
      </div>

      {/* Channels */}
      <div className="space-y-3 mb-6">
        {/* Email */}
        <label className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border)] cursor-pointer hover:bg-gray-50 transition">
          <div className="flex items-center gap-3">
            <Mail size={16} className="text-[var(--color-text-secondary)]" />
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Email</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Rappels envoyés à votre adresse email</p>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={prefs.emailEnabled}
            onClick={() => toggle('emailEnabled')}
            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${prefs.emailEnabled ? 'bg-[var(--color-primary)]' : 'bg-gray-200'}`}
          >
            <span className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform ${prefs.emailEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
        </label>

        {/* Push */}
        <div className={`flex items-center justify-between p-3 rounded-lg border transition ${
          !pushSupported ? 'border-[var(--color-border)] opacity-50' : 'border-[var(--color-border)] hover:bg-gray-50'
        }`}>
          <div className="flex items-center gap-3">
            <Smartphone size={16} className="text-[var(--color-text-secondary)]" />
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Notifications push</p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {!pushSupported
                  ? 'Non supporté par ce navigateur'
                  : pushPermission === 'denied'
                  ? 'Permission refusée — réactivez dans les paramètres navigateur'
                  : 'Notifications sur cet appareil (mobile et desktop)'}
              </p>
            </div>
          </div>
          {pushSupported && pushPermission !== 'denied' && (
            <button
              role="switch"
              aria-checked={pushSubscribed}
              onClick={handlePushToggle}
              disabled={pushLoading}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-60 ${pushSubscribed ? 'bg-[var(--color-primary)]' : 'bg-gray-200'}`}
            >
              {pushLoading
                ? <Loader2 size={12} className="animate-spin m-auto text-white" />
                : <span className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform ${pushSubscribed ? 'translate-x-4' : 'translate-x-0.5'}`} />}
            </button>
          )}
        </div>
      </div>

      {/* Timing */}
      <div>
        <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">Délais de rappel</p>
        <div className="grid grid-cols-3 gap-2">
          {delays.map(d => (
            <button
              key={d.key}
              onClick={() => toggle(d.key)}
              className={`flex flex-col items-center gap-1 py-3 px-2 rounded-lg border text-center transition ${
                prefs[d.key]
                  ? 'border-[var(--color-primary)] bg-blue-50'
                  : 'border-[var(--color-border)] hover:bg-gray-50'
              }`}
            >
              <span className={`text-base font-bold ${prefs[d.key] ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
                {d.label}
              </span>
              <span className="text-xs text-[var(--color-text-secondary)]">{d.desc}</span>
              {prefs[d.key] && <CheckCircle2 size={12} className="text-[var(--color-primary)]" />}
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--color-text-secondary)] mt-2">
          S'applique aux opérations ayant un intervalle en mois. Les alertes kilométriques apparaissent directement dans le plan d'entretien.
        </p>
      </div>
    </div>
  )
}
