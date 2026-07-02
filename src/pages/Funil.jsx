import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const COLUNAS = [
  { id: 'novo',            label: 'Novo',              cor: 'text-gray-400',   badge: 'bg-white/10 text-gray-300'         },
  { id: 'contato',         label: 'Contato feito',     cor: 'text-blue-400',   badge: 'bg-blue-500/20 text-blue-300'      },
  { id: 'proposta',        label: 'Proposta enviada',  cor: 'text-violet-400', badge: 'bg-violet-500/20 text-violet-300'  },
  { id: 'fechado_ganho',   label: 'Fechado — ganho',   cor: 'text-emerald-400',badge: 'bg-emerald-500/20 text-emerald-300'},
  { id: 'fechado_perdido', label: 'Fechado — perdido', cor: 'text-red-400',    badge: 'bg-red-500/20 text-red-300'        },
]

function iniciais(nome = '') {
  return nome.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
}
function linkWhatsApp(tel = '') {
  const num = (tel ?? '').replace(/\D/g, '')
  return `https://wa.me/${num.startsWith('55') ? num : '55' + num}`
}
function BadgeProduto({ produto }) {
  if (produto === 'cloudfy') return <span className="badge-cloudfy">Cloudfy</span>
  if (produto === 'cplung')  return <span className="badge-cplung">Cplung</span>
  return null
}

