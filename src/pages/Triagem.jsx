import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function iniciais(nome = '') {
  return nome.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
}
function limparTelefone(tel = '') {
  return tel.split(/[\/,]/)[0].trim()
}
function linkWhatsApp(tel = '') {
  const num = tel.replace(/\D/g, '')
  return `https://wa.me/${num.startsWith('55') ? num : '55' + num}`
}

function ModalEditar({ lead, onSalvar, onFechar }) {
  const [form, setForm] = useState({
    nome:             lead.nome             ?? '',
    nome_fantasia:    lead.nome_fantasia    ?? '',
    telefone:         limparTelefone(lead.telefone ?? ''),
    email:            lead.email            ?? '',
    segmento:         lead.segmento         ?? '',
    municipio:        lead.municipio        ?? '',
    bairro:           lead.bairro           ?? '',
    produto_sugerido: lead.produto_sugerido ?? 'qualificar',
    observacoes:      '',
  })

  const campo = (label, key, type = 'text') => (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      <input type={type} value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="input-field text-sm" />
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onFechar}>
      <div className="bg-[#1a2035] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Editar lead</h2>
          <button onClick={onFechar} className="text-gray-600 hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {campo('Nome da empresa', 'nome')}
          {campo('Nome fantasia', 'nome_fantasia')}
          {campo('Telefone', 'telefone', 'tel')}
          {campo('E-mail', 'email', 'email')}
          {campo('Segmento', 'segmento')}
          <div className="grid grid-cols-2 gap-3">
            {campo('Município', 'municipio')}
            {campo('Bairro', 'bairro')}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Produto sugerido</label>
            <select value={form.produto_sugerido}
              onChange={e => setForm(f => ({ ...f, produto_sugerido: e.target.value }))}
              className="input-field text-sm">
              <option value="cloudfy">Cloudfy</option>
              <option value="cplung">Cplung</option>
              <option value="qualificar">Qualificar depois</option>
            </select>
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
          <button onClick={() => onSalvar(form)} className="btn-primary flex-1">Salvar e aprovar</button>
        </div>
      </div>
    </div>
  )
}

