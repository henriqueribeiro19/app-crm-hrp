import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login, esqueceuSenha } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail]       = useState('')
  const [senha, setSenha]       = useState('')
  const [erro, setErro]         = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mostraRecuperar, setMostraRecuperar] = useState(false)
  const [msgRecuperar, setMsgRecuperar]       = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      await login(email, senha)
      navigate('/')
    } catch {
      setErro('E-mail ou senha incorretos. Verifique e tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  const handleRecuperar = async (e) => {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      await esqueceuSenha(email)
      setMsgRecuperar('Enviamos um link de redefinição para ' + email)
    } catch {
      setErro('Não foi possível enviar o e-mail. Verifique o endereço.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* Painel esquerdo — identidade */}
      <div className="hidden md:flex w-96 flex-col bg-brand-600 px-10 py-12 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <span className="text-white font-semibold text-base tracking-wide">APP CRM HRP</span>
        </div>

        <h1 className="text-white text-2xl font-semibold leading-snug mb-3">
          Gestão de leads para<br />food service e varejo
        </h1>
        <p className="text-white/60 text-sm leading-relaxed mb-10">
          Organize, qualifique e converta seus leads do scraping em clientes Cloudfy e Cplung.
        </p>

        {/* Recursos */}
        <div className="flex flex-col gap-4 mt-auto">
          {[
            { icon: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm0 6a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z', label: 'Triagem de leads do scraping' },
            { icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7', label: 'Funil visual de vendas' },
            { icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', label: 'Contato direto pelo WhatsApp' },
            { icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z', label: 'Score e sugestão automática de produto' },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                </svg>
              </div>
              <span className="text-white/70 text-sm">{label}</span>
            </div>
          ))}
        </div>

        <p className="text-white/30 text-xs mt-10">Acesso restrito à equipe HRP</p>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Logo mobile */}
          <div className="flex items-center gap-2 mb-8 md:hidden">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="text-gray-900 font-semibold text-sm">APP CRM HRP</span>
          </div>

          {!mostraRecuperar ? (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Entrar</h2>
              <p className="text-sm text-gray-500 mb-7">
                Use o e-mail e a senha enviados para você.
              </p>

              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5" htmlFor="email">
                    E-mail
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="seu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5" htmlFor="senha">
                    Senha
                  </label>
                  <input
                    id="senha"
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    className="input-field"
                  />
                </div>

                {erro && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                    <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    <span className="text-xs text-red-600">{erro}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={carregando}
                  className="btn-primary flex items-center justify-center gap-2 mt-1"
                >
                  {carregando
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Entrando…</>
                    : 'Entrar'
                  }
                </button>
              </form>

              <button
                onClick={() => { setMostraRecuperar(true); setErro('') }}
                className="mt-5 text-xs text-brand-600 hover:text-brand-700 w-full text-center"
              >
                Esqueci minha senha
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { setMostraRecuperar(false); setErro(''); setMsgRecuperar('') }}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-6"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Voltar ao login
              </button>

              <h2 className="text-xl font-semibold text-gray-900 mb-1">Redefinir senha</h2>
              <p className="text-sm text-gray-500 mb-7">
                Informe seu e-mail e enviaremos um link para criar uma nova senha.
              </p>

              {msgRecuperar ? (
                <div className="flex items-start gap-2 bg-green-50 border border-green-100 rounded-lg px-3 py-3">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-xs text-green-700">{msgRecuperar}</span>
                </div>
              ) : (
                <form onSubmit={handleRecuperar} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5" htmlFor="email-rec">
                      E-mail
                    </label>
                    <input
                      id="email-rec"
                      type="email"
                      required
                      placeholder="seu@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="input-field"
                    />
                  </div>

                  {erro && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                      <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      </svg>
                      <span className="text-xs text-red-600">{erro}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={carregando}
                    className="btn-primary flex items-center justify-center gap-2"
                  >
                    {carregando
                      ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Enviando…</>
                      : 'Enviar link de redefinição'
                    }
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
