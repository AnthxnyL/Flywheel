import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function validatePassword(p: string): string {
  if (p.length < 8) return 'Au moins 8 caractères'
  if (!/[A-Z]/.test(p)) return 'Au moins une lettre majuscule'
  if (!/\d/.test(p)) return 'Au moins un chiffre'
  return ''
}

export default function RegisterPage() {
  const { register } = useAuth()


  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // Only dealers can self-register — drivers are created by their dealer
  const role = 'DEALER' as const
  const [passwordError, setPasswordError] = useState('')
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  function handlePasswordChange(val: string) {
    setPassword(val)
    setPasswordError(validatePassword(val))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const pwdErr = validatePassword(password)
    if (pwdErr) { setPasswordError(pwdErr); return }

    setServerError('')
    setLoading(true)
    try {
      await register(email, password, role)
      setSuccess(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setServerError(msg ?? 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] px-4">
        <div className="w-full max-w-md bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-green-600 text-xl">✓</span>
          </div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">Vérifiez votre email</h2>
          <p className="text-[var(--color-text-secondary)]">
            Un lien de confirmation a été envoyé à <strong>{email}</strong>.<br />
            Cliquez dessus pour activer votre compte.
          </p>
          <Link to="/login" className="mt-6 inline-block text-[var(--color-primary)] font-medium hover:underline">
            Aller à la connexion
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] px-4">
      <div className="w-full max-w-md bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Espace concessionnaire</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">Créez votre compte back-office</p>
        </div>

        {serverError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Role is fixed to DEALER — drivers are invited by their dealer */}
          <div>
            <div className="p-3 rounded-lg border-2 border-[var(--color-primary)] bg-green-50">
              <p className="font-medium text-sm text-[var(--color-text-primary)]">Concessionnaire</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Accès au back-office atelier</p>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-2">
              Vous êtes un client particulier ?{' '}
              <span className="font-medium">Contactez votre concessionnaire</span> — il créera votre compte.
            </p>
          </div>

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
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1" htmlFor="password">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border bg-white text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition ${
                passwordError ? 'border-red-400' : 'border-[var(--color-border)]'
              }`}
              placeholder="••••••••"
            />
            {passwordError ? (
              <p className="mt-1 text-xs text-red-600">{passwordError}</p>
            ) : (
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                8 caractères minimum, 1 majuscule, 1 chiffre
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !!passwordError}
            className="w-full py-2.5 px-4 rounded-lg font-medium text-white transition disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {loading ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-[var(--color-primary)] font-medium hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
