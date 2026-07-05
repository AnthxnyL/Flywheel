import { Navigate, Outlet } from 'react-router-dom'
import { type Role, useAuth } from '../contexts/AuthContext'

interface Props {
  allowedRoles: Role[]
}

const ROLE_HOME: Record<Role, string> = {
  DRIVER: '/app/dashboard',
  DEALER: '/back-office/dashboard',
  BRAND: '/app/dashboard',
}

export default function ProtectedRoute({ allowedRoles }: Props) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Not logged in → login page
  if (!user) return <Navigate to="/login" replace />

  // Wrong role → redirect to the user's own dashboard (never show a 403)
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={ROLE_HOME[user.role as Role]} replace />
  }

  return <Outlet />
}
