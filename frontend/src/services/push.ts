import api from './api'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  return navigator.serviceWorker.register('/sw.js')
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.ready
  const { publicKey } = await api.get<{ publicKey: string }>('/notifications/vapid-public-key').then(r => r.data)
  const existing = await reg.pushManager.getSubscription()
  if (existing) return existing

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
  })

  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
  await api.post('/notifications/push-subscription', {
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
  })

  return sub
}

export async function unsubscribeFromPush(): Promise<void> {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  await api.delete('/notifications/push-subscription', { data: { endpoint: sub.endpoint } })
  await sub.unsubscribe()
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window
}
