import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { ModalEmpresa } from '../components/ui/ModalEmpresa'
import { MoreHorizontal, Phone, MessageCircle, ArrowRight, ArrowLeft, Archive, CheckCircle2, X, Upload, FileSpreadsheet, FileText } from 'lucide-react'

const COLUNAS = [
  { id: 'novo', label: 'Novo', cor: 'border-l-blue-500', bg: 'bg-blue-500/5', badge: 'bg-blue-500/20 text-blue-300' },
  { id: 'contato', label: 'Contato', cor: 'border-l-yellow-500', bg: 'bg-yellow-500/5', badge: 'bg-yellow-500/20 text-yellow-300' },
  { id: 'proposta', label: 'Proposta', cor: 'border-l-purple-500', bg: 'bg-purple-500/5', badge: 'bg-purple-500/20 text-purple-300' },
  { id: 'fechado_ganho', label: 'Ganho', cor: 'border-l-green-500', bg: 'bg-green-500/5', badge: 'bg-green-500/20 text-green-300' },
  { id: 'fechado_perdido', label: 'Perdido', cor: 'border-l-red-500', bg: 'bg-red-500/5', badge: 'bg-red-500/20 text-red-300' },
]

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

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'xls') {
      alert('Formato não suportado. Use CSV ou Excel (.xlsx/.xls)')
      return
    }
    setArquivo(file)
    if (ext === 'csv') {
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
        }).filter(r => r.nome || r.razao_social || r.cnpj)
        setPreviewData(rows.slice(0, 5))
      }
      reader.readAsText(file)
    } else {
      try {
        const XLSX = await import('xlsx')
        const data = await file.arrayBuffer()
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 })
        const headers = json[0].map(h => String(h).toLowerCase().trim())
        const rows = json.slice(1).map(row => {
          const obj = {}
          headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? String(row[i]).trim() : '' })
          return obj
        }).filter(r => r.nome || r.razao_social || r.cnpj)
        setPreviewData(rows.slice(0, 5))
      } catch { alert('Instale: npm install xlsx') }
    }
  }

  const importarLeads = async () => {
    if (!arquivo || previewData.length === 0) return
    setImportando(true)
    try {
      const ext = arquivo.name.split('.').pop().toLowerCase()
      let leadsToInsert = []
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
      const leadsMapped = leadsToInsert.filter(l => l.nome || l.razao_social || l['razão social'] || l.cnpj).map(l => ({
        fonte: 'upload_' + ext, bruto: l,
        nome: l.nome || l.razao_social || l['razão social'] || 'Sem nome',
        cnpj: l.cnpj || '', telefone: l.telefone || l.celular || l.whatsapp || '',
        email: l.email || '', segmento: l.segmento || l.categoria || '',
        municipio: l.municipio || l.cidade || '', bairro: l.bairro || '',
        score: parseInt(l.score) || 50,
        classificacao: l.classificacao || l.classificação || '',
        produto_sugerido: l.produto_sugerido || l.produto || 'qualificar',
        status: 'pendente',
      }))
      await supabase.from('staging_raspagem').insert(leadsMapped)
      alert(`${leadsMapped.length} leads importados! Vá para Triagem.`)
      setModalImport(false); setArquivo(null); setPreviewData([])
    } catch (err) { alert('Erro: ' + err.message) }
    finally { setImportando(false) }
  }

  const leadsPorColuna = (status) => leads.filter(l => l.status_funil === status)

  return (
    <div className="h-screen flex flex-col p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Funil de Vendas</h1>
          <p className="text-sm text-gray-400 mt-1">Arraste os cards entre as colunas ou use as setas para mover de etapa</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-lg bg-surface-card border border-white/[0.08] text-sm text-gray-400">{leads.length} leads ativos</span>
          <button onClick={() => setModalImport(true)} className="flex items-center gap-2 px-4 py-2 bg-accent text-black rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors">
            <Upload size={16} />Importar Planilha
          </button>
        </div>
      </div>

      {/* Kanban */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 h-full" style={{ width: 'max-content' }}>
          {COLUNAS.map(coluna => {
            const colLeads = leadsPorColuna(coluna.id)
            return (
              <div
                key={coluna.id}
                className={`w-80 flex flex-col bg-surface-card border border-white/[0.08] rounded-xl overflow-hidden ${coluna.cor} border-l-4`}
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
                <div className={`px-4 py-3 border-b border-white/[0.08] flex items-center justify-between shrink-0 ${coluna.bg}`}>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-200 text-sm">{coluna.label}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${coluna.badge}`}>{colLeads.length}</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {carregando ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="bg-surface border border-white/[0.04] rounded-lg p-4 animate-pulse">
                        <div className="h-4 bg-white/5 rounded w-3/4 mb-2" /><div className="h-3 bg-white/5 rounded w-1/2" />
                      </div>
                    ))
                  ) : colLeads.length === 0 ? (
                    <div className="text-center py-8 text-gray-600 text-sm">Nenhum lead nesta etapa</div>
                  ) : (
                    colLeads.map(lead => (
                      <div
                        key={lead.id} draggable
                        onDragStart={e => e.dataTransfer.setData('leadId', lead.id)}
                        className="bg-surface border border-white/[0.06] rounded-lg p-4 cursor-grab active:cursor-grabbing hover:border-white/[0.12] hover:shadow-lg hover:shadow-black/20 transition-all group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center text-accent font-bold text-xs shrink-0">
                              {(lead.nome_fantasia || lead.nome).split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-medium text-gray-100 text-sm truncate">{lead.nome_fantasia || lead.nome}</h4>
                              {lead.tipo === 'filial' && <span className="text-[10px] text-yellow-400">{lead.unidade || 'Filial'}</span>}
                            </div>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setModalEmpresa(lead)} className="p-1 rounded hover:bg-white/5 text-gray-400 hover:text-gray-200" title="Ver detalhes"><MoreHorizontal size={14} /></button>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2"><span>{lead.segmento || '—'}</span><span>·</span><span>{lead.municipio || '—'}</span></div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-accent to-emerald-400" style={{ width: `${lead.score}%` }} /></div>
                          <span className="text-xs font-semibold text-gray-300">{lead.score}</span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                          <div className="flex gap-1">
                            {lead.telefone && <a href={`https://wa.me/${lead.telefone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-green-500/10 text-gray-500 hover:text-green-400 transition-colors" title="WhatsApp"><MessageCircle size={14} /></a>}
                            {lead.telefone && <a href={`tel:${lead.telefone.replace(/\D/g, '')}`} className="p-1.5 rounded-lg hover:bg-blue-500/10 text-gray-500 hover:text-blue-400 transition-colors" title="Ligar"><Phone size={14} /></a>}
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

      {modalImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-card border border-white/[0.08] rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center"><FileSpreadsheet size={20} className="text-accent" /></div>
                <div><h3 className="text-lg font-semibold text-gray-100">Importar Planilha</h3><p className="text-sm text-gray-400">CSV ou Excel (.xlsx, .xls)</p></div>
              </div>
              <button onClick={() => { setModalImport(false); setArquivo(null); setPreviewData([]) }} className="p-2 rounded-lg hover:bg-white/5 text-gray-400"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-white/[0.08] rounded-xl p-8 text-center hover:border-accent/30 transition-colors cursor-pointer" onClick={() => document.getElementById('file-upload-funil').click()}>
                <input id="file-upload-funil" type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
                <Upload size={32} className="mx-auto mb-3 text-gray-500" />
                <p className="text-sm text-gray-300 font-medium">{arquivo ? arquivo.name : 'Clique para selecionar arquivo'}</p>
                <p className="text-xs text-gray-500 mt-1">{arquivo ? `${(arquivo.size / 1024).toFixed(1)} KB` : 'CSV ou Excel (.csv, .xlsx, .xls)'}</p>
              </div>
              {previewData.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">Preview ({previewData.length} registros):</p>
                  <div className="bg-surface border border-white/[0.08] rounded-lg overflow-x-auto max-h-40">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-white/[0.08]"><th className="px-3 py-2 text-left text-gray-400">Nome</th><th className="px-3 py-2 text-left text-gray-400">CNPJ</th><th className="px-3 py-2 text-left text-gray-400">Cidade</th><th className="px-3 py-2 text-left text-gray-400">Score</th></tr></thead>
                      <tbody>{previewData.map((row, i) => (<tr key={i} className="border-b border-white/[0.04]"><td className="px-3 py-2 text-gray-300 truncate max-w-[150px]">{row.nome || row.razao_social || '—'}</td><td className="px-3 py-2 text-gray-400 font-mono">{row.cnpj || '—'}</td><td className="px-3 py-2 text-gray-400">{row.municipio || row.cidade || '—'}</td><td className="px-3 py-2 text-gray-400">{row.score || '—'}</td></tr>))}</tbody>
                    </table>
                  </div>
                </div>
              )}
              <div className="bg-surface/50 border border-white/[0.06] rounded-lg p-3">
                <p className="text-xs text-gray-500"><strong className="text-gray-400">Colunas:</strong> nome, cnpj, telefone, email, segmento, municipio, bairro, score, classificacao, produto_sugerido</p>
                <p className="text-xs text-gray-500 mt-1">Enviado para <strong className="text-accent">Triagem</strong> para aprovação.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setModalImport(false); setArquivo(null); setPreviewData([]) }} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/5">Cancelar</button>
                <button onClick={importarLeads} disabled={!arquivo || importando} className="flex-1 px-4 py-2.5 bg-accent text-black rounded-xl text-sm font-medium hover:bg-accent/90 disabled:opacity-50 flex items-center justify-center gap-2">
                  {importando ? (<><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />Importando...</>) : (<><FileText size={16} />Importar Leads</>)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
