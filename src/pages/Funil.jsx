import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { ModalEmpresa } from '../components/ui/ModalEmpresa'
import { MoreHorizontal, Phone, MessageCircle, ArrowRight, ArrowLeft, Archive, CheckCircle2, X, Upload, FileSpreadsheet, FileText, Mail, ChevronDown, AlertCircle, Check, Copy, Send, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

const COLUNAS = [
  { id: 'novo', label: 'Novo', cor: 'border-l-blue-500', bg: 'bg-blue-500/5', badge: 'bg-blue-500/20 text-blue-300' },
  { id: 'contato', label: 'Contato', cor: 'border-l-yellow-500', bg: 'bg-yellow-500/5', badge: 'bg-yellow-500/20 text-yellow-300' },
  { id: 'proposta', label: 'Proposta', cor: 'border-l-purple-500', bg: 'bg-purple-500/5', badge: 'bg-purple-500/20 text-purple-300' },
  { id: 'fechado_ganho', label: 'Ganho', cor: 'border-l-green-500', bg: 'bg-green-500/5', badge: 'bg-green-500/20 text-green-300' },
  { id: 'fechado_perdido', label: 'Perdido', cor: 'border-l-red-500', bg: 'bg-red-500/5', badge: 'bg-red-500/20 text-red-300' },
]

const CAMPOS_BANCO = [
  { key: 'nome', label: 'Nome / Razão Social', obrigatorio: true },
  { key: 'cnpj', label: 'CNPJ', obrigatorio: false },
  { key: 'telefone', label: 'Telefone', obrigatorio: false },
  { key: 'email', label: 'E-mail', obrigatorio: false },
  { key: 'segmento', label: 'Segmento', obrigatorio: false },
  { key: 'municipio', label: 'Município', obrigatorio: false },
  { key: 'bairro', label: 'Bairro', obrigatorio: false },
  { key: 'score', label: 'Score', obrigatorio: false },
  { key: 'classificacao', label: 'Classificação', obrigatorio: false },
  { key: 'produto_sugerido', label: 'Produto Sugerido', obrigatorio: false },
]

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

function gerarMensagemEmail(lead) {
  const nome = lead.nome_fantasia || lead.nome || 'Cliente'
  const cnpj = lead.cnpj || '—'
  const segmento = lead.segmento || '—'
  const email = lead.email || '—'
  const telefone = lead.telefone || '—'

  return `Olá ${nome},

É um prazer ter sua empresa conosco!
Registramos seus dados:
- CNPJ: ${cnpj}
- Segmento: ${segmento}
- Email de contato: ${email}
- Telefone: ${telefone}

Nossa equipe está pronta para apoiar sua jornada e oferecer soluções sob medida para o segmento de ${segmento}.

Se precisar de qualquer ajuda, basta responder a este email ou falar conosco pelo WhatsApp.

Seja muito bem-vindo(a)!

Atenciosamente,
Equipe HRP Soluções`
}

function getInicioFimMes(ano, mes) {
  const inicio = new Date(ano, mes, 1, 0, 0, 0)
  const fim = new Date(ano, mes + 1, 0, 23, 59, 59)
  return { inicio, fim }
}

function getPeriodoFiltro(tipo, ano, mes) {
  const hoje = new Date()
  const anoAtual = hoje.getFullYear()
  const mesAtual = hoje.getMonth()

  switch (tipo) {
    case 'este_mes':
      return getInicioFimMes(anoAtual, mesAtual)
    case 'mes_passado':
      const mp = mesAtual === 0 ? { ano: anoAtual - 1, mes: 11 } : { ano: anoAtual, mes: mesAtual - 1 }
      return getInicioFimMes(mp.ano, mp.mes)
    case 'ultimos_3':
      const inicio3 = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1, 0, 0, 0)
      const fim3 = new Date(anoAtual, mesAtual + 1, 0, 23, 59, 59)
      return { inicio: inicio3, fim: fim3 }
    case 'custom':
      return getInicioFimMes(ano, mes)
    case 'todos':
    default:
      return { inicio: new Date(2000, 0, 1), fim: new Date(2100, 11, 31) }
  }
}

function formatarPeriodo(tipo, ano, mes) {
  switch (tipo) {
    case 'este_mes': return 'Este mês'
    case 'mes_passado': return 'Mês passado'
    case 'ultimos_3': return 'Últimos 3 meses'
    case 'custom': return `${MESES[mes]} ${ano}`
    case 'todos': return 'Todos os períodos'
    default: return ''
  }
}

