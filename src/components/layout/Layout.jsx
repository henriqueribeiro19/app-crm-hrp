import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Outlet } from 'react-router-dom'
import { LayoutDashboard, Filter, GitBranch, Users, Crown, Archive, LogOut, Menu, X, Shield } from 'lucide-react'
import { useState } from 'react'

const NAV_BASE = [
  { to: '/', label: 'Painel', icon: LayoutDashboard },
  { to: '/triagem', label: 'Triagem', icon: Filter },
  { to: '/funil', label: 'Funil', icon: GitBranch },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/clientes', label: 'Clientes', icon: Crown },
  { to: '/arquivados', label: 'Arquivados', icon: Archive },
]

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { usuario, perfil, isAdmin, logout } = useAuth()
  const [menuAberto, setMenuAberto] = useState(false)

  // Adiciona link de admin se for admin
  const NAV = isAdmin 
    ? [...NAV_BASE, { to: '/admin', label: 'Admin', icon: Shield }]
    : NAV_BASE

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const isFunil = location.pathname === '/funil'

  return (
    <div className="min-h-screen bg-[#0a0c10] flex flex-col lg:flex-row">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-56 bg-surface-sidebar border-r border-white/[0.06] fixed h-full z-30 top-0 left-0">
        <div className="p-6 border-b border-white/[0.06]">
          <h1 className="text-xl font-bold text-gray-100 tracking-tight">APP CRM HRP</h1>
          <p className="text-xs text-gray-500 mt-1">Food Service & Varejo</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-accent/15 text-accent'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold shrink-0">
              {perfil?.nome?.[0]?.toUpperCase() || usuario?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-300 truncate">{perfil?.nome || usuario?.email || 'Usuário'}</p>
              {isAdmin && <p className="text-[10px] text-yellow-400">Administrador</p>}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/5 transition-colors"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-surface-sidebar border-b border-white/[0.06] h-16">
        <div className="flex items-center justify-between px-4 py-3 h-full">
          <h1 className="text-lg font-bold text-gray-100">APP CRM HRP</h1>
          <button onClick={() => setMenuAberto(!menuAberto)} className="p-2 text-gray-400 hover:text-gray-200">
            {menuAberto ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        {menuAberto && (
          <nav className="absolute top-16 left-0 right-0 bg-surface-sidebar border-b border-white/[0.06] px-4 pb-4 space-y-1 z-40">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMenuAberto(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-accent/15 text-accent'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/5 transition-colors"
            >
              <LogOut size={18} />
              Sair
            </button>
          </nav>
        )}
      </div>

      {/* Main Content */}
      <main className={`flex-1 lg:ml-56 w-full min-h-screen pt-16 lg:pt-0 ${isFunil ? '' : 'p-4 md:p-6 lg:p-8'}`}>
        <Outlet />
      </main>
    </div>
  )
}
