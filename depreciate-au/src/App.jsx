import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import LandingPage from './pages/LandingPage'
import EstimateForm from './pages/EstimateForm'
import EstimateResults from './pages/EstimateResults'
import BriefConfirmation from './pages/BriefConfirmation'
import QSRegister from './pages/QSRegister'
import QSLogin from './pages/QSLogin'
import QSDashboard from './pages/QSDashboard'
import AdminDashboard from './pages/AdminDashboard'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/estimate" element={<EstimateForm />} />
        <Route path="/estimate/results" element={<EstimateResults />} />
        <Route path="/brief/confirmation" element={<BriefConfirmation />} />
        <Route path="/qs/register" element={<QSRegister />} />
        <Route path="/qs/login" element={<QSLogin />} />
        <Route path="/qs/dashboard" element={<QSDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>
    </Routes>
  )
}
