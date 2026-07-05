import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'

export default function DealerDashboardPage() {
  const { user, logout } = useAuth()

  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  async function handleCreateClient(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFeedback(null)
    try {
      await api.post('/auth/clients', { email, firstName, lastName })
      setFeedback({ type: 'success', msg: `Lien d'activation envoyé à ${email}` })
      setEmail(''); setFirstName(''); setLastName('')
      setShowForm(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFeedback({ type: 'error', msg: msg ?? 'Une erreur est survenue' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Flywheel</h1>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Back-office</span>
          </div>
          <nav className="flex items-center gap-1 ml-4">
            <Link to="/back-office/dashboard" className="text-sm font-medium text-[var(--color-primary)] bg-blue-50 px-3 py-1.5 rounded-md">
              Tableau de bord
            </Link>
            <Link to="/back-office/fleet" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] px-3 py-1.5 rounded-md hover:bg-gray-100 transition">
              Flotte
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[var(--color-text-secondary)]">{user?.email}</span>
          <button
            onClick={logout}
            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Tableau de bord</h2>
            <p className="text-[var(--color-text-secondary)] mt-1">Gérez vos clients et interventions.</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white text-sm transition"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <UserPlus size={16} />
            Ajouter un client
          </button>
        </div>

        {feedback && (
          <div className={`mb-6 p-4 rounded-lg border text-sm ${
            feedback.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {feedback.msg}
          </div>
        )}

        {/* Add client modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
            <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl border border-[var(--color-border)] p-6 w-full max-w-md">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">Ajouter un client</h3>
              <p className="text-sm text-[var(--color-text-secondary)] mb-5">
                Un email d'activation sera envoyé au client pour qu'il définisse son mot de passe.
              </p>

              <form onSubmit={handleCreateClient} className="space-y-4" noValidate>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Prénom</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition text-sm"
                      placeholder="Jean"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Nom</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition text-sm"
                      placeholder="Dupont"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition text-sm"
                    placeholder="client@exemple.fr"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-2 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-gray-50 transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="flex-1 py-2 rounded-lg font-medium text-white text-sm transition disabled:opacity-60"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    {loading ? 'Envoi…' : "Envoyer l'invitation"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['Véhicules en atelier', 'Interventions du jour', 'Clients actifs'].map((label) => (
            <div key={label} className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
              <p className="text-sm text-[var(--color-text-muted)]">{label}</p>
              <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">—</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
