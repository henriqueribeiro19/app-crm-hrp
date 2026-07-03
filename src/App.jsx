import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Painel from './pages/Painel'
import Leads from './pages/Leads'
import Triagem from './pages/Triagem'
import Funil from './pages/Funil'
import Clientes from './pages/Clientes'
import Arquivados from './pages/Arquivados'
import Admin from './pages/Admin'

function RotaProtegida() {
  const { usuario, carregando } = useAuth()
  if (carregando) {
    return (
      <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!usuario) return <Navigate to="/login" replace />
  return <Outlet />
}

function RotaAdmin() {
  const { usuario, perfil, carregando, isAdmin } = useAuth()
  if (carregando) {
    return (
      <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!usuario) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return <Outlet />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Rotas protegidas para usuários logados */}
      <Route element={<RotaProtegida />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Painel />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/triagem" element={<Triagem />} />
          <Route path="/funil" element={<Funil />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/arquivados" element={<Arquivados />} />
        </Route>
      </Route>

      {/* Rota admin (também usa Layout) */}
      <Route element={<RotaAdmin />}>
        <Route element={<Layout />}>
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
