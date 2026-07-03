import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { FiltrosAvancados } from '../components/ui/FiltrosAvancados'
import { Paginacao } from '../components/ui/Paginacao'
import { SkeletonTabela } from '../components/ui/SkeletonTabela'
import { CheckCircle, XCircle, FileSpreadsheet, Upload, X, FileText, AlertTriangle, AlertCircle, Check, ChevronDown } from 'lucide-react'

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

export default function Triagem() {
  const [staging, setStaging] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [pagina, setPagina] = useState(1)
  const [totalRegistros, setTotalRegistros] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [opcoesFiltro, setOpcoesFiltro] = useState({ status: [], segmento: [], produto: [], municipio: [] })
  const [ordenacao, setOrdenacao] = useState({ campo: 'criado_em', direcao: 'desc' })
  const [stats, setStats] = useState({ pendente: 0, aprovado: 0, descartado: 0 })

  // Importação - NOVO SISTEMA
  const [modalImport, setModalImport] = useState(false)
  const [arquivo, setArquivo] = useState(null)
  const [importando, setImportando] = useState(false)
  const [previewData, setPreviewData] = useState([])
  const [rawData, setRawData] = useState([])
  const [headersPlanilha, setHeadersPlanilha] = useState([])
  const [mapeamento, setMapeamento] = useState({})
  const [etapaImport, setEtapaImport] = useState('upload')
  const [dadosMapeados, setDadosMapeados] = useState([])
  const [erroImport, setErroImport] = useState('')

  const [filtros, setFiltros] = useState({
    busca: '',
    segmento: '',
    municipio: '',
    status: 'pendente',
    produto_sugerido: '',
    classificacao: '',
    porte: '',
    scoreMin: 0,
    scoreMax: 100,
  })

  const ITENS_POR_PAGINA = 10

  const carregarDados = useCallback(async () => {
    setCarregando(true)
    try {
      let query = supabase
        .from('staging_raspagem')
        .select('*', { count: 'exact' })

      if (filtros.busca) {
        query = query.or(`nome.ilike.%${filtros.busca}%,cnpj.ilike.%${filtros.busca}%`)
      }
      if (filtros.segmento) query = query.eq('segmento', filtros.segmento)
      if (filtros.municipio) query = query.ilike('municipio', `%${filtros.municipio}%`)
      if (filtros.status) query = query.eq('status', filtros.status)
      if (filtros.produto_sugerido) query = query.eq('produto_sugerido', filtros.produto_sugerido)
      if (filtros.classificacao) query = query.eq('classificacao', filtros.classificacao)
      if (filtros.scoreMin > 0) query = query.gte('score', filtros.scoreMin)
      if (filtros.scoreMax < 100) query = query.lte('score', filtros.scoreMax)

      query = query.order(ordenacao.campo, { ascending: ordenacao.direcao === 'asc' })

      const from = (pagina - 1) * ITENS_POR_PAGINA
      const to = from + ITENS_POR_PAGINA - 1
      query = query.range(from, to)

      const { data, error, count } = await query
      if (error) throw error

      setStaging(data || [])
      setTotalRegistros(count || 0)
      setTotalPaginas(Math.ceil((count || 0) / ITENS_POR_PAGINA))

      // Stats
      const { data: allData } = await supabase.from('staging_raspagem').select('status')
      const s = { pendente: 0, aprovado: 0, descartado: 0 }
      allData?.forEach(d => { if (s[d.status] !== undefined) s[d.status]++ })
      setStats(s)

      // Opções
      const { data: opts } = await supabase.from('staging_raspagem').select('segmento, municipio, status, produto_sugerido')
      setOpcoesFiltro({
        status: ['pendente', 'aprovado', 'descartado'],
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

  const aprovarLead = async (id) => {
    const { data: lead } = await supabase.from('staging_raspagem').select('*').eq('id', id).single()
    if (!lead) return

    const { data: empresa } = await supabase.from('empresas').insert({
      nome: lead.nome,
      nome_fantasia: lead.nome,
      cnpj: lead.cnpj,
      telefone: lead.telefone,
      email: lead.email,
      segmento: lead.segmento,
      municipio: lead.municipio,
      bairro: lead.bairro,
      score: lead.score,
      classificacao: lead.classificacao,
      produto_sugerido: lead.produto_sugerido,
      canal_origem: 'scraping',
      status_funil: 'novo',
    }).select().single()

    await supabase.from('staging_raspagem').update({
      status: 'aprovado',
      empresa_id: empresa?.id,
      processado_em: new Date().toISOString(),
    }).eq('id', id)

    carregarDados()
  }

  const descartarLead = async (id, motivo = '') => {
    await supabase.from('staging_raspagem').update({
      status: 'descartado',
      motivo_descarte: motivo || 'Descartado manualmente',
      processado_em: new Date().toISOString(),
    }).eq('id', id)
    carregarDados()
  }

  // === SISTEMA DE IMPORTAÇÃO MELHORADO ===

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

    setErroImport('')
    const ext = file.name.split('.').pop().toLowerCase()

    if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'xls') {
      setErroImport('Formato não suportado. Use CSV ou Excel (.xlsx/.xls)')
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

    try {
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
        const XLSX = await import('xlsx')
        const data = await file.arrayBuffer()
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 })

        if (json.length < 2) {
          setErroImport('Arquivo Excel vazio ou sem dados')
          return
        }

        headers = json[0].map(h => String(h).trim())
        rows = json.slice(1).map(row => {
          const obj = {}
          headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? String(row[i]).trim() : '' })
          return obj
        }).filter(r => Object.values(r).some(v => v))
      }

      setHeadersPlanilha(headers)
      setRawData(rows)
      setPreviewData(rows.slice(0, 5))
      const mapDetectado = detectarMapeamento(headers)
      setMapeamento(mapDetectado)
      setEtapaImport('mapeamento')
    } catch (err) {
      setErroImport('Erro ao ler arquivo: ' + err.message)
      console.error(err)
    }
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
    setErroImport('')

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

      if (leadsMapped.length === 0) {
        setErroImport('Nenhum lead válido encontrado')
        setImportando(false)
        return
      }

      const { error } = await supabase.from('staging_raspagem').insert(leadsMapped)
      if (error) throw error

      alert(`${leadsMapped.length} leads importados com sucesso!`)
      fecharModalImport()
      carregarDados()
    } catch (err) {
      setErroImport('Erro na importação: ' + err.message)
    } finally {
      setImportando(false)
    }
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
    setErroImport('')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Triagem</h1>
          <p className="text-sm text-gray-400 mt-1">Aprove ou descarte leads do scraping</p>
        </div>
        <button
          onClick={() => setModalImport(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent text-black rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors self-start sm:self-auto"
        >
          <Upload size={16} />
          Importar Planilha
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pendentes', valor: stats.pendente, cor: 'text-yellow-400', bg: 'bg-yellow-500/10' },
          { label: 'Aprovados', valor: stats.aprovado, cor: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Descartados', valor: stats.descartado, cor: 'text-red-400', bg: 'bg-red-500/10' },
        ].map(({ label, valor, cor, bg }) => (
          <div key={label} className="bg-surface-card border border-white/[0.08] rounded-xl p-4 text-center hover:border-white/[0.12] transition-colors">
            <div className={`text-2xl font-bold ${cor}`}>{valor}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Score</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Classif.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Produto</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {staging.map(lead => (
                    <tr key={lead.id} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-100">{lead.nome || '—'}</div>
                        <div className="text-xs text-gray-500 font-mono">{lead.cnpj || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">{lead.segmento || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{lead.municipio || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-2 rounded-full bg-surface overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-accent to-emerald-400" style={{ width: `${lead.score}%` }} />
                          </div>
                          <span className="text-sm font-semibold text-gray-200">{lead.score}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                          lead.classificacao === 'A' ? 'bg-green-500/20 text-green-300' :
                          lead.classificacao === 'B' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-red-500/20 text-red-300'
                        }`}>
                          {lead.classificacao || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium capitalize ${
                          lead.produto_sugerido === 'cloudfy' ? 'text-purple-400' :
                          lead.produto_sugerido === 'cplung' ? 'text-teal-400' :
                          'text-gray-400'
                        }`}>
                          {lead.produto_sugerido || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {lead.status === 'pendente' && (
                            <>
                              <button
                                onClick={() => aprovarLead(lead.id)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors"
                              >
                                <CheckCircle size={14} />
                                Aprovar
                              </button>
                              <button
                                onClick={() => descartarLead(lead.id)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors"
                              >
                                <XCircle size={14} />
                                Descartar
                              </button>
                            </>
                          )}
                          {lead.status === 'aprovado' && (
                            <span className="flex items-center gap-1 text-xs text-green-400">
                              <CheckCircle size={14} /> Aprovado
                            </span>
                          )}
                          {lead.status === 'descartado' && (
                            <span className="flex items-center gap-1 text-xs text-red-400">
                              <XCircle size={14} /> Descartado
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {staging.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <FileSpreadsheet size={48} className="mb-3 opacity-30" />
                <p className="text-lg font-medium">Nenhum lead na triagem</p>
                <p className="text-sm">Importe uma planilha para começar.</p>
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

      {/* Modal: Importar Planilha - NOVO SISTEMA */}
      {modalImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-card border border-white/[0.08] rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
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

            {/* Steps */}
            <div className="flex items-center gap-0 px-6 py-3 border-b border-white/[0.08] shrink-0 bg-surface/30">
              {[
                { id: 'upload', label: 'Upload' },
                { id: 'mapeamento', label: 'Mapeamento' },
                { id: 'preview', label: 'Revisão' },
              ].map((step, idx) => {
                const isActive = etapaImport === step.id
                const isDone = ['mapeamento', 'preview'].indexOf(etapaImport) > ['mapeamento', 'preview'].indexOf(step.id)
                return (
                  <div key={step.id} className="flex items-center">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
                      isActive ? 'bg-accent/15 text-accent' : isDone ? 'text-green-400' : 'text-gray-500'
                    }`}>
                      {isDone ? <Check size={14} /> : <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs">{idx + 1}</span>}
                      {step.label}
                    </div>
                    {idx < 2 && <div className="w-8 h-px bg-white/[0.08] mx-2" />}
                  </div>
                )
              })}
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto p-6 min-h-0">
              {/* ETAPA 1: UPLOAD */}
              {etapaImport === 'upload' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-white/[0.08] rounded-xl p-12 text-center hover:border-accent/30 transition-colors cursor-pointer" onClick={() => document.getElementById('file-upload-triagem').click()}>
                    <input id="file-upload-triagem" type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
                    <Upload size={48} className="mx-auto mb-4 text-gray-500" />
                    <p className="text-base text-gray-300 font-medium">{arquivo ? arquivo.name : 'Clique para selecionar arquivo'}</p>
                    <p className="text-sm text-gray-500 mt-2">{arquivo ? `${(arquivo.size / 1024).toFixed(1)} KB` : 'CSV ou Excel (.csv, .xlsx, .xls)'}</p>
                  </div>

                  {erroImport && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      <AlertTriangle size={16} />
                      {erroImport}
                    </div>
                  )}

                  {previewData.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-2">Preview ({previewData.length} primeiros registros):</p>
                      <div className="bg-surface border border-white/[0.08] rounded-lg overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-white/[0.08]">
                              {headersPlanilha.map((h, i) => (
                                <th key={i} className="px-3 py-2 text-left text-gray-400 font-medium whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.map((row, i) => (
                              <tr key={i} className="border-b border-white/[0.04]">
                                {headersPlanilha.map((h, j) => (
                                  <td key={j} className="px-3 py-2 text-gray-300 whitespace-nowrap">{row[h] || '—'}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ETAPA 2: MAPEAMENTO */}
              {etapaImport === 'mapeamento' && (
                <div className="space-y-6">
                  <div className="bg-surface/50 border border-white/[0.06] rounded-lg p-4">
                    <p className="text-sm text-gray-400">
                      <AlertCircle size={14} className="inline mr-1.5 -mt-0.5 text-yellow-400" />
                      Associe cada coluna da planilha ao campo correspondente no banco de dados. Campos obrigatórios estão marcados com <span className="text-red-400">*</span>.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {CAMPOS_BANCO.map(campo => (
                      <div key={campo.key} className="bg-surface border border-white/[0.08] rounded-lg p-4">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          {campo.label}
                          {campo.obrigatorio && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        <div className="relative">
                          <select
                            value={mapeamento[campo.key] !== undefined ? mapeamento[campo.key] : ''}
                            onChange={e => {
                              const val = e.target.value
                              setMapeamento(prev => ({
                                ...prev,
                                [campo.key]: val === '' ? undefined : parseInt(val)
                              }))
                            }}
                            className="w-full bg-surface-card border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent/30 appearance-none cursor-pointer"
                          >
                            <option value="">— Não mapear —</option>
                            {headersPlanilha.map((h, idx) => (
                              <option key={idx} value={idx}>{h}</option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                        </div>
                        {mapeamento[campo.key] !== undefined && headersPlanilha[mapeamento[campo.key]] && (
                          <p className="text-xs text-gray-500 mt-1.5">
                            Exemplo: <span className="text-gray-300">{rawData[0]?.[headersPlanilha[mapeamento[campo.key]]] || '—'}</span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Preview das primeiras linhas */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-3">Preview da planilha original</h4>
                    <div className="bg-surface border border-white/[0.08] rounded-lg overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/[0.08] bg-surface/50">
                            {headersPlanilha.map((h, i) => (
                              <th key={i} className="px-3 py-2.5 text-left text-gray-400 font-medium whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rawData.slice(0, 3).map((row, i) => (
                            <tr key={i} className="border-b border-white/[0.04]">
                              {headersPlanilha.map((h, j) => (
                                <td key={j} className="px-3 py-2 text-gray-300 whitespace-nowrap">{row[h] || '—'}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ETAPA 3: PREVIEW / REVISÃO */}
              {etapaImport === 'preview' && (
                <div className="space-y-4">
                  <div className="bg-surface/50 border border-white/[0.06] rounded-lg p-4 flex items-center justify-between">
                    <p className="text-sm text-gray-400">
                      <Check size={14} className="inline mr-1.5 -mt-0.5 text-green-400" />
                      Revise os dados mapeados. Você pode editar qualquer campo clicando nele.
                    </p>
                    <span className="text-sm text-gray-500">{dadosMapeados.length} registros</span>
                  </div>

                  <div className="bg-surface border border-white/[0.08] rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-[50vh]">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 z-10">
                          <tr className="border-b border-white/[0.08] bg-surface-card">
                            <th className="px-3 py-2.5 text-left text-gray-400 font-medium w-10">#</th>
                            {CAMPOS_BANCO.map(c => (
                              <th key={c.key} className="px-3 py-2.5 text-left text-gray-400 font-medium whitespace-nowrap">
                                {c.label}
                                {c.obrigatorio && <span className="text-red-400 ml-1">*</span>}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {dadosMapeados.map((row, i) => (
                            <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                              <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                              {CAMPOS_BANCO.map(c => (
                                <td key={c.key} className="px-3 py-2">
                                  <input
                                    type="text"
                                    value={row[c.key] || ''}
                                    onChange={e => atualizarCampoMapeado(i, c.key, e.target.value)}
                                    className={`w-full min-w-[120px] bg-transparent border border-transparent rounded px-2 py-1 text-gray-300 text-xs focus:outline-none focus:border-accent/50 focus:bg-surface/50 transition-all ${
                                      c.obrigatorio && !row[c.key] ? 'border-red-500/30 bg-red-500/5' : ''
                                    }`}
                                    placeholder={c.obrigatorio ? 'Obrigatório' : '—'}
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-surface/50 border border-white/[0.06] rounded-lg p-4">
                    <p className="text-xs text-gray-500">
                      <strong className="text-gray-400">Importante:</strong> Os dados serão enviados para <strong className="text-accent">Triagem</strong> para aprovação antes de entrarem no funil.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.08] shrink-0 bg-surface/30">
              <button onClick={fecharModalImport} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors">
                Cancelar
              </button>
              <div className="flex gap-3">
                {etapaImport === 'mapeamento' && (
                  <>
                    <button onClick={() => setEtapaImport('upload')} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors">
                      Voltar
                    </button>
                    <button
                      onClick={aplicarMapeamento}
                      disabled={!mapeamento.nome && mapeamento.nome !== 0}
                      className="px-5 py-2.5 bg-accent text-black rounded-xl text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      <Check size={16} />Continuar
                    </button>
                  </>
                )}
                {etapaImport === 'preview' && (
                  <>
                    <button onClick={() => setEtapaImport('mapeamento')} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors">
                      Voltar
                    </button>
                    <button
                      onClick={importarLeads}
                      disabled={importando || dadosMapeados.some(d => !d.nome)}
                      className="px-5 py-2.5 bg-accent text-black rounded-xl text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      {importando ? (
                        <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />Importando...</>
                      ) : (
                        <><FileText size={16} />Importar {dadosMapeados.length} Leads</>
                      )}
                    </button>
                  </>
                )}
                {etapaImport === 'upload' && arquivo && (
                  <button onClick={() => setEtapaImport('mapeamento')} className="px-5 py-2.5 bg-accent text-black rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors">
                    Continuar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
