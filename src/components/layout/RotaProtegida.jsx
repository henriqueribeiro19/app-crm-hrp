import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function RotaProtegida() {
  const { usuario, carregando } = useAuth()

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0c10]">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!usuario) return <Navigate to="/login" replace />

  return <Outlet />
}
