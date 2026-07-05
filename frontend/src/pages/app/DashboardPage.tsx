import { useAuth } from '../../contexts/AuthContext'

export default function DriverDashboardPage() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] px-6 py-4 flex justify-between items-center">
        <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Flywheel — Mon espace</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[var(--color-text-secondary)]">{user?.email}</span>
          <button onClick={logout} className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition">Déconnexion</button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Bonjour 👋</h2>
        <p className="text-[var(--color-text-secondary)]">Votre tableau de bord — suivi d'entretien et coffre-fort de factures.</p>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {['Prochain entretien', 'Factures stockées', 'Kilométrage contrat'].map((label) => (
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
