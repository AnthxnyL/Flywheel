import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { login, user } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // If already logged in, redirect immediately
  if (user) {
    const dest = user.role === 'DEALER' ? '/back-office/dashboard' : '/app/dashboard'
    navigate(dest, { replace: true })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const loggedUser = await login(email, password)
      const dest = loggedUser.role === 'DEALER' ? '/back-office/dashboard' : '/app/dashboard'
      navigate(dest, { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] px-4">
      <div className="w-full max-w-md bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Flywheel</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">Connectez-vous à votre espace</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition"
              placeholder="vous@exemple.fr"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-[var(--color-text-primary)]" htmlFor="password">
                Mot de passe
              </label>
              <Link to="/forgot-password" className="text-sm text-[var(--color-primary)] hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg font-medium text-white transition disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
          Pas encore de compte ?{' '}
          <Link to="/register" className="text-[var(--color-primary)] font-medium hover:underline">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  )
}
