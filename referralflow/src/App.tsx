import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/AppLayout'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Dashboard } from './pages/app/Dashboard'
import { SendReferral } from './pages/app/SendReferral'
import { Partners } from './pages/app/Partners'
import { ReferralsList } from './pages/app/ReferralsList'
import { ReferralDetail } from './pages/app/ReferralDetail'
import { Profile } from './pages/app/Profile'
import { Notifications } from './pages/app/Notifications'
import { CommissionAgreement } from './pages/app/CommissionAgreement'
import { ConnectPage } from './pages/Connect'
import { AdminDashboard } from './pages/admin/AdminDashboard'

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/connect/:username" element={<ConnectPage />} />

      {/* Protected app routes */}
      <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="send" element={<SendReferral />} />
        <Route path="partners" element={<Partners />} />
        <Route path="partners/:id/agreement" element={<CommissionAgreement />} />
        <Route path="referrals" element={<ReferralsList />} />
        <Route path="referrals/:id" element={<ReferralDetail />} />
        <Route path="profile" element={<Profile />} />
        <Route path="notifications" element={<Notifications />} />
      </Route>

      {/* Admin */}
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  )
}
