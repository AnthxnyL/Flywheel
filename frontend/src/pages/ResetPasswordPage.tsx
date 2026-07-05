import { FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../services/api'

function validatePassword(p: string): string {
  if (p.length < 8) return 'Au moins 8 caractères'
  if (!/[A-Z]/.test(p)) return 'Au moins une lettre majuscule'
  if (!/\d/.test(p)) return 'Au moins un chiffre'
  return ''
}

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!token) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <p className="text-[var(--color-text-secondary)]">Lien invalide. <Link to="/forgot-password" className="text-[var(--color-primary)] underline">Demander un nouveau lien</Link></p>
    </div>
  )

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const err = validatePassword(password)
    if (err) { setPasswordError(err); return }
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/reset-password', { token, password })
      navigate('/login', { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Lien expiré ou invalide.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] px-4">
      <div className="w-full max-w-md bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Nouveau mot de passe</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">Choisissez un nouveau mot de passe.</p>
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1" htmlFor="password">Nouveau mot de passe</label>
            <input id="password" type="password" autoComplete="new-password" required value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordError(validatePassword(e.target.value)) }}
              className={`w-full px-3 py-2 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition ${passwordError ? 'border-red-400' : 'border-[var(--color-border)]'}`}
              placeholder="••••••••" />
            {passwordError
              ? <p className="mt-1 text-xs text-red-600">{passwordError}</p>
              : <p className="mt-1 text-xs text-[var(--color-text-muted)]">8 caractères minimum, 1 majuscule, 1 chiffre</p>}
          </div>
          <button type="submit" disabled={loading || !!passwordError}
            className="w-full py-2.5 px-4 rounded-lg font-medium text-white transition disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-primary)' }}>
            {loading ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  )
}