// ── Modal detalhe ─────────────────────────────────────────────
function ModalLead({ empresa, onFechar, onAtualizar }) {
  const [novaInteracao, setNovaInteracao] = useState('')
  const [tipoInteracao, setTipoInteracao] = useState('whatsapp')
  const [interacoes, setInteracoes]       = useState([])
  const [salvando, setSalvando]           = useState(false)
  const [statusLocal, setStatusLocal]     = useState(empresa.status_funil)
  const [abaAtiva, setAbaAtiva]           = useState('contato') // contato | email

  // Template de e-mail pré-preenchido
  const templateEmail = `Olá${empresa.nome_fantasia ? ', ' + empresa.nome_fantasia : ''}!

Meu nome é [SEU NOME] e trabalho com soluções para o setor de food service.

Identificamos que ${empresa.nome_fantasia || empresa.nome} tem um perfil ideal para o ${empresa.produto_sugerido === 'cloudfy' ? 'Cloudfy' : empresa.produto_sugerido === 'cplung' ? 'Cplung' : 'nosso produto'}, que pode ajudar a ${empresa.produto_sugerido === 'cloudfy' ? 'escalar a operação e aumentar o ticket médio' : 'otimizar vendas no varejo com mais agilidade'}.

Posso agendar uma conversa rápida de 15 minutos para apresentar como funciona?

Fico à disposição!`

  const [textoEmail, setTextoEmail] = useState(templateEmail)

  const abrirEmail = () => {
    const assunto = encodeURIComponent(`Solução para ${empresa.nome_fantasia || empresa.nome}`)
    const corpo   = encodeURIComponent(textoEmail)
    const dest    = empresa.email ? encodeURIComponent(empresa.email) : ''
    window.open(`mailto:${dest}?subject=${assunto}&body=${corpo}`)
  }

  useEffect(() => {
    supabase.from('interacoes').select('*').eq('empresa_id', empresa.id)
      .order('ocorreu_em', { ascending: false }).limit(20)
      .then(({ data }) => setInteracoes(data ?? []))
  }, [empresa.id])

  const tipoLabel = { whatsapp:'WhatsApp', ligacao:'Ligação', email:'E-mail', visita:'Visita', anotacao:'Anotação' }
  const tipoIconPath = {
    whatsapp: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    ligacao:  'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
    email:    'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    visita:   'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z',
    anotacao: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  }

  const salvarInteracao = async () => {
    if (!novaInteracao.trim()) return
    setSalvando(true)
    await supabase.from('interacoes').insert({ empresa_id: empresa.id, tipo: tipoInteracao, notas: novaInteracao.trim() })
    const { data } = await supabase.from('interacoes').select('*').eq('empresa_id', empresa.id)
      .order('ocorreu_em', { ascending: false }).limit(20)
    setInteracoes(data ?? [])
    setNovaInteracao('')
    setSalvando(false)
  }

  const moverEtapa = async (novoStatus) => {
    setStatusLocal(novoStatus)
    await supabase.from('empresas').update({ status_funil: novoStatus }).eq('id', empresa.id)
    onAtualizar(empresa.id, { status_funil: novoStatus })
  }

  const formatarData = (dt) =>
    new Date(dt).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onFechar}>
      <div className="bg-[#1a2035] border border-white/10 w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center text-sm font-semibold shrink-0">
            {iniciais(empresa.nome_fantasia || empresa.nome)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-white truncate">{empresa.nome_fantasia || empresa.nome}</h2>
            <p className="text-xs text-gray-500">{[empresa.segmento, empresa.bairro, empresa.municipio].filter(Boolean).join(' · ')}</p>
          </div>
          <button onClick={onFechar} className="text-gray-600 hover:text-gray-300 mt-0.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

          {/* Ações rápidas */}
          <div className="flex items-center gap-2 flex-wrap">
            <BadgeProduto produto={empresa.produto_sugerido} />
            {empresa.telefone && (
              <a href={linkWhatsApp(empresa.telefone)} target="_blank" rel="noreferrer" className="btn-whatsapp">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.135 1.528 5.887L.057 23.882a.5.5 0 00.61.61l6.044-1.461A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.799 9.799 0 01-5.001-1.37l-.36-.213-3.714.898.935-3.62-.234-.373A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
                </svg>
                {empresa.telefone}
              </a>
            )}
          </div>

          {/* Mover etapa */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Etapa no funil</p>
            <div className="flex flex-wrap gap-1.5">
              {COLUNAS.map(col => (
                <button key={col.id} onClick={() => moverEtapa(col.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                    ${statusLocal === col.id
                      ? 'bg-accent text-[#0f1117] border-accent'
                      : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20 hover:text-white'}`}>
                  {col.label}
                </button>
              ))}
            </div>
          </div>

          {/* Abas: Registrar contato | Enviar e-mail */}
          <div>
            <div className="flex gap-0 border-b border-white/10 mb-3">
              {[
                { id: 'contato', label: 'Registrar contato' },
                { id: 'email',   label: 'Enviar e-mail'     },
              ].map(aba => (
                <button key={aba.id} onClick={() => setAbaAtiva(aba.id)}
                  className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors -mb-px
                    ${abaAtiva === aba.id ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                  {aba.label}
                </button>
              ))}
            </div>

            {abaAtiva === 'contato' && (
              <>
                <div className="flex gap-1.5 mb-2 flex-wrap">
                  {Object.entries(tipoLabel).map(([val, label]) => (
                    <button key={val} onClick={() => setTipoInteracao(val)}
                      className={`px-2.5 py-1 rounded-lg text-xs border transition-all
                        ${tipoInteracao === val ? 'bg-accent/10 border-accent/40 text-accent' : 'border-white/10 text-gray-500 hover:border-white/20 hover:text-gray-300'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <textarea value={novaInteracao} onChange={e => setNovaInteracao(e.target.value)}
                    placeholder="Descreva o contato…" rows={2}
                    className="input-field text-sm resize-none py-2 flex-1" />
                  <button onClick={salvarInteracao} disabled={salvando || !novaInteracao.trim()}
                    className="btn-primary w-20 shrink-0 disabled:opacity-40">
                    {salvando
                      ? <span className="w-4 h-4 border-2 border-[#0f1117]/30 border-t-[#0f1117] rounded-full animate-spin mx-auto block" />
                      : 'Salvar'}
                  </button>
                </div>
              </>
            )}

            {abaAtiva === 'email' && (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">
                    Para: <span className="text-gray-300">{empresa.email || 'e-mail não cadastrado'}</span>
                  </label>
                  <textarea value={textoEmail} onChange={e => setTextoEmail(e.target.value)}
                    rows={9} className="input-field text-xs resize-none py-2 leading-relaxed" />
                </div>
                <p className="text-[11px] text-gray-600">
                  O e-mail será aberto no seu cliente de e-mail (Gmail, Outlook, etc.) já preenchido.
                </p>
                <button onClick={abrirEmail} className="btn-primary">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Abrir no e-mail
                </button>
              </div>
            )}
          </div>

          {/* Histórico */}
          {interacoes.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-3">Histórico</p>
              <div className="flex flex-col gap-3">
                {interacoes.map(i => (
                  <div key={i.id} className="flex gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={tipoIconPath[i.tipo] ?? tipoIconPath.anotacao} />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-300">{tipoLabel[i.tipo] ?? i.tipo}</span>
                        <span className="text-[10px] text-gray-600">{formatarData(i.ocorreu_em)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{i.notas}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Card Kanban ───────────────────────────────────────────────
function Card({ empresa, onClick }) {
  return (
    <div draggable onDragStart={e => e.dataTransfer.setData('empresa_id', empresa.id)}
      onClick={() => onClick(empresa)}
      className="bg-[#1e2433] border border-white/10 rounded-xl p-3 cursor-pointer
                 hover:border-white/20 hover:bg-[#242d40] transition-all active:scale-[0.98] select-none">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs font-semibold text-white leading-snug line-clamp-2">
          {empresa.nome_fantasia || empresa.nome}
        </p>
        <BadgeProduto produto={empresa.produto_sugerido} />
      </div>
      <p className="text-[11px] text-gray-500 mb-3 truncate">
        {[empresa.segmento, empresa.bairro].filter(Boolean).join(' · ')}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-12 h-1 rounded-full bg-white/10 overflow-hidden">
            <div className="h-1 rounded-full bg-accent" style={{ width: `${Math.min(empresa.score ?? 0, 100)}%` }} />
          </div>
          <span className="text-[10px] text-gray-500">{empresa.score}</span>
        </div>
        {empresa.telefone && (
          <a href={linkWhatsApp(empresa.telefone)} target="_blank" rel="noreferrer"
            onClick={e => e.stopPropagation()}
            className="w-6 h-6 rounded-md flex items-center justify-center text-gray-600 hover:text-accent hover:bg-accent/10 transition-colors">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.135 1.528 5.887L.057 23.882a.5.5 0 00.61.61l6.044-1.461A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.799 9.799 0 01-5.001-1.37l-.36-.213-3.714.898.935-3.62-.234-.373A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
            </svg>
          </a>
        )}
      </div>
    </div>
  )
}

// ── Coluna Kanban ─────────────────────────────────────────────
function Coluna({ coluna, empresas, onCardClick, onDrop }) {
  const [dragOver, setDragOver] = useState(false)
  return (
    <div className={`flex flex-col rounded-xl min-w-[210px] w-[220px] shrink-0 transition-all
      ${dragOver ? 'ring-2 ring-accent/50 bg-accent/5' : 'bg-white/3'}`}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); onDrop(e, coluna.id) }}>
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/5">
        <span className={`text-xs font-semibold ${coluna.cor}`}>{coluna.label}</span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${coluna.badge}`}>
          {empresas.length}
        </span>
      </div>
      <div className="flex flex-col gap-2 p-2 flex-1 min-h-[80px]">
        {empresas.map(emp => <Card key={emp.id} empresa={emp} onClick={onCardClick} />)}
        {empresas.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[11px] text-gray-700">Arraste um card aqui</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────
export default function Funil() {
  const [empresas, setEmpresas]           = useState([])
  const [carregando, setCarregando]       = useState(true)
  const [filtroProduto, setFiltroProduto] = useState('todos')
  const [leadAberto, setLeadAberto]       = useState(null)

  useEffect(() => {
    async function carregar() {
      setCarregando(true)
      const { data } = await supabase.from('empresas').select('*')
        .is('excluido_em', null).order('score', { ascending: false })
      setEmpresas(data ?? [])
      setCarregando(false)
    }
    carregar()
  }, [])

  const atualizar = (id, campos) =>
    setEmpresas(list => list.map(e => e.id === id ? { ...e, ...campos } : e))

  const onDrop = async (e, novoStatus) => {
    const id = e.dataTransfer.getData('empresa_id')
    if (!id) return
    atualizar(id, { status_funil: novoStatus })
    await supabase.from('empresas').update({ status_funil: novoStatus }).eq('id', id)
  }

  const filtradas = filtroProduto === 'todos' ? empresas : empresas.filter(e => e.produto_sugerido === filtroProduto)
  const porColuna = (statusId) => filtradas.filter(e => e.status_funil === statusId)

  const total      = filtradas.length
  const ganhos     = filtradas.filter(e => e.status_funil === 'fechado_ganho').length
  const andamento  = filtradas.filter(e => ['contato','proposta'].includes(e.status_funil)).length

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="h-12 flex items-center gap-3 px-5 border-b border-white/5 bg-surface-sidebar shrink-0">
        <h1 className="text-sm font-semibold text-white flex-1">Funil de vendas</h1>
        <div className="hidden md:flex items-center gap-4 text-xs text-gray-500 mr-2">
          <span><strong className="text-white">{total}</strong> leads</span>
          <span><strong className="text-accent">{andamento}</strong> em andamento</span>
          <span><strong className="text-emerald-400">{ganhos}</strong> ganhos</span>
        </div>
        <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
          {[{val:'todos',label:'Todos'},{val:'cloudfy',label:'Cloudfy'},{val:'cplung',label:'Cplung'}].map(({val,label}) => (
            <button key={val} onClick={() => setFiltroProduto(val)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all
                ${filtroProduto === val ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
              {label}
            </button>
          ))}
        </div>
      </header>

      {carregando ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-3 h-full px-5 py-4 w-max">
            {COLUNAS.map(col => (
              <Coluna key={col.id} coluna={col} empresas={porColuna(col.id)}
                onCardClick={setLeadAberto} onDrop={onDrop} />
            ))}
          </div>
        </div>
      )}

      {leadAberto && (
        <ModalLead empresa={leadAberto} onFechar={() => setLeadAberto(null)}
          onAtualizar={(id, campos) => { atualizar(id, campos); setLeadAberto(l => ({ ...l, ...campos })) }} />
      )}
    </div>
  )
}