export default function Funil() {
  const [leads, setLeads] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [modalEmpresa, setModalEmpresa] = useState(null)
  const [modalArquivar, setModalArquivar] = useState(null)
  const [modalCliente, setModalCliente] = useState(null)
  const [motivoArquivar, setMotivoArquivar] = useState('')
  const [produtoCliente, setProdutoCliente] = useState('cloudfy')
  const [colunaArrastando, setColunaArrastando] = useState(null)
  const [modalImport, setModalImport] = useState(false)
  const [arquivo, setArquivo] = useState(null)
  const [importando, setImportando] = useState(false)
  const [previewData, setPreviewData] = useState([])
  const [rawData, setRawData] = useState([])
  const [headersPlanilha, setHeadersPlanilha] = useState([])
  const [mapeamento, setMapeamento] = useState({})
  const [etapaImport, setEtapaImport] = useState('upload')
  const [dadosMapeados, setDadosMapeados] = useState([])
  const [modalEmail, setModalEmail] = useState(null)
  const [copiado, setCopiado] = useState(false)

  // === FILTRO DE PERÍODO ===
  const [filtroPeriodo, setFiltroPeriodo] = useState('todos')
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear())
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth())
  const [mostrarSeletorMes, setMostrarSeletorMes] = useState(false)

  const carregarLeads = useCallback(async () => {
    setCarregando(true)
    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .is('excluido_em', null)
      .not('status_funil', 'in', '(cliente_ativo,arquivado)')
      .order('score', { ascending: false })
    if (!error) setLeads(data || [])
    setCarregando(false)
  }, [])

  useEffect(() => { carregarLeads() }, [carregarLeads])

  // Aplica filtro de período nos leads carregados
  const leadsFiltrados = useMemo(() => {
    const { inicio, fim } = getPeriodoFiltro(filtroPeriodo, filtroAno, filtroMes)
    return leads.filter(lead => {
      if (!lead.criado_em) return true
      const dataLead = new Date(lead.criado_em)
      return dataLead >= inicio && dataLead <= fim
    })
  }, [leads, filtroPeriodo, filtroAno, filtroMes])

  const moverLead = async (leadId, novoStatus) => {
    if (novoStatus === 'fechado_ganho') {
      setModalCliente(leads.find(l => l.id === leadId))
      return
    }
    if (novoStatus === 'fechado_perdido') {
      setModalArquivar(leads.find(l => l.id === leadId))
      return
    }
    const { error } = await supabase.from('empresas').update({ status_funil: novoStatus }).eq('id', leadId)
    if (!error) setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status_funil: novoStatus } : l))
  }

  const converterEmCliente = async () => {
    if (!modalCliente) return
    await supabase.from('empresas').update({
      status_funil: 'cliente_ativo', produto_contratado: produtoCliente, data_contratacao: new Date().toISOString(),
    }).eq('id', modalCliente.id)
    setLeads(prev => prev.filter(l => l.id !== modalCliente.id))
    setModalCliente(null)
    setProdutoCliente('cloudfy')
  }

  const arquivarLead = async () => {
    if (!modalArquivar) return
    await supabase.from('empresas').update({
      status_funil: 'arquivado', motivo_arquivamento: motivoArquivar || 'Perdido', data_arquivamento: new Date().toISOString(),
    }).eq('id', modalArquivar.id)
    setLeads(prev => prev.filter(l => l.id !== modalArquivar.id))
    setModalArquivar(null)
    setMotivoArquivar('')
  }

  const handleSalvarEdicao = async (form) => {
    await supabase.from('empresas').update(form).eq('id', form.id)
    setModalEmpresa(null)
    carregarLeads()
  }

  const copiarMensagem = async () => {
    if (!modalEmail) return
    const mensagem = gerarMensagemEmail(modalEmail)
    await navigator.clipboard.writeText(mensagem)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const detectarMapeamento = (headers) => {
    const map = {}
    const sinonimos = {
      nome: ['nome', 'razao_social', 'razão social', 'razao social', 'nome_fantasia', 'empresa', 'cliente'],
      cnpj: ['cnpj', 'cnpj_cpf', 'documento'],
      telefone: ['telefone', 'tel', 'celular', 'whatsapp', 'fone', 'phone', 'contato'],
      email: ['email', 'e-mail', 'mail', 'correio'],
      segmento: ['segmento', 'categoria', 'ramo', 'setor', 'tipo'],
      municipio: ['municipio', 'município', 'cidade', 'city'],
      bairro: ['bairro', 'neighborhood', 'bairros'],
      score: ['score', 'pontuacao', 'pontuação', 'nota', 'ranking'],
      classificacao: ['classificacao', 'classificação', 'classificação', 'classe', 'tipo'],
      produto_sugerido: ['produto_sugerido', 'produto', 'produtos', 'solucao', 'solução', 'servico', 'serviço'],
    }

    headers.forEach((h, idx) => {
      const hLower = h.toLowerCase().trim()
      for (const [campo, lista] of Object.entries(sinonimos)) {
        if (lista.includes(hLower) && !map[campo]) {
          map[campo] = idx
        }
      }
    })
    return map
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'xls') {
      alert('Formato não suportado. Use CSV ou Excel (.xlsx/.xls)')
      return
    }
    setArquivo(file)
    setEtapaImport('upload')
    setPreviewData([])
    setRawData([])
    setHeadersPlanilha([])
    setMapeamento({})
    setDadosMapeados([])

    let headers = []
    let rows = []

    if (ext === 'csv') {
      const text = await file.text()
      const lines = text.split('\n').filter(l => l.trim())
      headers = lines[0].split(',').map(h => h.trim())
      rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim())
        const obj = {}
        headers.forEach((h, i) => { obj[h] = values[i] || '' })
        return obj
      }).filter(r => Object.values(r).some(v => v))
    } else {
      try {
        const XLSX = await import('xlsx')
        const data = await file.arrayBuffer()
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 })
        headers = json[0].map(h => String(h).trim())
        rows = json.slice(1).map(row => {
          const obj = {}
          headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? String(row[i]).trim() : '' })
          return obj
        }).filter(r => Object.values(r).some(v => v))
      } catch { alert('Instale: npm install xlsx'); return }
    }

    setHeadersPlanilha(headers)
    setRawData(rows)
    setPreviewData(rows.slice(0, 5))
    const mapDetectado = detectarMapeamento(headers)
    setMapeamento(mapDetectado)
    setEtapaImport('mapeamento')
  }

  const aplicarMapeamento = () => {
    const mapeados = rawData.map(row => {
      const obj = {}
      CAMPOS_BANCO.forEach(campo => {
        const idx = mapeamento[campo.key]
        if (idx !== undefined && idx !== null && headersPlanilha[idx]) {
          const valor = row[headersPlanilha[idx]] || ''
          if (campo.key === 'score') {
            obj[campo.key] = parseInt(valor) || 50
          } else {
            obj[campo.key] = valor
          }
        } else {
          obj[campo.key] = campo.key === 'score' ? 50 : ''
        }
      })
      return obj
    })
    setDadosMapeados(mapeados)
    setEtapaImport('preview')
  }

  const atualizarCampoMapeado = (rowIndex, campoKey, novoValor) => {
    setDadosMapeados(prev => {
      const novo = [...prev]
      novo[rowIndex] = { ...novo[rowIndex], [campoKey]: novoValor }
      return novo
    })
  }

  const importarLeads = async () => {
    if (dadosMapeados.length === 0) return
    setImportando(true)
    try {
      const leadsMapped = dadosMapeados.filter(l => l.nome).map(l => ({
        fonte: 'upload_' + arquivo.name.split('.').pop().toLowerCase(),
        bruto: l,
        nome: l.nome || 'Sem nome',
        cnpj: l.cnpj || '',
        telefone: l.telefone || '',
        email: l.email || '',
        segmento: l.segmento || '',
        municipio: l.municipio || '',
        bairro: l.bairro || '',
        score: parseInt(l.score) || 50,
        classificacao: l.classificacao || '',
        produto_sugerido: l.produto_sugerido || 'qualificar',
        status: 'pendente',
      }))
      await supabase.from('staging_raspagem').insert(leadsMapped)
      alert(`${leadsMapped.length} leads importados! Vá para Triagem.`)
      fecharModalImport()
    } catch (err) { alert('Erro: ' + err.message) }
    finally { setImportando(false) }
  }

  const fecharModalImport = () => {
    setModalImport(false)
    setArquivo(null)
    setPreviewData([])
    setRawData([])
    setHeadersPlanilha([])
    setMapeamento({})
    setEtapaImport('upload')
    setDadosMapeados([])
  }

  const leadsPorColuna = (status) => leadsFiltrados.filter(l => l.status_funil === status)

  const anosDisponiveis = useMemo(() => {
    const anos = new Set()
    leads.forEach(l => {
      if (l.criado_em) anos.add(new Date(l.criado_em).getFullYear())
    })
    return Array.from(anos).sort((a, b) => b - a)
  }, [leads])

  return (
    <div className="min-h-screen flex flex-col overflow-hidden bg-[#0a0c10]">
      {/* Header */}
      <div className="flex flex-col gap-3 md:gap-4 p-3 md:p-4 lg:p-6 pb-2 md:pb-3 shrink-0 border-b border-white/[0.08]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-100">Funil de Vendas</h1>
            <p className="text-xs md:text-sm text-gray-400 mt-1">Arraste os cards entre as colunas ou use as setas para mover de etapa</p>
          </div>
          <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
            <span className="px-2 md:px-3 py-1.5 rounded-lg bg-surface-card border border-white/[0.08] text-xs md:text-sm text-gray-400 whitespace-nowrap">
              {leadsFiltrados.length} leads{filtroPeriodo !== 'todos' ? ` em ${formatarPeriodo(filtroPeriodo, filtroAno, filtroMes).toLowerCase()}` : ''}
            </span>
            <button onClick={() => setModalImport(true)} className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 bg-accent text-black rounded-lg text-xs md:text-sm font-medium hover:bg-accent/90 transition-colors whitespace-nowrap">
              <Upload size={14} className="md:w-4 md:h-4" /><span className="hidden sm:inline">Importar Planilha</span><span className="sm:hidden">Importar</span>
            </button>
          </div>
        </div>

        {/* Filtro de Período */}
        <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
          {/* Botões rápidos */}
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'este_mes', label: 'Este mês' },
            { id: 'mes_passado', label: 'Mês passado' },
            { id: 'ultimos_3', label: 'Últimos 3 meses' },
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => { setFiltroPeriodo(btn.id); setMostrarSeletorMes(false) }}
              className={`px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                filtroPeriodo === btn.id
                  ? 'bg-accent/20 text-accent border border-accent/30'
                  : 'bg-surface-card border border-white/[0.08] text-gray-400 hover:text-gray-200 hover:border-white/[0.12]'
              }`}
            >
              {btn.label}
            </button>
          ))}

          {/* Seletor de mês customizado */}
          <div className="relative">
            <button
              onClick={() => setMostrarSeletorMes(!mostrarSeletorMes)}
              className={`flex items-center gap-1 px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                filtroPeriodo === 'custom'
                  ? 'bg-accent/20 text-accent border border-accent/30'
                  : 'bg-surface-card border border-white/[0.08] text-gray-400 hover:text-gray-200 hover:border-white/[0.12]'
              }`}
            >
              <Calendar size={12} />
              {filtroPeriodo === 'custom' ? formatarPeriodo('custom', filtroAno, filtroMes) : 'Escolher mês'}
              <ChevronDown size={10} />
            </button>

            {mostrarSeletorMes && (
              <div className="absolute top-full left-0 mt-2 bg-surface-card border border-white/[0.08] rounded-xl p-4 shadow-2xl z-50 w-56 md:w-64">
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => setFiltroAno(a => a - 1)}
                    className="p-1 rounded hover:bg-white/5 text-gray-400"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-sm font-medium text-gray-200">{filtroAno}</span>
                  <button
                    onClick={() => setFiltroAno(a => a + 1)}
                    className="p-1 rounded hover:bg-white/5 text-gray-400"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {MESES.map((m, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setFiltroMes(i)
                        setFiltroAno(filtroAno)
                        setFiltroPeriodo('custom')
                        setMostrarSeletorMes(false)
                      }}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        filtroPeriodo === 'custom' && filtroMes === i && filtroAno === filtroAno
                          ? 'bg-accent/20 text-accent'
                          : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                      }`}
                    >
                      {m.slice(0, 3)}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setMostrarSeletorMes(false)}
                  className="mt-3 w-full py-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>

          {/* Fechar filtro se estiver ativo */}
          {filtroPeriodo !== 'todos' && (
            <button
              onClick={() => { setFiltroPeriodo('todos'); setMostrarSeletorMes(false) }}
              className="flex items-center gap-1 px-1.5 md:px-2 py-1 md:py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors whitespace-nowrap"
            >
              <X size={10} /> Limpar
            </button>
          )}
        </div>
      </div>

      {/* Kanban */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-3 md:px-4 lg:px-6 pt-3 md:pt-4 pb-12">
        <div className="flex gap-4 h-full min-h-0" style={{ width: 'max-content' }}>
          {COLUNAS.map(coluna => {
            const colLeads = leadsPorColuna(coluna.id)
            return (
              <div
                key={coluna.id}
                className={`w-64 md:w-72 flex flex-col bg-surface-card border border-white/[0.08] rounded-xl overflow-hidden ${coluna.cor} border-l-4 min-h-0 shrink-0`}
                style={{ height: '100%', maxHeight: '100%' }}
                onDragOver={e => { e.preventDefault(); setColunaArrastando(coluna.id) }}
                onDragLeave={() => setColunaArrastando(null)}
                onDrop={e => {
                  e.preventDefault()
                  const leadId = e.dataTransfer.getData('leadId')
                  if (leadId && colunaArrastando === coluna.id) moverLead(leadId, coluna.id)
                  setColunaArrastando(null)
                }}
              >
                <div className={`px-3 py-2.5 border-b border-white/[0.08] flex items-center justify-between shrink-0 ${coluna.bg}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="font-semibold text-gray-200 text-xs md:text-sm truncate">{coluna.label}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${coluna.badge}`}>{colLeads.length}</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                  {carregando ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="bg-surface border border-white/[0.04] rounded-lg p-3 animate-pulse">
                        <div className="h-4 bg-white/5 rounded w-3/4 mb-2" /><div className="h-3 bg-white/5 rounded w-1/2" />
                      </div>
                    ))
                  ) : colLeads.length === 0 ? (
                    <div className="text-center py-8 text-gray-600 text-xs md:text-sm">Nenhum lead nesta etapa</div>
                  ) : (
                    colLeads.map(lead => (
                      <div
                        key={lead.id} draggable
                        onDragStart={e => e.dataTransfer.setData('leadId', lead.id)}
                        className="bg-surface border border-white/[0.06] rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-white/[0.12] hover:shadow-lg hover:shadow-black/20 transition-all group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 md:w-8 h-6 md:h-8 rounded-lg bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center text-accent font-bold text-xs shrink-0">
                              {(lead.nome_fantasia || lead.nome).split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-medium text-gray-100 text-xs md:text-sm truncate">{lead.nome_fantasia || lead.nome}</h4>
                              {lead.tipo === 'filial' && <span className="text-[10px] text-yellow-400">{lead.unidade || 'Filial'}</span>}
                            </div>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button onClick={() => setModalEmpresa(lead)} className="p-1 rounded hover:bg-white/5 text-gray-400 hover:text-gray-200" title="Ver detalhes"><MoreHorizontal size={14} /></button>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2"><span className="truncate">{lead.segmento || '—'}</span><span>·</span><span className="truncate">{lead.municipio || '—'}</span></div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-accent to-emerald-400" style={{ width: `${lead.score}%` }} /></div>
                          <span className="text-xs font-semibold text-gray-300 shrink-0">{lead.score}</span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                          <div className="flex gap-1">
                            {lead.email && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setModalEmail(lead); setCopiado(false) }}
                                className="p-1 md:p-1.5 rounded-lg hover:bg-purple-500/10 text-gray-500 hover:text-purple-400 transition-colors"
                                title="Enviar E-mail"
                              >
                                <Mail size={14} />
                              </button>
                            )}
                            {lead.telefone && <a href={`https://wa.me/${lead.telefone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-1 md:p-1.5 rounded-lg hover:bg-green-500/10 text-gray-500 hover:text-green-400 transition-colors" title="WhatsApp"><MessageCircle size={14} /></a>}
                            {lead.telefone && <a href={`tel:${lead.telefone.replace(/\D/g, '')}`} className="p-1 md:p-1.5 rounded-lg hover:bg-blue-500/10 text-gray-500 hover:text-blue-400 transition-colors" title="Ligar"><Phone size={14} /></a>}
                          </div>
                          <div className="flex gap-1">
                            {COLUNAS.map((c, idx) => {
                              const currentIdx = COLUNAS.findIndex(cc => cc.id === lead.status_funil)
                              if (c.id === lead.status_funil) return null
                              const canMove = Math.abs(idx - currentIdx) === 1
                              if (!canMove) return null
                              return (
                                <button key={c.id} onClick={() => moverLead(lead.id, c.id)} className={`p-1 rounded transition-colors ${idx > currentIdx ? 'hover:bg-green-500/10 text-gray-500 hover:text-green-400' : 'hover:bg-yellow-500/10 text-gray-500 hover:text-yellow-400'}`} title={`Mover para ${c.label}`}>
                                  {idx > currentIdx ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modals */}
      {modalEmpresa && <ModalEmpresa empresa={modalEmpresa} onClose={() => setModalEmpresa(null)} onSalvar={handleSalvarEdicao} />}

      {modalCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-card border border-white/[0.08] rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center"><CheckCircle2 size={20} className="text-green-400" /></div>
              <div><h3 className="text-lg font-semibold text-gray-100">Converter em Cliente</h3><p className="text-sm text-gray-400">{modalCliente.nome_fantasia || modalCliente.nome}</p></div>
            </div>
            <div className="mb-6">
              <label className="block text-xs font-medium text-gray-400 mb-2">Produto Contratado</label>
              <div className="grid grid-cols-2 gap-3">
                {[{ value: 'cloudfy', label: 'Cloudfy', desc: 'Sistema de gestão' }, { value: 'cplung', label: 'Cplung', desc: 'Plataforma de delivery' }].map(({ value, label, desc }) => (
                  <button key={value} onClick={() => setProdutoCliente(value)} className={`p-3 rounded-xl border text-left transition-all ${produtoCliente === value ? 'border-accent bg-accent/10' : 'border-white/[0.08] hover:border-white/[0.12]'}`}>
                    <div className={`font-medium text-sm ${produtoCliente === value ? 'text-accent' : 'text-gray-300'}`}>{label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setModalCliente(null); setProdutoCliente('cloudfy') }} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/5">Cancelar</button>
              <button onClick={converterEmCliente} className="flex-1 px-4 py-2.5 bg-green-500/20 text-green-300 border border-green-500/30 rounded-xl text-sm font-medium hover:bg-green-500/30">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {modalArquivar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-card border border-white/[0.08] rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center"><Archive size={20} className="text-red-400" /></div>
              <div><h3 className="text-lg font-semibold text-gray-100">Arquivar Lead</h3><p className="text-sm text-gray-400">{modalArquivar.nome_fantasia || modalArquivar.nome}</p></div>
            </div>
            <div className="mb-6">
              <label className="block text-xs font-medium text-gray-400 mb-2">Motivo do arquivamento</label>
              <select value={motivoArquivar} onChange={e => setMotivoArquivar(e.target.value)} className="w-full bg-surface border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500/30">
                <option value="">Selecione um motivo...</option>
                <option value="Não atende perfil">Não atende perfil</option>
                <option value="Não respondeu">Não respondeu contato</option>
                <option value="Preço alto">Preço muito alto</option>
                <option value="Concorrente">Fechou com concorrente</option>
                <option value="Não tem interesse">Não tem interesse</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setModalArquivar(null); setMotivoArquivar('') }} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/5">Cancelar</button>
              <button onClick={arquivarLead} disabled={!motivoArquivar} className="flex-1 px-4 py-2.5 bg-red-500/20 text-red-300 border border-red-500/30 rounded-xl text-sm font-medium hover:bg-red-500/30 disabled:opacity-50">Arquivar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de E-mail */}
      {modalEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-card border border-white/[0.08] rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center"><Mail size={20} className="text-purple-400" /></div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-100">Enviar E-mail</h3>
                  <p className="text-sm text-gray-400">{modalEmail.nome_fantasia || modalEmail.nome}</p>
                </div>
              </div>
              <button onClick={() => setModalEmail(null)} className="p-2 rounded-lg hover:bg-white/5 text-gray-400"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div className="bg-surface/50 border border-white/[0.06] rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Para:</span>
                  <span className="text-gray-200 font-medium">{modalEmail.email}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Assunto</label>
                <input type="text" value={`Bem-vindo(a), ${modalEmail.nome_fantasia || modalEmail.nome || ''}!`} readOnly className="w-full bg-surface border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-gray-300 focus:outline-none" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Mensagem</label>
                <textarea value={gerarMensagemEmail(modalEmail)} readOnly className="w-full min-h-[280px] bg-surface border border-white/[0.08] rounded-lg p-4 text-sm text-gray-300 leading-relaxed focus:outline-none resize-none font-mono" />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setModalEmail(null)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors">Fechar</button>
                <button onClick={copiarMensagem} className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${copiado ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-surface border border-white/[0.08] text-gray-300 hover:bg-white/5'}`}>
                  {copiado ? <><Check size={16} />Copiado!</> : <><Copy size={16} />Copiar Mensagem</>}
                </button>
                <a href={`mailto:${modalEmail.email}?subject=${encodeURIComponent(`Bem-vindo(a), ${modalEmail.nome_fantasia || modalEmail.nome || ''}!`)}&body=${encodeURIComponent(gerarMensagemEmail(modalEmail))}`} className="flex-1 px-4 py-2.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-xl text-sm font-medium hover:bg-purple-500/30 transition-colors flex items-center justify-center gap-2" onClick={() => setModalEmail(null)}>
                  <Send size={16} />Abrir E-mail
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importação */}
      {modalImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-card border border-white/[0.08] rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center"><FileSpreadsheet size={20} className="text-accent" /></div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-100">Importar Planilha</h3>
                  <p className="text-sm text-gray-400">
                    {etapaImport === 'upload' && 'Selecione um arquivo CSV ou Excel'}
                    {etapaImport === 'mapeamento' && `Mapeie as colunas da planilha (${rawData.length} registros)`}
                    {etapaImport === 'preview' && `Revise e edite os dados antes de importar (${dadosMapeados.length} registros)`}
                  </p>
                </div>
              </div>
              <button onClick={fecharModalImport} className="p-2 rounded-lg hover:bg-white/5 text-gray-400"><X size={20} /></button>
            </div>

            <div className="flex items-center gap-0 px-6 py-3 border-b border-white/[0.08] shrink-0 bg-surface/30">
              {[{ id: 'upload', label: 'Upload' }, { id: 'mapeamento', label: 'Mapeamento' }, { id: 'preview', label: 'Revisão' }].map((step, idx) => {
                const isActive = etapaImport === step.id
                const isDone = ['mapeamento', 'preview'].indexOf(etapaImport) > ['mapeamento', 'preview'].indexOf(step.id)
                return (
                  <div key={step.id} className="flex items-center">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${isActive ? 'bg-accent/15 text-accent' : isDone ? 'text-green-400' : 'text-gray-500'}`}>
                      {isDone ? <Check size={14} /> : <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs">{idx + 1}</span>}
                      {step.label}
                    </div>
                    {idx < 2 && <div className="w-8 h-px bg-white/[0.08] mx-2" />}
                  </div>
                )
              })}
            </div>

            <div className="flex-1 overflow-y-auto p-6 min-h-0">
              {etapaImport === 'upload' && (
                <div className="border-2 border-dashed border-white/[0.08] rounded-xl p-12 text-center hover:border-accent/30 transition-colors cursor-pointer" onClick={() => document.getElementById('file-upload-funil').click()}>
                  <input id="file-upload-funil" type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
                  <Upload size={48} className="mx-auto mb-4 text-gray-500" />
                  <p className="text-base text-gray-300 font-medium">{arquivo ? arquivo.name : 'Clique para selecionar arquivo'}</p>
                  <p className="text-sm text-gray-500 mt-2">{arquivo ? `${(arquivo.size / 1024).toFixed(1)} KB` : 'CSV ou Excel (.csv, .xlsx, .xls)'}</p>
                </div>
              )}

              {etapaImport === 'mapeamento' && (
                <div className="space-y-6">
                  <div className="bg-surface/50 border border-white/[0.06] rounded-lg p-4">
                    <p className="text-sm text-gray-400"><AlertCircle size={14} className="inline mr-1.5 -mt-0.5 text-yellow-400" />Associe cada coluna da planilha ao campo correspondente no banco de dados. Campos obrigatórios estão marcados com <span className="text-red-400">*</span>.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {CAMPOS_BANCO.map(campo => (
                      <div key={campo.key} className="bg-surface border border-white/[0.08] rounded-lg p-4">
                        <label className="block text-sm font-medium text-gray-300 mb-2">{campo.label}{campo.obrigatorio && <span className="text-red-400 ml-1">*</span>}</label>
                        <div className="relative">
                          <select value={mapeamento[campo.key] !== undefined ? mapeamento[campo.key] : ''} onChange={e => { const val = e.target.value; setMapeamento(prev => ({ ...prev, [campo.key]: val === '' ? undefined : parseInt(val) })) }} className="w-full bg-surface-card border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent/30 appearance-none cursor-pointer">
                            <option value="">— Não mapear —</option>
                            {headersPlanilha.map((h, idx) => <option key={idx} value={idx}>{h}</option>)}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                        </div>
                        {mapeamento[campo.key] !== undefined && headersPlanilha[mapeamento[campo.key]] && (
                          <p className="text-xs text-gray-500 mt-1.5">Exemplo: <span className="text-gray-300">{rawData[0]?.[headersPlanilha[mapeamento[campo.key]]] || '—'}</span></p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-3">Preview da planilha original</h4>
                    <div className="bg-surface border border-white/[0.08] rounded-lg overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead><tr className="border-b border-white/[0.08] bg-surface/50">{headersPlanilha.map((h, i) => <th key={i} className="px-3 py-2.5 text-left text-gray-400 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
                        <tbody>{rawData.slice(0, 3).map((row, i) => <tr key={i} className="border-b border-white/[0.04]">{headersPlanilha.map((h, j) => <td key={j} className="px-3 py-2 text-gray-300 whitespace-nowrap">{row[h] || '—'}</td>)}</tr>)}</tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {etapaImport === 'preview' && (
                <div className="space-y-4">
                  <div className="bg-surface/50 border border-white/[0.06] rounded-lg p-4 flex items-center justify-between">
                    <p className="text-sm text-gray-400"><Check size={14} className="inline mr-1.5 -mt-0.5 text-green-400" />Revise os dados mapeados. Você pode editar qualquer campo clicando nele.</p>
                    <span className="text-sm text-gray-500">{dadosMapeados.length} registros</span>
                  </div>
                  <div className="bg-surface border border-white/[0.08] rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-[50vh]">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 z-10"><tr className="border-b border-white/[0.08] bg-surface-card"><th className="px-3 py-2.5 text-left text-gray-400 font-medium w-10">#</th>{CAMPOS_BANCO.map(c => <th key={c.key} className="px-3 py-2.5 text-left text-gray-400 font-medium whitespace-nowrap">{c.label}{c.obrigatorio && <span className="text-red-400 ml-1">*</span>}</th>)}</tr></thead>
                        <tbody>{dadosMapeados.map((row, i) => <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]"><td className="px-3 py-2 text-gray-500">{i + 1}</td>{CAMPOS_BANCO.map(c => <td key={c.key} className="px-3 py-2"><input type="text" value={row[c.key] || ''} onChange={e => atualizarCampoMapeado(i, c.key, e.target.value)} className={`w-full min-w-[120px] bg-transparent border border-transparent rounded px-2 py-1 text-gray-300 text-xs focus:outline-none focus:border-accent/50 focus:bg-surface/50 transition-all ${c.obrigatorio && !row[c.key] ? 'border-red-500/30 bg-red-500/5' : ''}`} placeholder={c.obrigatorio ? 'Obrigatório' : '—'} /></td>)}</tr>)}</tbody>
                      </table>
                    </div>
                  </div>
                  <div className="bg-surface/50 border border-white/[0.06] rounded-lg p-4">
                    <p className="text-xs text-gray-500"><strong className="text-gray-400">Importante:</strong> Os dados serão enviados para <strong className="text-accent">Triagem</strong> para aprovação antes de entrarem no funil.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.08] shrink-0 bg-surface/30">
              <button onClick={fecharModalImport} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors">Cancelar</button>
              <div className="flex gap-3">
                {etapaImport === 'mapeamento' && (
                  <>
                    <button onClick={() => setEtapaImport('upload')} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors">Voltar</button>
                    <button onClick={aplicarMapeamento} disabled={!mapeamento.nome && mapeamento.nome !== 0} className="px-5 py-2.5 bg-accent text-black rounded-xl text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors flex items-center gap-2"><Check size={16} />Continuar</button>
                  </>
                )}
                {etapaImport === 'preview' && (
                  <>
                    <button onClick={() => setEtapaImport('mapeamento')} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors">Voltar</button>
                    <button onClick={importarLeads} disabled={importando || dadosMapeados.some(d => !d.nome)} className="px-5 py-2.5 bg-accent text-black rounded-xl text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors flex items-center gap-2">
                      {importando ? <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />Importando...</> : <><FileText size={16} />Importar {dadosMapeados.length} Leads</>}
                    </button>
                  </>
                )}
                {etapaImport === 'upload' && arquivo && <button onClick={() => setEtapaImport('mapeamento')} className="px-5 py-2.5 bg-accent text-black rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors">Continuar</button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
