import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import ActivatePage from './pages/ActivatePage'
import DriverDashboardPage from './pages/app/DashboardPage'
import DealerDashboardPage from './pages/back-office/DashboardPage'
import FleetPage from './pages/back-office/FleetPage'
import VehicleDetailPage from './pages/back-office/VehicleDetailPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/activate" element={<ActivatePage />} />

          {/* Protected: DRIVER only */}
          <Route element={<ProtectedRoute allowedRoles={['DRIVER']} />}>
            <Route path="/app/dashboard" element={<DriverDashboardPage />} />
          </Route>

          {/* Protected: DEALER only */}
          <Route element={<ProtectedRoute allowedRoles={['DEALER']} />}>
            <Route path="/back-office/dashboard" element={<DealerDashboardPage />} />
            <Route path="/back-office/fleet" element={<FleetPage />} />
            <Route path="/back-office/fleet/:id" element={<VehicleDetailPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
