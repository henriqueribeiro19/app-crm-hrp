import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { FiltrosAvancados } from '../components/ui/FiltrosAvancados'
import { Paginacao } from '../components/ui/Paginacao'
import { SkeletonTabela } from '../components/ui/SkeletonTabela'
import { ModalEmpresa } from '../components/ui/ModalEmpresa'
import { ArrowLeft, Crown, Calendar, Package, TrendingUp, DollarSign, Users } from 'lucide-react'

export default function Clientes() {
  const navigate = useNavigate()
  const [clientes, setClientes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [pagina, setPagina] = useState(1)
  const [totalRegistros, setTotalRegistros] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [modalEmpresa, setModalEmpresa] = useState(null)
  const [opcoesFiltro, setOpcoesFiltro] = useState({ status: [], segmento: [], produto: [], municipio: [] })
  const [ordenacao, setOrdenacao] = useState({ campo: 'data_contratacao', direcao: 'desc' })
  const [kpis, setKpis] = useState({ total: 0, cloudfy: 0, cplung: 0, esteMes: 0 })

  const [filtros, setFiltros] = useState({
    busca: '',
    segmento: '',
    municipio: '',
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
      let query = supabase
        .from('empresas')
        .select('*', { count: 'exact' })
        .eq('status_funil', 'cliente_ativo')
        .is('excluido_em', null)

      if (filtros.busca) {
        query = query.or(`nome.ilike.%${filtros.busca}%,nome_fantasia.ilike.%${filtros.busca}%,cnpj.ilike.%${filtros.busca}%`)
      }
      if (filtros.segmento) query = query.eq('segmento', filtros.segmento)
      if (filtros.municipio) query = query.ilike('municipio', `%${filtros.municipio}%`)
      if (filtros.produto_sugerido) query = query.eq('produto_contratado', filtros.produto_sugerido)
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

      setClientes(data || [])
      setTotalRegistros(count || 0)
      setTotalPaginas(Math.ceil((count || 0) / ITENS_POR_PAGINA))

      // KPIs
      const { data: allData } = await supabase
        .from('empresas')
        .select('produto_contratado, data_contratacao')
        .eq('status_funil', 'cliente_ativo')
        .is('excluido_em', null)

      const stats = { total: allData?.length || 0, cloudfy: 0, cplung: 0, esteMes: 0 }
      const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

      allData?.forEach(c => {
        if (c.produto_contratado === 'cloudfy') stats.cloudfy++
        if (c.produto_contratado === 'cplung') stats.cplung++
        if (c.data_contratacao && c.data_contratacao >= inicioMes) stats.esteMes++
      })
      setKpis(stats)

      const { data: opts } = await supabase
        .from('empresas')
        .select('segmento, municipio, produto_contratado')
        .eq('status_funil', 'cliente_ativo')
        .is('excluido_em', null)

      setOpcoesFiltro({
        status: [],
        segmento: [...new Set(opts?.map(e => e.segmento).filter(Boolean) || [])],
        produto: [...new Set(opts?.map(e => e.produto_contratado).filter(Boolean) || [])],
        municipio: [...new Set(opts?.map(e => e.municipio).filter(Boolean) || [])].sort(),
      })
    } catch (err) {
      console.error('Erro:', err)
    } finally {
      setCarregando(false)
    }
  }, [filtros, pagina, ordenacao])

  useEffect(() => { carregarDados() }, [carregarDados])
  useEffect(() => { setPagina(1) }, [filtros])

  const handleOrdenar = (campo) => {
    setOrdenacao(prev => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === 'desc' ? 'asc' : 'desc',
    }))
  }

  const handleSalvar = async (form) => {
    const { error } = await supabase.from('empresas').update(form).eq('id', form.id)
    if (!error) {
      setModalEmpresa(null)
      carregarDados()
    }
  }

  const kpiCards = [
    { label: 'Clientes Ativos', valor: kpis.total, sub: 'total', cor: 'text-green-400', bg: 'bg-green-500/10', icon: Crown },
    { label: 'Cloudfy', valor: kpis.cloudfy, sub: 'contratos', cor: 'text-purple-400', bg: 'bg-purple-500/10', icon: Package },
    { label: 'Cplung', valor: kpis.cplung, sub: 'contratos', cor: 'text-teal-400', bg: 'bg-teal-500/10', icon: TrendingUp },
    { label: 'Este Mês', valor: kpis.esteMes, sub: 'novos', cor: 'text-blue-400', bg: 'bg-blue-500/10', icon: Calendar },
  ]

  const PRODUTO_COR = {
    cloudfy: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    cplung: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/funil')}
            className="p-2 rounded-lg bg-surface border border-white/[0.08] text-gray-400 hover:text-gray-200 hover:bg-surface-hover transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Clientes Ativos</h1>
            <p className="text-sm text-gray-400 mt-1">Leads convertidos em clientes</p>
          </div>
        </div>
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
          <div className="bg-surface-card border border-white/[0.08] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface border-b border-white/[0.08]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Empresa</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Segmento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Cidade</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Produto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Contratação</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {clientes.map(cli => (
                    <tr key={cli.id} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-500/30 to-green-500/10 flex items-center justify-center text-green-400 font-bold text-xs shrink-0">
                            {(cli.nome_fantasia || cli.nome).split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-gray-100 truncate">{cli.nome_fantasia || cli.nome}</div>
                            <div className="text-xs text-gray-500 font-mono">{cli.cnpj || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">{cli.segmento || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{cli.municipio || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${PRODUTO_COR[cli.produto_contratado] || 'text-gray-400 bg-gray-500/10 border-gray-500/20'}`}>
                          {cli.produto_contratado || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {cli.data_contratacao
                          ? new Date(cli.data_contratacao).toLocaleDateString('pt-BR')
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setModalEmpresa(cli)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                            title="Ver detalhes"
                          >
                            <Users size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {clientes.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <Crown size={48} className="mb-3 opacity-30" />
                <p className="text-lg font-medium">Nenhum cliente ativo</p>
                <p className="text-sm">Converta leads no funil para vê-los aqui.</p>
              </div>
            )}
          </div>
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
          onSalvar={handleSalvar}
        />
      )}
    </div>
  )
}
