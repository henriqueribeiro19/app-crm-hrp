import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { FiltrosAvancados } from '../components/ui/FiltrosAvancados'
import { Paginacao } from '../components/ui/Paginacao'
import { SkeletonTabela } from '../components/ui/SkeletonTabela'
import { CheckCircle, XCircle, FileSpreadsheet, Upload, X, FileText, AlertTriangle } from 'lucide-react'

export default function Triagem() {
  const [staging, setStaging] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [pagina, setPagina] = useState(1)
  const [totalRegistros, setTotalRegistros] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [opcoesFiltro, setOpcoesFiltro] = useState({ status: [], segmento: [], produto: [], municipio: [] })
  const [ordenacao, setOrdenacao] = useState({ campo: 'criado_em', direcao: 'desc' })
  const [stats, setStats] = useState({ pendente: 0, aprovado: 0, descartado: 0 })

  // Importação
  const [modalImport, setModalImport] = useState(false)
  const [arquivo, setArquivo] = useState(null)
  const [importando, setImportando] = useState(false)
  const [previewData, setPreviewData] = useState([])
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

  const ITENS_POR_PAGINA = 20

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

  // Importação de arquivo
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

    if (ext === 'csv') {
      parseCSV(file)
    } else {
      // Excel - tenta usar xlsx.js se disponível
      try {
        const XLSX = await import('xlsx')
        const data = await file.arrayBuffer()
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 })

        if (json.length < 2) {
          setErroImport('Arquivo Excel vazio ou sem dados')
          return
        }

        const headers = json[0].map(h => String(h).toLowerCase().trim())
        const rows = json.slice(1).map(row => {
          const obj = {}
          headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? String(row[i]).trim() : '' })
          return obj
        }).filter(r => r.nome || r.razao_social || r.cnpj || r['razão social'])

        setPreviewData(rows.slice(0, 5))
      } catch (err) {
        setErroImport('Erro ao ler Excel. Instale a biblioteca: npm install xlsx')
        console.error(err)
      }
    }
  }

  const parseCSV = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      const lines = text.split('\n').filter(l => l.trim())
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim())
        const obj = {}
        headers.forEach((h, i) => { obj[h] = values[i] || '' })
        return obj
      }).filter(r => r.nome || r.razao_social || r.cnpj || r['razão social'])

      setPreviewData(rows.slice(0, 5))
    }
    reader.readAsText(file)
  }

  const importarLeads = async () => {
    if (!arquivo || previewData.length === 0) return
    setImportando(true)
    setErroImport('')

    try {
      let leadsToInsert = []
      const ext = arquivo.name.split('.').pop().toLowerCase()

      if (ext === 'csv') {
        const text = await arquivo.text()
        const lines = text.split('\n').filter(l => l.trim())
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

        leadsToInsert = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim())
          const obj = {}
          headers.forEach((h, i) => { obj[h] = values[i] || '' })
          return obj
        })
      } else {
        // Excel
        const XLSX = await import('xlsx')
        const data = await arquivo.arrayBuffer()
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 })

        const headers = json[0].map(h => String(h).toLowerCase().trim())
        leadsToInsert = json.slice(1).map(row => {
          const obj = {}
          headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? String(row[i]).trim() : '' })
          return obj
        })
      }

      const leadsMapped = leadsToInsert
        .filter(l => l.nome || l.razao_social || l['razão social'] || l.cnpj)
        .map(l => ({
          fonte: 'upload_' + ext,
          bruto: l,
          nome: l.nome || l.razao_social || l['razão social'] || 'Sem nome',
          cnpj: l.cnpj || '',
          telefone: l.telefone || l.celular || l.whatsapp || '',
          email: l.email || '',
          segmento: l.segmento || l.categoria || '',
          municipio: l.municipio || l.cidade || '',
          bairro: l.bairro || '',
          score: parseInt(l.score) || 50,
          classificacao: l.classificacao || l.classificação || '',
          produto_sugerido: l.produto_sugerido || l.produto || 'qualificar',
          status: 'pendente',
        }))

      if (leadsMapped.length === 0) {
        setErroImport('Nenhum lead válido encontrado no arquivo')
        setImportando(false)
        return
      }

      const { error } = await supabase.from('staging_raspagem').insert(leadsMapped)

      if (error) throw error

      alert(`${leadsMapped.length} leads importados com sucesso!`)
      setModalImport(false)
      setArquivo(null)
      setPreviewData([])
      carregarDados()
    } catch (err) {
      setErroImport('Erro na importação: ' + err.message)
    } finally {
      setImportando(false)
    }
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

      {/* Modal: Importar Planilha */}
      {modalImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-card border border-white/[0.08] rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                  <FileSpreadsheet size={20} className="text-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-100">Importar Planilha</h3>
                  <p className="text-sm text-gray-400">CSV ou Excel (.xlsx, .xls)</p>
                </div>
              </div>
              <button 
                onClick={() => { setModalImport(false); setArquivo(null); setPreviewData([]); setErroImport('') }}
                className="p-2 rounded-lg hover:bg-white/5 text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Upload */}
              <div 
                className="border-2 border-dashed border-white/[0.08] rounded-xl p-8 text-center hover:border-accent/30 transition-colors cursor-pointer"
                onClick={() => document.getElementById('file-upload-triagem').click()}
              >
                <input 
                  id="file-upload-triagem" 
                  type="file" 
                  accept=".csv,.xlsx,.xls" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
                <Upload size={32} className="mx-auto mb-3 text-gray-500" />
                <p className="text-sm text-gray-300 font-medium">
                  {arquivo ? arquivo.name : 'Clique para selecionar arquivo'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {arquivo ? `${(arquivo.size / 1024).toFixed(1)} KB` : 'CSV ou Excel (.csv, .xlsx, .xls)'}
                </p>
              </div>

              {/* Erro */}
              {erroImport && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertTriangle size={16} />
                  {erroImport}
                </div>
              )}

              {/* Preview */}
              {previewData.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">Preview ({previewData.length} primeiros registros):</p>
                  <div className="bg-surface border border-white/[0.08] rounded-lg overflow-x-auto max-h-48">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/[0.08]">
                          <th className="px-3 py-2 text-left text-gray-400">Nome</th>
                          <th className="px-3 py-2 text-left text-gray-400">CNPJ</th>
                          <th className="px-3 py-2 text-left text-gray-400">Cidade</th>
                          <th className="px-3 py-2 text-left text-gray-400">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((row, i) => (
                          <tr key={i} className="border-b border-white/[0.04]">
                            <td className="px-3 py-2 text-gray-300 truncate max-w-[150px]">{row.nome || row.razao_social || row['razão social'] || '—'}</td>
                            <td className="px-3 py-2 text-gray-400 font-mono">{row.cnpj || '—'}</td>
                            <td className="px-3 py-2 text-gray-400">{row.municipio || row.cidade || '—'}</td>
                            <td className="px-3 py-2 text-gray-400">{row.score || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="bg-surface/50 border border-white/[0.06] rounded-lg p-3">
                <p className="text-xs text-gray-500">
                  <strong className="text-gray-400">Colunas esperadas:</strong> nome, cnpj, telefone, email, segmento, municipio, bairro, score, classificacao, produto_sugerido
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Os leads serão enviados para <strong className="text-accent">Triagem</strong> para aprovação.
                </p>
              </div>

              {/* Ações */}
              <div className="flex gap-3">
                <button
                  onClick={() => { setModalImport(false); setArquivo(null); setPreviewData([]); setErroImport('') }}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={importarLeads}
                  disabled={!arquivo || importando}
                  className="flex-1 px-4 py-2.5 bg-accent text-black rounded-xl text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {importando ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <FileText size={16} />
                      Importar Leads
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
