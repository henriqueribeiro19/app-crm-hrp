import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { FiltrosAvancados } from '../components/ui/FiltrosAvancados'
import { Paginacao } from '../components/ui/Paginacao'
import { SkeletonTabela } from '../components/ui/SkeletonTabela'
import { ArrowLeft, Archive, RotateCcw, AlertTriangle, Calendar } from 'lucide-react'

export default function Arquivados() {
  const navigate = useNavigate()
  const [arquivados, setArquivados] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [pagina, setPagina] = useState(1)
  const [totalRegistros, setTotalRegistros] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [opcoesFiltro, setOpcoesFiltro] = useState({ status: [], segmento: [], produto: [], municipio: [] })
  const [ordenacao, setOrdenacao] = useState({ campo: 'data_arquivamento', direcao: 'desc' })

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
        .eq('status_funil', 'arquivado')
        .is('excluido_em', null)

      if (filtros.busca) {
        query = query.or(`nome.ilike.%${filtros.busca}%,nome_fantasia.ilike.%${filtros.busca}%,cnpj.ilike.%${filtros.busca}%`)
      }
      if (filtros.segmento) query = query.eq('segmento', filtros.segmento)
      if (filtros.municipio) query = query.ilike('municipio', `%${filtros.municipio}%`)
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

      setArquivados(data || [])
      setTotalRegistros(count || 0)
      setTotalPaginas(Math.ceil((count || 0) / ITENS_POR_PAGINA))

      const { data: opts } = await supabase
        .from('empresas')
        .select('segmento, municipio, produto_sugerido')
        .eq('status_funil', 'arquivado')
        .is('excluido_em', null)

      setOpcoesFiltro({
        status: [],
        segmento: [...new Set(opts?.map(e => e.segmento).filter(Boolean) || [])],
        produto: [...new Set(opts?.map(e => e.produto_sugerido).filter(Boolean) || [])],
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

  const reativarLead = async (id) => {
    if (!window.confirm('Reativar este lead? Ele voltará para o funil como "Novo".')) return
    await supabase.from('empresas').update({
      status_funil: 'novo',
      motivo_arquivamento: null,
      data_arquivamento: null,
    }).eq('id', id)
    carregarDados()
  }

  const MOTIVO_COR = {
    'Não atende perfil': 'text-yellow-400',
    'Não respondeu': 'text-orange-400',
    'Preço alto': 'text-red-400',
    'Concorrente': 'text-purple-400',
    'Não tem interesse': 'text-gray-400',
    'Outro': 'text-blue-400',
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
            <h1 className="text-2xl font-bold text-gray-100">Leads Arquivados</h1>
            <p className="text-sm text-gray-400 mt-1">Leads perdidos ou descartados</p>
          </div>
        </div>
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Motivo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Arquivado em</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {arquivados.map(lead => (
                    <tr key={lead.id} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-500/30 to-red-500/10 flex items-center justify-center text-red-400 font-bold text-xs shrink-0">
                            {(lead.nome_fantasia || lead.nome).split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-gray-100 truncate">{lead.nome_fantasia || lead.nome}</div>
                            <div className="text-xs text-gray-500 font-mono">{lead.cnpj || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">{lead.segmento || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${MOTIVO_COR[lead.motivo_arquivamento] || 'text-gray-400'}`}>
                          {lead.motivo_arquivamento || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {lead.data_arquivamento
                          ? new Date(lead.data_arquivamento).toLocaleDateString('pt-BR')
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => reativarLead(lead.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors"
                            title="Reativar lead"
                          >
                            <RotateCcw size={14} />
                            Reativar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {arquivados.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <Archive size={48} className="mb-3 opacity-30" />
                <p className="text-lg font-medium">Nenhum lead arquivado</p>
                <p className="text-sm">Leads perdidos no funil aparecerão aqui.</p>
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
    </div>
  )
}
