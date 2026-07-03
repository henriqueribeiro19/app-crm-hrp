import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { FiltrosAvancados } from '../components/ui/FiltrosAvancados'
import { TabelaEmpresas } from '../components/ui/TabelaEmpresas'
import { Paginacao } from '../components/ui/Paginacao'
import { SkeletonTabela } from '../components/ui/SkeletonTabela'
import { ModalEmpresa } from '../components/ui/ModalEmpresa'
import { Plus, X, Building2, Save, Search, Check, AlertCircle } from 'lucide-react'

// === FUNÇÕES DE MÁSCARA E VALIDAÇÃO ===
function mascaraCNPJ(valor) {
  const numeros = valor.replace(/\D/g, '').slice(0, 14)
  return numeros
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

function mascaraTelefone(valor) {
  const numeros = valor.replace(/\D/g, '').slice(0, 11)
  if (numeros.length <= 10) {
    return numeros
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2')
  }
  return numeros
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}

function validarEmail(email) {
  if (!email) return true // vazio é válido (campo opcional)
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

function validarCNPJ(cnpj) {
  const numeros = cnpj.replace(/\D/g, '')
  return numeros.length === 14
}

function validarTelefone(telefone) {
  const numeros = telefone.replace(/\D/g, '')
  return numeros.length >= 10 && numeros.length <= 11
}

export default function Leads() {
  const navigate = useNavigate()
  const [empresas, setEmpresas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [pagina, setPagina] = useState(1)
  const [totalRegistros, setTotalRegistros] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [modalEmpresa, setModalEmpresa] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [opcoesFiltro, setOpcoesFiltro] = useState({ status: [], segmento: [], produto: [], municipio: [] })
  const [ordenacao, setOrdenacao] = useState({ campo: 'criado_em', direcao: 'desc' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  // Estados de validação
  const [errosValidacao, setErrosValidacao] = useState({})
  const [tentouSalvar, setTentouSalvar] = useState(false)

  const [form, setForm] = useState({
    nome: '',
    nome_fantasia: '',
    cnpj: '',
    telefone: '',
    email: '',
    segmento: '',
    bairro: '',
    municipio: '',
    uf: 'SP',
    porte: '',
    score: 50,
    classificacao: '',
    produto_sugerido: '',
    status_funil: 'novo',
    observacoes: '',
    tipo: 'matriz',
    matriz_cnpj: '',
    unidade: '',
  })

  const [filtros, setFiltros] = useState({
    busca: '',
    segmento: '',
    municipio: '',
    status_funil: '',
    produto_sugerido: '',
    classificacao: '',
    porte: '',
    scoreMin: 0,
    scoreMax: 100,
  })

  const ITENS_POR_PAGINA = 10

  const carregarDados = async () => {
    setCarregando(true)
    try {
      let query = supabase
        .from('empresas')
        .select('*', { count: 'exact' })
        .is('excluido_em', null)

      if (filtros.busca) {
        query = query.or(`nome.ilike.%${filtros.busca}%,nome_fantasia.ilike.%${filtros.busca}%,cnpj.ilike.%${filtros.busca}%`)
      }
      if (filtros.segmento) query = query.eq('segmento', filtros.segmento)
      if (filtros.municipio) query = query.ilike('municipio', `%${filtros.municipio}%`)
      if (filtros.status_funil) query = query.eq('status_funil', filtros.status_funil)
      if (filtros.produto_sugerido) query = query.eq('produto_sugerido', filtros.produto_sugerido)
      if (filtros.classificacao) query = query.eq('classificacao', filtros.classificacao)
      if (filtros.porte) query = query.eq('porte', filtros.porte)
      if (filtros.scoreMin > 0) query = query.gte('score', filtros.scoreMin)
      if (filtros.scoreMax < 100) query = query.lte('score', filtros.scoreMax)

      query = query.order(ordenacao.campo, { ascending: ordenacao.direcao === 'asc' })

      const from = (pagina - 1) * ITENS_POR_PAGINA
      const to = from + ITENS_POR_PAGINA - 1
      query = query.range(from, to)

      const { data, error, count } = await query
      if (error) throw error

      setEmpresas(data || [])
      setTotalRegistros(count || 0)
      setTotalPaginas(Math.ceil((count || 0) / ITENS_POR_PAGINA))

      const { data: allData } = await supabase
        .from('empresas')
        .select('segmento, municipio, status_funil, produto_sugerido')
        .is('excluido_em', null)

      setOpcoesFiltro({
        status: [...new Set(allData?.map(e => e.status_funil).filter(Boolean) || [])],
        segmento: [...new Set(allData?.map(e => e.segmento).filter(Boolean) || [])],
        produto: [...new Set(allData?.map(e => e.produto_sugerido).filter(Boolean) || [])],
        municipio: [...new Set(allData?.map(e => e.municipio).filter(Boolean) || [])].sort(),
      })
    } catch (err) {
      console.error('Erro:', err)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregarDados() }, [filtros, pagina, ordenacao])
  useEffect(() => { setPagina(1) }, [filtros])

  const handleOrdenar = (campo) => {
    setOrdenacao(prev => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === 'desc' ? 'asc' : 'desc',
    }))
  }

  // Atualiza campo com máscara
  const atualizarCampo = (campo, valor) => {
    let valorFormatado = valor
    if (campo === 'cnpj') valorFormatado = mascaraCNPJ(valor)
    if (campo === 'telefone') valorFormatado = mascaraTelefone(valor)
    if (campo === 'matriz_cnpj') valorFormatado = mascaraCNPJ(valor)

    setForm(prev => ({ ...prev, [campo]: valorFormatado }))

    // Limpa erro do campo ao digitar
    if (errosValidacao[campo]) {
      setErrosValidacao(prev => ({ ...prev, [campo]: '' }))
    }
  }

  // Valida todos os campos
  const validarFormulario = () => {
    const erros = {}

    if (!form.nome.trim()) erros.nome = 'Razão Social é obrigatória'
    if (form.tipo === 'matriz' && !validarCNPJ(form.cnpj)) erros.cnpj = 'CNPJ inválido (deve ter 14 dígitos)'
    if (form.tipo === 'filial' && !validarCNPJ(form.matriz_cnpj)) erros.matriz_cnpj = 'CNPJ da matriz inválido'
    if (form.telefone && !validarTelefone(form.telefone)) erros.telefone = 'Telefone inválido'
    if (form.email && !validarEmail(form.email)) erros.email = 'E-mail inválido'
    if (!form.segmento.trim()) erros.segmento = 'Segmento é obrigatório'

    setErrosValidacao(erros)
    return Object.keys(erros).length === 0
  }

  const handleSalvar = async (e) => {
    e.preventDefault()
    setTentouSalvar(true)
    setErro('')
    setSucesso('')

    if (!validarFormulario()) return

    setSalvando(true)

    try {
      const payload = { ...form }

      // Remove formatação antes de salvar
      payload.cnpj = payload.cnpj.replace(/\D/g, '')
      payload.telefone = payload.telefone.replace(/\D/g, '')

      // Se for filial, buscar matriz pelo CNPJ
      if (form.tipo === 'filial' && form.matriz_cnpj) {
        const cnpjLimpo = form.matriz_cnpj.replace(/\D/g, '')
        const { data: matriz } = await supabase
          .from('empresas')
          .select('id')
          .eq('cnpj', cnpjLimpo)
          .eq('tipo', 'matriz')
          .is('excluido_em', null)
          .single()

        if (!matriz) {
          setErro('Matriz não encontrada. Verifique o CNPJ da matriz.')
          setSalvando(false)
          return
        }
        payload.matriz_id = matriz.id
      }

      delete payload.matriz_cnpj

      const { error } = await supabase.from('empresas').insert(payload)
      if (error) throw error

      setSucesso('Lead cadastrado com sucesso!')
      setForm({
        nome: '', nome_fantasia: '', cnpj: '', telefone: '', email: '',
        segmento: '', bairro: '', municipio: '', uf: 'SP', porte: '',
        score: 50, classificacao: '', produto_sugerido: '', status_funil: 'novo',
        observacoes: '', tipo: 'matriz', matriz_cnpj: '', unidade: '',
      })
      setErrosValidacao({})
      setTentouSalvar(false)
      setMostrarForm(false)
      carregarDados()
    } catch (err) {
      setErro(err.message || 'Erro ao salvar. Verifique se o CNPJ já existe para uma matriz.')
    } finally {
      setSalvando(false)
    }
  }

  const handleSalvarEdicao = async (formEditado) => {
    const { error } = await supabase.from('empresas').update(formEditado).eq('id', formEditado.id)
    if (!error) {
      setModalEmpresa(null)
      carregarDados()
    }
  }

  const handleExcluir = async (emp) => {
    if (!window.confirm(`Excluir "${emp.nome_fantasia || emp.nome}"?`)) return
    await supabase.from('empresas').update({ excluido_em: new Date().toISOString() }).eq('id', emp.id)
    carregarDados()
  }

  const inputBaseClass = "w-full bg-surface border rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all"
  const labelClass = "block text-xs font-medium text-gray-400 mb-1.5"

  const getInputClass = (campo) => {
    const temErro = tentouSalvar && errosValidacao[campo]
    return `${inputBaseClass} ${temErro ? 'border-red-500/50 focus:ring-red-500/30 focus:border-red-500/50' : 'border-white/[0.08]'}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Leads</h1>
          <p className="text-sm text-gray-400 mt-1">Cadastre e gerencie seus leads</p>
        </div>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent text-black rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors self-start sm:self-auto"
        >
          {mostrarForm ? <X size={18} /> : <Plus size={18} />}
          {mostrarForm ? 'Fechar' : 'Novo Lead'}
        </button>
      </div>

      {/* Formulário de cadastro */}
      {mostrarForm && (
        <div className="bg-surface-card border border-white/[0.08] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
            <Building2 size={20} className="text-accent" />
            Cadastrar Novo Lead
          </h2>

          {erro && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {erro}
            </div>
          )}
          {sucesso && (
            <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm flex items-center gap-2">
              <Check size={16} /> {sucesso}
            </div>
          )}

          <form onSubmit={handleSalvar} className="space-y-4">
            {/* Tipo: Matriz/Filial */}
            <div className="border border-white/[0.08] rounded-lg p-4 bg-surface/50">
              <label className={labelClass}>Tipo de Empresa</label>
              <div className="flex gap-6 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={form.tipo === 'matriz'}
                    onChange={() => setForm({ ...form, tipo: 'matriz', matriz_cnpj: '', unidade: '' })}
                    className="text-accent focus:ring-accent"
                  />
                  <span className="text-sm text-gray-300">Matriz (CNPJ único)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={form.tipo === 'filial'}
                    onChange={() => setForm({ ...form, tipo: 'filial' })}
                    className="text-accent focus:ring-accent"
                  />
                  <span className="text-sm text-gray-300">Filial (mesmo CNPJ da matriz)</span>
                </label>
              </div>
            </div>

            {form.tipo === 'filial' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>CNPJ da Matriz *</label>
                  <input
                    value={form.matriz_cnpj}
                    onChange={e => atualizarCampo('matriz_cnpj', e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className={getInputClass('matriz_cnpj')}
                    maxLength={18}
                  />
                  {tentouSalvar && errosValidacao.matriz_cnpj && (
                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={12} />{errosValidacao.matriz_cnpj}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Digite o CNPJ da matriz já cadastrada</p>
                </div>
                <div>
                  <label className={labelClass}>Nome da Unidade *</label>
                  <input
                    value={form.unidade}
                    onChange={e => setForm({ ...form, unidade: e.target.value })}
                    placeholder="Ex: Loja Centro, Unidade Paulista..."
                    className={inputBaseClass + ' border-white/[0.08]'}
                    required
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Razão Social *</label>
                <input
                  value={form.nome}
                  onChange={e => setForm({...form, nome: e.target.value})}
                  className={getInputClass('nome')}
                />
                {tentouSalvar && errosValidacao.nome && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={12} />{errosValidacao.nome}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Nome Fantasia</label>
                <input value={form.nome_fantasia} onChange={e => setForm({...form, nome_fantasia: e.target.value})} className={inputBaseClass + ' border-white/[0.08]'} />
              </div>
              <div>
                <label className={labelClass}>CNPJ {form.tipo === 'matriz' ? '*' : ''}</label>
                <input
                  value={form.cnpj}
                  onChange={e => atualizarCampo('cnpj', e.target.value)}
                  placeholder="00.000.000/0001-00"
                  className={getInputClass('cnpj')}
                  maxLength={18}
                />
                {tentouSalvar && errosValidacao.cnpj && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={12} />{errosValidacao.cnpj}</p>
                )}
                {form.tipo === 'filial' && (
                  <p className="text-xs text-gray-500 mt-1">Pode ser o mesmo CNPJ da matriz</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Telefone</label>
                <input
                  value={form.telefone}
                  onChange={e => atualizarCampo('telefone', e.target.value)}
                  placeholder="(11) 99999-0000"
                  className={getInputClass('telefone')}
                  maxLength={15}
                />
                {tentouSalvar && errosValidacao.telefone && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={12} />{errosValidacao.telefone}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>E-mail</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  placeholder="contato@empresa.com.br"
                  className={getInputClass('email')}
                />
                {tentouSalvar && errosValidacao.email && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={12} />{errosValidacao.email}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Segmento *</label>
                <input
                  value={form.segmento}
                  onChange={e => setForm({...form, segmento: e.target.value})}
                  placeholder="Padaria, Restaurante..."
                  className={getInputClass('segmento')}
                />
                {tentouSalvar && errosValidacao.segmento && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={12} />{errosValidacao.segmento}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Município</label>
                <input value={form.municipio} onChange={e => setForm({...form, municipio: e.target.value})} className={inputBaseClass + ' border-white/[0.08]'} />
              </div>
              <div>
                <label className={labelClass}>Bairro</label>
                <input value={form.bairro} onChange={e => setForm({...form, bairro: e.target.value})} className={inputBaseClass + ' border-white/[0.08]'} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>Produto</label>
                <select value={form.produto_sugerido} onChange={e => setForm({...form, produto_sugerido: e.target.value})} className={inputBaseClass + ' border-white/[0.08]'}>
                  <option value="">Selecione...</option>
                  <option value="cloudfy">Cloudfy</option>
                  <option value="cplung">Cplung</option>
                  <option value="qualificar">Qualificar</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Classificação</label>
                <select value={form.classificacao} onChange={e => setForm({...form, classificacao: e.target.value})} className={inputBaseClass + ' border-white/[0.08]'}>
                  <option value="">—</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Porte</label>
                <select value={form.porte} onChange={e => setForm({...form, porte: e.target.value})} className={inputBaseClass + ' border-white/[0.08]'}>
                  <option value="">—</option>
                  <option value="MEI">MEI</option>
                  <option value="ME">ME</option>
                  <option value="EPP">EPP</option>
                  <option value="DEMAIS">DEMAIS</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Score (0-100)</label>
                <input type="number" min="0" max="100" value={form.score} onChange={e => setForm({...form, score: parseInt(e.target.value) || 0})} className={inputBaseClass + ' border-white/[0.08]'} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Observações</label>
              <textarea
                value={form.observacoes}
                onChange={e => setForm({...form, observacoes: e.target.value})}
                rows={4}
                className="w-full bg-surface border border-white/[0.08] rounded-lg p-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 resize-y transition-all"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setMostrarForm(false); setErrosValidacao({}); setTentouSalvar(false) }}
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
                {salvando ? 'Salvando...' : 'Salvar Lead'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <FiltrosAvancados
        filtros={filtros}
        onFiltrosChange={setFiltros}
        opcoes={opcoesFiltro}
      />

      {/* Tabela */}
      {carregando ? (
        <SkeletonTabela />
      ) : (
        <>
          <TabelaEmpresas
            empresas={empresas}
            onVer={setModalEmpresa}
            onEditar={setModalEmpresa}
            onExcluir={handleExcluir}
            ordenacao={ordenacao}
            onOrdenar={handleOrdenar}
          />
          <Paginacao
            pagina={pagina}
            totalPaginas={totalPaginas}
            totalRegistros={totalRegistros}
            onPaginaChange={setPagina}
            itensPorPagina={ITENS_POR_PAGINA}
          />
        </>
      )}

      {/* Modal */}
      {modalEmpresa && (
        <ModalEmpresa
          empresa={modalEmpresa}
          onClose={() => setModalEmpresa(null)}
          onSalvar={handleSalvarEdicao}
        />
      )}
    </div>
  )
}
