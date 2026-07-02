import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const navLinks = [
  { to: '/',        icon: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z',         label: 'Painel'   },
  { to: '/triagem', icon: 'M3 6h18M7 12h10M11 18h4',                                label: 'Triagem'  },
  { to: '/funil',   icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7', label: 'Funil' },
]

export default function Layout({ children }) {
  const { logout, usuario } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const iniciais = usuario?.email?.slice(0, 2).toUpperCase() ?? 'US'

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-14 flex flex-col items-center py-3 gap-1 bg-white border-r border-gray-100 shrink-0">
        {/* Logo */}
        <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center mb-2">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>

        <div className="w-6 border-t border-gray-100 my-1" />

        {/* Navegação */}
        {navLinks.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={label}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'nav-item-active' : ''}`
            }
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
            </svg>
          </NavLink>
        ))}

        <div className="flex-1" />

        {/* Avatar + logout */}
        <button
          onClick={handleLogout}
          title="Sair"
          className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 text-xs font-semibold hover:bg-brand-100 transition-colors"
        >
          {iniciais}
        </button>
      </aside>

      {/* Conteúdo principal */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  )
}
