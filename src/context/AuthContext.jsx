import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const carregarSessao = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null
      setUsuario(user)

      if (user) {
        await carregarPerfil(user.id)
      }

      setCarregando(false)
    }

    carregarSessao()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null
      setUsuario(user)

      if (user) {
        await carregarPerfil(user.id)
      } else {
        setPerfil(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const carregarPerfil = async (userId) => {
    const { data } = await supabase
      .from('perfis')
      .select('*')
      .eq('user_id', userId)
      .single()
    setPerfil(data || null)
  }

  const login = async (email, senha) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) throw error
    return data
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setPerfil(null)
  }

  const esqueceuSenha = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/nova-senha`,
    })
    if (error) throw error
  }

  // === FUNÇÕES DE ADMIN ===

  const isAdmin = perfil?.role === 'admin'

  const listarUsuarios = async () => {
    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .order('criado_em', { ascending: false })
    if (error) throw error
    return data || []
  }

  const cadastrarUsuario = async ({ nome, email, senha, role = 'user' }) => {
    // 1. Criar usuário na auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome, role }
    })

    if (authError) {
      // Se não tiver permissão admin, tenta signup normal
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { data: { nome, role } }
      })

      if (signUpError) throw signUpError

      // Atualizar perfil manualmente
      if (signUpData.user) {
        await supabase.from('perfis').upsert({
          user_id: signUpData.user.id,
          nome,
          email,
          role,
          ativo: true
        })
      }

      return signUpData
    }

    return authData
  }

  const atualizarUsuario = async (userId, dados) => {
    const { error } = await supabase
      .from('perfis')
      .update(dados)
      .eq('user_id', userId)
    if (error) throw error
  }

  const ativarDesativarUsuario = async (userId, ativo) => {
    const { error } = await supabase
      .from('perfis')
      .update({ ativo })
      .eq('user_id', userId)
    if (error) throw error
  }

  const redefinirSenhaUsuario = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/nova-senha`,
    })
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ 
      usuario, 
      perfil,
      carregando, 
      login, 
      logout, 
      esqueceuSenha,
      isAdmin,
      listarUsuarios,
      cadastrarUsuario,
      atualizarUsuario,
      ativarDesativarUsuario,
      redefinirSenhaUsuario,
      recarregarPerfil: () => usuario && carregarPerfil(usuario.id)
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
