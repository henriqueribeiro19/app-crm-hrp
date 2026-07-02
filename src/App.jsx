import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import RotaProtegida from './components/layout/RotaProtegida'
import Login   from './pages/Login'
import Painel  from './pages/Painel'
import Leads   from './pages/Leads'
import Triagem from './pages/Triagem'
import Funil   from './pages/Funil'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RotaProtegida />}>
            <Route path="/"        element={<Painel />}  />
            <Route path="/leads"   element={<Leads />}   />
            <Route path="/triagem" element={<Triagem />} />
            <Route path="/funil"   element={<Funil />}   />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
