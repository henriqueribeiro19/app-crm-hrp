import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { 
  Users, Plus, X, Save, Shield, User, Mail, Lock, 
  CheckCircle, XCircle, RefreshCw, AlertCircle, Crown,
  Search, Power, PowerOff
} from 'lucide-react'

export default function Admin() {
  const navigate = useNavigate()
  const { usuario, perfil, isAdmin, carregando, listarUsuarios, cadastrarUsuario, ativarDesativarUsuario, redefinirSenhaUsuario, logout } = useAuth()

  const [usuarios, setUsuarios] = useState([])
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [busca, setBusca] = useState('')

  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    role: 'user'
  })

  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Redirecionar se não for admin
  useEffect(() => {
    if (!carregando && (!usuario || !isAdmin)) {
      navigate('/')
    }
  }, [carregando, usuario, isAdmin, navigate])

  useEffect(() => {
    if (isAdmin) carregarUsuarios()
  }, [isAdmin])

  const carregarUsuarios = async () => {
    setCarregandoUsuarios(true)
    try {
      const data = await listarUsuarios()
      setUsuarios(data)
    } catch (err) {
      console.error('Erro ao carregar usuários:', err)
    } finally {
      setCarregandoUsuarios(false)
    }
  }

  const handleSalvar = async (e) => {
    e.preventDefault()
    setErro('')
    setSucesso('')

    // Validações
    if (!form.nome.trim()) { setErro('Nome é obrigatório'); return }
    if (!form.email.trim()) { setErro('E-mail é obrigatório'); return }
    if (!form.senha) { setErro('Senha é obrigatória'); return }
    if (form.senha.length < 6) { setErro('Senha deve ter no mínimo 6 caracteres'); return }
    if (form.senha !== form.confirmarSenha) { setErro('As senhas não conferem'); return }

    setSalvando(true)
    try {
      await cadastrarUsuario({
        nome: form.nome,
        email: form.email,
        senha: form.senha,
        role: form.role
      })

      setSucesso(`Usuário "${form.nome}" cadastrado com sucesso!`)
      setForm({ nome: '', email: '', senha: '', confirmarSenha: '', role: 'user' })
      setMostrarForm(false)
      carregarUsuarios()
    } catch (err) {
      setErro(err.message || 'Erro ao cadastrar usuário. Verifique se o e-mail já existe.')
    } finally {
      setSalvando(false)
    }
  }

  const handleToggleAtivo = async (userId, atual) => {
    try {
      await ativarDesativarUsuario(userId, !atual)
      carregarUsuarios()
    } catch (err) {
      setErro('Erro ao atualizar usuário')
    }
  }

  const handleResetSenha = async (email) => {
    try {
      await redefinirSenhaUsuario(email)
      setSucesso(`E-mail de redefinição enviado para ${email}`)
    } catch (err) {
      setErro('Erro ao enviar e-mail de redefinição')
    }
  }

  const usuariosFiltrados = usuarios.filter(u => 
    u.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    u.email?.toLowerCase().includes(busca.toLowerCase())
  )

  const inputClass = "w-full bg-surface border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all"
  const labelClass = "block text-xs font-medium text-gray-400 mb-1.5"

  if (carregando) {
    return (
      <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
            <Shield size={20} className="text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Administração</h1>
            <p className="text-sm text-gray-400 mt-1">Gerencie usuários do sistema</p>
          </div>
        </div>
        <button
          onClick={() => { setMostrarForm(!mostrarForm); setErro(''); setSucesso('') }}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent text-black rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors self-start sm:self-auto"
        >
          {mostrarForm ? <X size={18} /> : <Plus size={18} />}
          {mostrarForm ? 'Fechar' : 'Novo Usuário'}
        </button>
      </div>

      {/* Alertas */}
      {erro && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle size={16} /> {erro}
        </div>
      )}
      {sucesso && (
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm flex items-center gap-2">
          <CheckCircle size={16} /> {sucesso}
        </div>
      )}

      {/* Formulário de cadastro */}
      {mostrarForm && (
        <div className="bg-surface-card border border-white/[0.08] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
            <User size={20} className="text-accent" />
            Cadastrar Novo Usuário
          </h2>

          <form onSubmit={handleSalvar} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nome completo *</label>
                <input
                  value={form.nome}
                  onChange={e => setForm({...form, nome: e.target.value})}
                  placeholder="João Silva"
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>E-mail *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  placeholder="joao@empresa.com"
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Senha *</label>
                <input
                  type="password"
                  value={form.senha}
                  onChange={e => setForm({...form, senha: e.target.value})}
                  placeholder="Mínimo 6 caracteres"
                  className={inputClass}
                  minLength={6}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Confirmar senha *</label>
                <input
                  type="password"
                  value={form.confirmarSenha}
                  onChange={e => setForm({...form, confirmarSenha: e.target.value})}
                  placeholder="Digite a senha novamente"
                  className={inputClass}
                  required
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Nível de acesso</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-white/[0.08] hover:border-white/[0.12] transition-colors flex-1">
                  <input
                    type="radio"
                    checked={form.role === 'user'}
                    onChange={() => setForm({...form, role: 'user'})}
                    className="text-accent focus:ring-accent"
                  />
                  <div>
                    <div className="text-sm text-gray-300 font-medium flex items-center gap-1">
                      <User size={14} /> Usuário
                    </div>
                    <div className="text-xs text-gray-500">Acesso padrão ao CRM</div>
                  </div>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-white/[0.08] hover:border-accent/30 transition-colors flex-1">
                  <input
                    type="radio"
                    checked={form.role === 'admin'}
                    onChange={() => setForm({...form, role: 'admin'})}
                    className="text-accent focus:ring-accent"
                  />
                  <div>
                    <div className="text-sm text-gray-300 font-medium flex items-center gap-1">
                      <Crown size={14} className="text-yellow-400" /> Administrador
                    </div>
                    <div className="text-xs text-gray-500">Acesso total + gerenciamento de usuários</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMostrarForm(false)}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="flex items-center gap-2 px-5 py-2.5 bg-accent text-black rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                <Save size={16} />
                {salvando ? 'Cadastrando...' : 'Cadastrar Usuário'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de usuários */}
      <div className="bg-surface-card border border-white/[0.08] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <Users size={16} /> Usuários cadastrados
          </h3>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar usuário..."
              className="bg-surface border border-white/[0.08] rounded-lg pl-9 pr-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/30 w-64"
            />
          </div>
        </div>

        {carregandoUsuarios ? (
          <div className="p-8 text-center text-gray-500">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Carregando usuários...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.08] bg-surface/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Usuário</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">E-mail</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Nível</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Cadastro</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {usuariosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm">
                      {busca ? 'Nenhum usuário encontrado para esta busca.' : 'Nenhum usuário cadastrado.'}
                    </td>
                  </tr>
                ) : (
                  usuariosFiltrados.map(u => (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                            u.role === 'admin' 
                              ? 'bg-yellow-500/20 text-yellow-300' 
                              : 'bg-accent/20 text-accent'
                          }`}>
                            {u.nome?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-100">{u.nome || '—'}</div>
                            {u.user_id === usuario?.id && (
                              <span className="text-[10px] text-accent">(Você)</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          u.role === 'admin'
                            ? 'bg-yellow-500/20 text-yellow-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {u.role === 'admin' ? <Crown size={12} /> : <User size={12} />}
                          {u.role === 'admin' ? 'Admin' : 'Usuário'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs ${
                          u.ativo ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {u.ativo ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(u.criado_em).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {/* Não pode desativar a si mesmo */}
                          {u.user_id !== usuario?.id && (
                            <button
                              onClick={() => handleToggleAtivo(u.user_id, u.ativo)}
                              title={u.ativo ? 'Desativar usuário' : 'Ativar usuário'}
                              className={`p-1.5 rounded-lg transition-colors ${
                                u.ativo 
                                  ? 'hover:bg-red-500/10 text-gray-500 hover:text-red-400' 
                                  : 'hover:bg-green-500/10 text-gray-500 hover:text-green-400'
                              }`}
                            >
                              {u.ativo ? <PowerOff size={14} /> : <Power size={14} />}
                            </button>
                          )}
                          <button
                            onClick={() => handleResetSenha(u.email)}
                            title="Redefinir senha"
                            className="p-1.5 rounded-lg hover:bg-blue-500/10 text-gray-500 hover:text-blue-400 transition-colors"
                          >
                            <RefreshCw size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-surface/50 border border-white/[0.06] rounded-lg p-4">
        <p className="text-xs text-gray-500">
          <strong className="text-gray-400">Dica:</strong> Usuários inativos não conseguem fazer login no sistema. 
          Ao cadastrar um novo usuário, ele receberá um e-mail de confirmação (se o e-mail estiver configurado no Supabase) 
          ou poderá fazer login diretamente com a senha definida.
        </p>
      </div>
    </div>
  )
}
