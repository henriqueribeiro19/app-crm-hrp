import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'

function iniciais(nome = '') {
  return nome.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
}
function BadgeProduto({ produto }) {
  if (produto === 'cloudfy') return <span className="badge-cloudfy">Cloudfy</span>
  if (produto === 'cplung')  return <span className="badge-cplung">Cplung</span>
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-white/5 text-gray-500 border border-white/10">Qualificar</span>
}
const STATUS_LABEL = {
  novo:'Novo', contato:'Contato feito', proposta:'Proposta enviada',
  fechado_ganho:'Ganho', fechado_perdido:'Perdido',
}

function ModalForm({ empresa, onSalvar, onFechar }) {
  const novo = !empresa
  const [form, setForm] = useState({
    nome:             empresa?.nome             ?? '',
    nome_fantasia:    empresa?.nome_fantasia    ?? '',
    cnpj:             empresa?.cnpj             ?? '',
    telefone:         empresa?.telefone         ?? '',
    email:            empresa?.email            ?? '',
    segmento:         empresa?.segmento         ?? '',
    municipio:        empresa?.municipio        ?? '',
    bairro:           empresa?.bairro           ?? '',
    produto_sugerido: empresa?.produto_sugerido ?? 'qualificar',
    status_funil:     empresa?.status_funil     ?? 'novo',
    observacoes:      empresa?.observacoes      ?? '',
  })
  const [salvando, setSalvando] = useState(false)

  const campo = (label, key, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      <input type={type} value={form[key]} placeholder={placeholder}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="input-field text-sm" />
    </div>
  )

  const salvar = async () => {
    if (!form.nome.trim()) return
    setSalvando(true)
    if (novo) {
      await supabase.from('empresas').insert({ ...form, canal_origem: 'manual' })
    } else {
      await supabase.from('empresas').update(form).eq('id', empresa.id)
    }
    onSalvar()
    setSalvando(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onFechar}>
      <div className="bg-[#1e2433] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">{novo ? 'Novo lead' : 'Editar lead'}</h2>
          <button onClick={onFechar} className="text-gray-600 hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {campo('Nome da empresa *', 'nome', 'text', 'Razão social')}
          {campo('Nome fantasia', 'nome_fantasia', 'text', 'Como é conhecido')}
          <div className="grid grid-cols-2 gap-3">
            {campo('CNPJ', 'cnpj', 'text', '00.000.000/0001-00')}
            {campo('Telefone', 'telefone', 'tel', '(11) 99999-0000')}
          </div>
          {campo('E-mail', 'email', 'email', 'contato@empresa.com.br')}
          {campo('Segmento', 'segmento', 'text', 'Padaria, Restaurante…')}
          <div className="grid grid-cols-2 gap-3">
            {campo('Município', 'municipio')}
            {campo('Bairro', 'bairro')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Produto</label>
              <select value={form.produto_sugerido}
                onChange={e => setForm(f => ({ ...f, produto_sugerido: e.target.value }))}
                className="input-field text-sm">
                <option value="cloudfy">Cloudfy</option>
                <option value="cplung">Cplung</option>
                <option value="qualificar">Qualificar depois</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Etapa</label>
              <select value={form.status_funil}
                onChange={e => setForm(f => ({ ...f, status_funil: e.target.value }))}
                className="input-field text-sm">
                {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Observações</label>
            <textarea value={form.observacoes} rows={3}
              onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              placeholder="Anotações sobre este lead…"
              className="input-field text-sm resize-none py-2" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onFechar} className="btn-secondary flex-1 justify-center">Cancelar</button>
          <button onClick={salvar} disabled={salvando || !form.nome.trim()} className="btn-primary flex-1 disabled:opacity-40">
            {salvando ? 'Salvando…' : novo ? 'Criar lead' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalImportar({ onConcluir, onFechar }) {
  const inputRef = useRef()
  const [linhas, setLinhas]         = useState([])
  const [colunas, setColunas]       = useState([])
  const [mapa, setMapa]             = useState({})
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado]   = useState(null)

  const CAMPOS = [
    { key: 'nome',             label: 'Nome da empresa' },
    { key: 'nome_fantasia',    label: 'Nome fantasia'   },
    { key: 'cnpj',             label: 'CNPJ'            },
    { key: 'telefone',         label: 'Telefone'        },
    { key: 'email',            label: 'E-mail'          },
    { key: 'segmento',         label: 'Segmento'        },
    { key: 'municipio',        label: 'Município'       },
    { key: 'bairro',           label: 'Bairro'          },
    { key: 'score',            label: 'Score'           },
    { key: 'classificacao',    label: 'Classificação'   },
    { key: 'produto_sugerido', label: 'Produto'         },
  ]

  const autoMapear = (cols) => {
    const m = {}
    const n = s => s.toLowerCase().replace(/[_\s\-\.]/g, '')
    CAMPOS.forEach(({ key }) => {
      const found = cols.find(c => n(c).includes(n(key)) || n(key).includes(n(c)))
      if (found) m[key] = found
    })
    if (!m.nome         && cols.find(c => /razao/i.test(c)))         m.nome          = cols.find(c => /razao/i.test(c))
    if (!m.nome_fantasia && cols.find(c => /fantasia/i.test(c)))     m.nome_fantasia = cols.find(c => /fantasia/i.test(c))
    if (!m.segmento     && cols.find(c => /cnae|atividade/i.test(c))) m.segmento     = cols.find(c => /cnae|atividade/i.test(c))
    if (!m.municipio    && cols.find(c => /munic/i.test(c)))         m.municipio     = cols.find(c => /munic/i.test(c))
    if (!m.classificacao && cols.find(c => /classif/i.test(c)))      m.classificacao = cols.find(c => /classif/i.test(c))
    return m
  }

  const lerArquivo = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const wb   = XLSX.read(ev.target.result, { type: 'binary' })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws, { defval: '' })
      if (!data.length) return
      const cols = Object.keys(data[0])
      setColunas(cols)
      setLinhas(data)
      setMapa(autoMapear(cols))
    }
    reader.readAsBinaryString(file)
  }

  const importar = async () => {
    setImportando(true)
    const registros = linhas.map(linha => {
      const r = { bruto: linha, status: 'pendente', fonte: 'upload_xlsx' }
      CAMPOS.forEach(({ key }) => {
        if (mapa[key]) r[key] = String(linha[mapa[key]] ?? '').trim() || null
      })
      if (r.produto_sugerido) {
        const p = String(r.produto_sugerido).toLowerCase()
        r.produto_sugerido = p.includes('cloud') ? 'cloudfy' : p.includes('cp') ? 'cplung' : 'qualificar'
      }
      if (r.score) r.score = parseInt(r.score) || 0
      return r
    })
    const LOTE = 50
    let inseridos = 0
    for (let i = 0; i < registros.length; i += LOTE) {
      const { error } = await supabase.from('staging_raspagem').insert(registros.slice(i, i + LOTE))
      if (!error) inseridos += Math.min(LOTE, registros.length - i)
    }
    setResultado({ total: linhas.length, inseridos })
    setImportando(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onFechar}>
      <div className="bg-[#1e2433] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Importar planilha de leads</h2>
          <button onClick={onFechar} className="text-gray-600 hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {resultado ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-white font-semibold text-lg mb-1">{resultado.inseridos} leads importados</p>
            <p className="text-gray-500 text-sm mb-6">de {resultado.total} linhas. Acesse a Triagem para revisar.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={onFechar} className="btn-secondary">Fechar</button>
              <button onClick={onConcluir} className="btn-primary w-40">Ir para Triagem</button>
            </div>
          </div>
        ) : !linhas.length ? (
          <div className="border-2 border-dashed border-white/10 rounded-xl p-10 text-center cursor-pointer hover:border-accent/40 hover:bg-accent/5 transition-all"
            onClick={() => inputRef.current?.click()}>
            <svg className="w-10 h-10 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-white text-sm font-medium mb-1">Clique para selecionar a planilha</p>
            <p className="text-gray-500 text-xs">Arquivos .xlsx ou .xls do scraping</p>
            <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={lerArquivo} className="hidden" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4 bg-accent/10 border border-accent/20 rounded-lg px-4 py-2.5">
              <svg className="w-4 h-4 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm text-accent font-medium">{linhas.length} linhas detectadas</span>
              <button onClick={() => { setLinhas([]); setColunas([]); setMapa({}) }}
                className="ml-auto text-xs text-gray-500 hover:text-gray-300">Trocar arquivo</button>
            </div>
            <p className="text-xs font-medium text-gray-400 mb-3">Mapeamento de colunas</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {CAMPOS.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-28 shrink-0">{label}</span>
                  <select value={mapa[key] ?? ''} onChange={e => setMapa(m => ({ ...m, [key]: e.target.value || undefined }))}
                    className="input-field text-xs h-8 flex-1">
                    <option value="">— ignorar —</option>
                    {colunas.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <p className="text-xs font-medium text-gray-400 mb-2">Prévia — primeiras 3 linhas</p>
            <div className="overflow-x-auto rounded-lg border border-white/10 mb-5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/3">
                    {['Nome', 'Telefone', 'Segmento', 'Município', 'Produto'].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-gray-500 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {linhas.slice(0, 3).map((l, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="px-3 py-2 text-gray-300 truncate max-w-[140px]">{mapa.nome_fantasia ? l[mapa.nome_fantasia] : mapa.nome ? l[mapa.nome] : '—'}</td>
                      <td className="px-3 py-2 text-gray-400">{mapa.telefone ? l[mapa.telefone] : '—'}</td>
                      <td className="px-3 py-2 text-gray-400 truncate max-w-[100px]">{mapa.segmento ? l[mapa.segmento] : '—'}</td>
                      <td className="px-3 py-2 text-gray-400">{mapa.municipio ? l[mapa.municipio] : '—'}</td>
                      <td className="px-3 py-2 text-gray-400">{mapa.produto_sugerido ? l[mapa.produto_sugerido] : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <button onClick={onFechar} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button onClick={importar} disabled={importando} className="btn-primary flex-1 disabled:opacity-40">
                {importando
                  ? <><span className="w-4 h-4 border-2 border-[#0f1117]/30 border-t-[#0f1117] rounded-full animate-spin" />Importando…</>
                  : `Importar ${linhas.length} leads`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function Leads() {
  const navigate = useNavigate()
  const [empresas, setEmpresas]           = useState([])
  const [carregando, setCarregando]       = useState(true)
  const [busca, setBusca]                 = useState('')
  const [filtroProduto, setFiltroProduto] = useState('todos')
  const [filtroStatus, setFiltroStatus]   = useState('todos')
  const [editando, setEditando]           = useState(null)
  const [importando, setImportando]       = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const carregar = async () => {
    setCarregando(true)
    const { data } = await supabase.from('empresas').select('*')
      .is('excluido_em', null).order('score', { ascending: false }).order('criado_em', { ascending: false })
    setEmpresas(data ?? [])
    setCarregando(false)
  }

  useEffect(() => { carregar() }, [])

  const deletar = async (id) => {
    await supabase.from('empresas').update({ excluido_em: new Date().toISOString() }).eq('id', id)
    setEmpresas(l => l.filter(e => e.id !== id))
    setConfirmDelete(null)
  }

  const filtrados = empresas.filter(e => {
    const q = busca.toLowerCase()
    const matchBusca   = !busca || e.nome?.toLowerCase().includes(q) || e.nome_fantasia?.toLowerCase().includes(q) || e.cnpj?.includes(q) || e.municipio?.toLowerCase().includes(q)
    const matchProduto = filtroProduto === 'todos' || e.produto_sugerido === filtroProduto
    const matchStatus  = filtroStatus  === 'todos' || e.status_funil     === filtroStatus
    return matchBusca && matchProduto && matchStatus
  })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="h-12 flex items-center gap-2 px-5 border-b border-white/5 bg-surface-sidebar shrink-0">
        <h1 className="text-sm font-semibold text-white flex-1">Leads</h1>
        <input type="search" placeholder="Buscar por nome, CNPJ, cidade…" value={busca}
          onChange={e => setBusca(e.target.value)} className="input-field max-w-[200px] h-8 text-xs" />
        <select value={filtroProduto} onChange={e => setFiltroProduto(e.target.value)} className="input-field h-8 text-xs w-32">
          <option value="todos">Todos os produtos</option>
          <option value="cloudfy">Cloudfy</option>
          <option value="cplung">Cplung</option>
        </select>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="input-field h-8 text-xs w-36">
          <option value="todos">Todas as etapas</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button onClick={() => setImportando(true)} className="btn-secondary">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Importar planilha
        </button>
        <button onClick={() => setEditando(false)} className="btn-primary w-auto px-4 h-8 text-xs">
          + Novo lead
        </button>
      </header>

      <div className="px-5 py-2 border-b border-white/5 bg-surface-sidebar shrink-0">
        <span className="text-xs text-gray-600">{carregando ? 'Carregando…' : `${filtrados.length} lead${filtrados.length !== 1 ? 's' : ''}`}</span>
      </div>

      <div className="flex-1 overflow-auto">
        {carregando ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-gray-500 text-sm mb-3">Nenhum lead encontrado.</p>
            <button onClick={() => setEditando(false)} className="btn-secondary">+ Criar primeiro lead</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface-sidebar border-b border-white/5 z-10">
              <tr>
                {['Empresa','Segmento','Localização','Telefone','Produto','Etapa','Score',''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtrados.map(emp => (
                <tr key={emp.id} className="hover:bg-white/3 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-accent/10 text-accent flex items-center justify-center text-[10px] font-semibold shrink-0">
                        {iniciais(emp.nome_fantasia || emp.nome)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-xs font-medium truncate max-w-[160px]">{emp.nome_fantasia || emp.nome}</p>
                        {emp.cnpj && <p className="text-gray-600 text-[10px] font-mono">{emp.cnpj}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{emp.segmento ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{[emp.bairro, emp.municipio].filter(Boolean).join(', ') || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{emp.telefone ?? '—'}</td>
                  <td className="px-4 py-3"><BadgeProduto produto={emp.produto_sugerido} /></td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500 border border-white/10 rounded-md px-2 py-0.5 whitespace-nowrap">
                      {STATUS_LABEL[emp.status_funil] ?? emp.status_funil}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-10 h-1 rounded-full bg-white/5">
                        <div className="h-1 rounded-full bg-accent" style={{ width: `${Math.min(emp.score ?? 0, 100)}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{emp.score ?? 0}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditando(emp)} className="btn-secondary py-1 px-2 text-[11px]">Editar</button>
                      <button onClick={() => setConfirmDelete(emp)} className="btn-danger py-1 px-2 text-[11px]">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editando !== null && (
        <ModalForm empresa={editando || null} onFechar={() => setEditando(null)} onSalvar={() => { setEditando(null); carregar() }} />
      )}
      {importando && (
        <ModalImportar onFechar={() => setImportando(false)} onConcluir={() => { setImportando(false); navigate('/triagem') }} />
      )}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e2433] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-white font-semibold mb-2">Remover lead</h3>
            <p className="text-gray-400 text-sm mb-5">
              Tem certeza que deseja remover <strong className="text-white">{confirmDelete.nome_fantasia || confirmDelete.nome}</strong>?
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button onClick={() => deletar(confirmDelete.id)} className="btn-danger flex-1 justify-center">Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
