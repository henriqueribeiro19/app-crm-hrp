import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { FiltrosAvancados } from '../components/ui/FiltrosAvancados'
import { TabelaEmpresas } from '../components/ui/TabelaEmpresas'
import { Paginacao } from '../components/ui/Paginacao'
import { SkeletonTabela } from '../components/ui/SkeletonTabela'
import { ModalEmpresa } from '../components/ui/ModalEmpresa'
import { TrendingUp, Users, Target, DollarSign, Plus, Filter } from 'lucide-react'

export default function Painel() {
  const navigate = useNavigate()
  const [empresas, setEmpresas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [pagina, setPagina] = useState(1)
  const [totalRegistros, setTotalRegistros] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [modalEmpresa, setModalEmpresa] = useState(null)
  const [opcoesFiltro, setOpcoesFiltro] = useState({ status: [], segmento: [], produto: [], municipio: [] })
  const [ordenacao, setOrdenacao] = useState({ campo: 'score', direcao: 'desc' })
  const [kpis, setKpis] = useState({
    total: 0,
    novos: 0,
    emContato: 0,
    propostas: 0,
    fechados: 0,
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

  const ITENS_POR_PAGINA = 20

  const carregarDados = useCallback(async () => {
    setCarregando(true)
    try {
      // Query base
      let query = supabase
        .from('empresas')
        .select('*', { count: 'exact' })
        .is('excluido_em', null)

      // Aplicar filtros
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

      // Ordenação
      query = query.order(ordenacao.campo, { ascending: ordenacao.direcao === 'asc' })

      // Paginação
      const from = (pagina - 1) * ITENS_POR_PAGINA
      const to = from + ITENS_POR_PAGINA - 1
      query = query.range(from, to)

      const { data, error, count } = await query
      if (error) throw error

      setEmpresas(data || [])
      setTotalRegistros(count || 0)
      setTotalPaginas(Math.ceil((count || 0) / ITENS_POR_PAGINA))

      // Carregar KPIs
      const { data: kpiData } = await supabase
        .from('empresas')
        .select('status_funil')
        .is('excluido_em', null)

      const stats = { total: kpiData?.length || 0, novos: 0, emContato: 0, propostas: 0, fechados: 0 }
      kpiData?.forEach(e => {
        if (e.status_funil === 'novo') stats.novos++
        else if (e.status_funil === 'contato') stats.emContato++
        else if (e.status_funil === 'proposta') stats.propostas++
        else if (e.status_funil === 'fechado_ganho') stats.fechados++
      })
      setKpis(stats)

      // Carregar opções de filtro
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
      console.error('Erro ao carregar dados:', err)
    } finally {
      setCarregando(false)
    }
  }, [filtros, pagina, ordenacao])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  // Resetar página quando filtros mudam
  useEffect(() => {
    setPagina(1)
  }, [filtros])

  const handleOrdenar = (campo) => {
    setOrdenacao(prev => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === 'desc' ? 'asc' : 'desc',
    }))
  }

  const handleSalvarEmpresa = async (form) => {
    const { error } = await supabase
      .from('empresas')
      .update(form)
      .eq('id', form.id)
    if (!error) {
      setModalEmpresa(null)
      carregarDados()
    }
  }

  const handleExcluir = async (emp) => {
    if (!window.confirm(`Tem certeza que deseja excluir "${emp.nome_fantasia || emp.nome}"?`)) return
    await supabase.from('empresas').update({ excluido_em: new Date().toISOString() }).eq('id', emp.id)
    carregarDados()
  }

  const kpiCards = [
    { label: 'Total de Leads', valor: kpis.total, sub: 'cadastrados', cor: 'text-blue-400', bg: 'bg-blue-500/10', icon: Users },
    { label: 'Novos', valor: kpis.novos, sub: 'sem contato', cor: 'text-gray-400', bg: 'bg-gray-500/10', icon: Target },
    { label: 'Em Contato', valor: kpis.emContato, sub: 'negociando', cor: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: TrendingUp },
    { label: 'Fechados', valor: kpis.fechados, sub: 'conversões', cor: 'text-green-400', bg: 'bg-green-500/10', icon: DollarSign },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Painel</h1>
          <p className="text-sm text-gray-400 mt-1">Visão geral dos leads e oportunidades</p>
        </div>
        <button
          onClick={() => navigate('/leads')}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent text-black rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors self-start sm:self-auto"
        >
          <Plus size={18} />
          Novo Lead
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(({ label, valor, sub, cor, bg, icon: Icon }) => (
          <div key={label} className="bg-surface-card border border-white/[0.08] rounded-xl p-4 hover:border-white/[0.12] transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</span>
              <div className={`p-2 rounded-lg ${bg}`}>
                <Icon size={16} className={cor} />
              </div>
            </div>
            <div className={`text-2xl font-bold ${cor}`}>{carregando ? '—' : valor}</div>
            <div className="text-xs text-gray-500 mt-1">{sub}</div>
          </div>
        ))}
      </div>

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
          onSalvar={handleSalvarEmpresa}
        />
      )}
    </div>
  )
}
