import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import RotaProtegida from './components/layout/RotaProtegida'

// Pages (criadas nas próximas etapas)
import Login from './pages/Login'
import Painel from './pages/Painel'
import Triagem from './pages/Triagem'
import Funil from './pages/Funil'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rota pública */}
          <Route path="/login" element={<Login />} />

          {/* Rotas protegidas — exigem login */}
          <Route element={<RotaProtegida />}>
            <Route path="/"        element={<Painel />} />
            <Route path="/triagem" element={<Triagem />} />
            <Route path="/funil"   element={<Funil />} />
          </Route>

          {/* Qualquer rota desconhecida vai para o painel */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