export default function Triagem() {
  const [leads, setLeads]             = useState([])
  const [carregando, setCarregando]   = useState(true)
  const [filtro, setFiltro]           = useState('pendente')
  const [busca, setBusca]             = useState('')
  const [editando, setEditando]       = useState(null)
  const [processando, setProcessando] = useState({})
  const [aviso, setAviso]             = useState('')

  const carregar = async () => {
    setCarregando(true)
    const { data } = await supabase.from('staging_raspagem').select('*')
      .eq('status', filtro).order('score', { ascending: false })
      .order('criado_em', { ascending: false }).limit(100)
    setLeads(data ?? [])
    setCarregando(false)
  }

  useEffect(() => { carregar() }, [filtro])

  const emailContador = (email = '') => /contabil|assessoria|consult|escritorio|conta/i.test(email)
  const foraSegmento  = (seg = '') => /banco|seguros?|imobili|farmac|hospital|escola/i.test(seg)

  const setProc = (id, val) => setProcessando(p => ({ ...p, [id]: val }))
  const mostrarAviso = (msg) => { setAviso(msg); setTimeout(() => setAviso(''), 3500) }

  const aprovar = async (lead, dadosEditados = null) => {
    setProc(lead.id, 'aprovando')
    const d = dadosEditados ?? lead
    const { data: empresa, error } = await supabase.from('empresas').insert({
      nome: d.nome, nome_fantasia: d.nome_fantasia, cnpj: lead.cnpj,
      telefone: limparTelefone(d.telefone ?? ''), email: d.email,
      segmento: d.segmento, municipio: d.municipio, bairro: d.bairro,
      score: lead.score ?? 0, classificacao: lead.classificacao,
      produto_sugerido: d.produto_sugerido ?? 'qualificar',
      observacoes: d.observacoes ?? null,
      canal_origem: 'scraping', status_funil: 'novo', metadata: lead.bruto ?? {},
    }).select().single()

    if (error) {
      mostrarAviso(error.code === '23505' ? 'CNPJ já cadastrado como lead ativo.' : 'Erro ao aprovar. Tente novamente.')
      setProc(lead.id, null); return
    }
    await supabase.from('staging_raspagem')
      .update({ status: 'aprovado', empresa_id: empresa.id, processado_em: new Date().toISOString() })
      .eq('id', lead.id)
    setLeads(l => l.filter(x => x.id !== lead.id))
    setEditando(null)
    mostrarAviso('✓ Lead aprovado e adicionado ao funil.')
    setProc(lead.id, null)
  }

  const descartar = async (lead) => {
    setProc(lead.id, 'descartando')
    await supabase.from('staging_raspagem')
      .update({ status: 'descartado', motivo_descarte: 'descartado manualmente', processado_em: new Date().toISOString() })
      .eq('id', lead.id)
    setLeads(l => l.filter(x => x.id !== lead.id))
    setProc(lead.id, null)
  }

  const alterarProduto = (id, produto) =>
    setLeads(l => l.map(x => x.id === id ? { ...x, produto_sugerido: produto } : x))

  const filtrados = leads.filter(l => {
    const q = busca.toLowerCase()
    return !busca || l.nome?.toLowerCase().includes(q) || l.nome_fantasia?.toLowerCase().includes(q)
      || l.municipio?.toLowerCase().includes(q) || l.cnpj?.includes(q)
  })

  const alertas = filtrados.filter(l => emailContador(l.email) || foraSegmento(l.segmento))

  const abas = [
    { val: 'pendente',   label: 'Aguardando' },
    { val: 'aprovado',   label: 'Aprovados'  },
    { val: 'descartado', label: 'Descartados'},
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Topbar */}
      <header className="h-12 flex items-center gap-3 px-5 border-b border-white/5 bg-surface-sidebar shrink-0">
        <h1 className="text-sm font-semibold text-white flex-1">Triagem de leads</h1>
        <input type="search" placeholder="Buscar por nome, CNPJ, cidade…" value={busca}
          onChange={e => setBusca(e.target.value)} className="input-field max-w-xs h-8 text-xs" />
      </header>

      {/* Abas */}
      <div className="flex gap-0 border-b border-white/5 bg-surface-sidebar px-5 shrink-0">
        {abas.map(({ val, label }) => (
          <button key={val} onClick={() => setFiltro(val)}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors
              ${filtro === val ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto px-5 py-4">

        {/* Toast */}
        {aviso && (
          <div className={`mb-3 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium
            ${aviso.startsWith('✓') ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                    : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'}`}>
            {aviso}
          </div>
        )}

        {/* Alertas */}
        {filtro === 'pendente' && alertas.length > 0 && (
          <div className="mb-3 flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-2.5">
            <svg className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <span className="text-xs text-amber-400">
              {alertas.length} lead{alertas.length > 1 ? 's' : ''} com atenção — e-mail de contador ou fora do segmento.
            </span>
          </div>
        )}

        <p className="text-xs text-gray-600 mb-3">
          {carregando ? 'Carregando…' : `${filtrados.length} lead${filtrados.length !== 1 ? 's' : ''}`}
        </p>

        {carregando ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="card px-5 py-12 text-center">
            <p className="text-sm text-gray-500">
              {filtro === 'pendente' ? 'Nenhum lead aguardando triagem.'
               : filtro === 'aprovado' ? 'Nenhum lead aprovado ainda.'
               : 'Nenhum lead descartado.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtrados.map(lead => {
              const temAlerta = emailContador(lead.email) || foraSegmento(lead.segmento)
              const proc = processando[lead.id]
              const tel  = limparTelefone(lead.telefone ?? '')

              return (
                <div key={lead.id}
                  className={`card flex items-center gap-3 px-4 py-3 transition-all
                    ${temAlerta ? 'border-amber-500/30 bg-amber-500/5' : ''}
                    ${proc ? 'opacity-60' : ''}`}>

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center text-xs font-semibold shrink-0">
                    {iniciais(lead.nome_fantasia || lead.nome || '?')}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-white truncate">
                        {lead.nome_fantasia || lead.nome}
                      </p>
                      {temAlerta && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full shrink-0">verificar</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {[lead.segmento, lead.bairro, lead.municipio].filter(Boolean).join(' · ')}
                      {lead.cnpj && <span className="ml-2 font-mono text-gray-600">{lead.cnpj}</span>}
                    </p>
                    {lead.email && (
                      <p className={`text-xs truncate ${emailContador(lead.email) ? 'text-amber-500' : 'text-gray-600'}`}>
                        {lead.email}{emailContador(lead.email) && ' — pode ser contador'}
                      </p>
                    )}
                  </div>

                  {/* Score */}
                  <div className="hidden sm:flex flex-col items-center shrink-0 w-10">
                    <span className="text-sm font-semibold text-white">{lead.score ?? '—'}</span>
                    <span className="text-[10px] text-gray-500">{lead.classificacao ?? ''}</span>
                  </div>

                  {/* Produto */}
                  {filtro === 'pendente' ? (
                    <select value={lead.produto_sugerido ?? 'qualificar'}
                      onChange={e => alterarProduto(lead.id, e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="text-xs border border-white/10 rounded-full px-2 py-0.5 bg-white/5 text-gray-300 cursor-pointer focus:outline-none focus:border-accent/40 shrink-0">
                      <option value="cloudfy">Cloudfy</option>
                      <option value="cplung">Cplung</option>
                      <option value="qualificar">Qualificar</option>
                    </select>
                  ) : (
                    <span className={lead.produto_sugerido === 'cloudfy' ? 'badge-cloudfy' : lead.produto_sugerido === 'cplung' ? 'badge-cplung' : 'text-xs text-gray-500'}>
                      {lead.produto_sugerido === 'cloudfy' ? 'Cloudfy' : lead.produto_sugerido === 'cplung' ? 'Cplung' : 'Qualificar'}
                    </span>
                  )}

                  {/* WhatsApp */}
                  {tel && filtro === 'pendente' && (
                    <a href={linkWhatsApp(tel)} target="_blank" rel="noreferrer"
                      className="btn-whatsapp shrink-0 hidden md:inline-flex">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.135 1.528 5.887L.057 23.882a.5.5 0 00.61.61l6.044-1.461A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.799 9.799 0 01-5.001-1.37l-.36-.213-3.714.898.935-3.62-.234-.373A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
                      </svg>
                    </a>
                  )}

                  {/* Ações */}
                  {filtro === 'pendente' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setEditando(lead)} disabled={!!proc} className="btn-secondary">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Editar
                      </button>
                      <button onClick={() => aprovar(lead)} disabled={!!proc}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                        {proc === 'aprovando'
                          ? <span className="w-3 h-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
                          : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>}
                        Aprovar
                      </button>
                      <button onClick={() => descartar(lead)} disabled={!!proc}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-white/10 text-gray-600 hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        {proc === 'descartando'
                          ? <span className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                          : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {editando && (
        <ModalEditar lead={editando} onFechar={() => setEditando(null)}
          onSalvar={(dados) => aprovar(editando, dados)} />
      )}
    </div>
  )
}
