import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogIn, Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      await login(email, senha)
      navigate('/')
    } catch (err) {
      setErro(err.message || 'E-mail ou senha incorretos.')
    } finally {
      setCarregando(false)
    }
  }

  const inputClass = "w-full bg-surface border border-white/[0.08] rounded-xl px-4 py-3 pl-11 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all"

  return (
    <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/30 to-accent/10 mb-4">
            <Sparkles size={32} className="text-accent" />
          </div>
          <h1 className="text-3xl font-bold text-gray-100 mb-2">APP CRM HRP</h1>
          <p className="text-gray-400">Gestão de leads para food service e varejo</p>
        </div>

        {/* Card de login */}
        <div className="bg-surface-card border border-white/[0.08] rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-gray-100 mb-6">Entrar na plataforma</h2>

          {erro && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {erro}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type={mostrarSenha ? 'text' : 'password'}
                placeholder="Sua senha"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                className={inputClass}
                required
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full flex items-center justify-center gap-2 py-3 bg-accent text-black rounded-xl font-semibold hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              <LogIn size={18} />
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-2 gap-3">
          {[
            'Triagem de leads',
            'Funil de vendas',
            'Score automático',
            'Gestão de interações',
          ].map(feature => (
            <div key={feature} className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-1.5 h-1.5 rounded-full bg-accent/60" />
              {feature}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
