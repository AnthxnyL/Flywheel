import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../services/api'

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('Lien invalide.'); return }
    api.get(`/auth/verify-email?token=${token}`)
      .then(({ data }) => { setStatus('success'); setMessage(data.message) })
      .catch((err) => { setStatus('error'); setMessage(err?.response?.data?.message ?? 'Lien invalide ou expiré.') })
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] px-4">
      <div className="w-full max-w-md bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] p-8 text-center">
        {status === 'loading' && <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto" />}
        {status === 'success' && (
          <>
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4"><span className="text-green-600 text-xl">✓</span></div>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">Email vérifié !</h2>
            <p className="text-[var(--color-text-secondary)] mb-6">{message}</p>
            <Link to="/login" className="inline-block py-2.5 px-6 rounded-lg font-medium text-white" style={{ backgroundColor: 'var(--color-primary)' }}>Se connecter</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><span className="text-red-600 text-xl">✕</span></div>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">Erreur de vérification</h2>
            <p className="text-[var(--color-text-secondary)] mb-6">{message}</p>
            <Link to="/register" className="text-[var(--color-primary)] hover:underline">Créer un nouveau compte</Link>
          </>
        )}
      </div>
    </div>
  )
}
