import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// ── helpers ──────────────────────────────────────────────────
function iniciais(nome = '') {
  return nome.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

function formatarTelefone(tel = '') {
  return tel.replace(/\D/g, '').replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
    || tel.replace(/\D/g, '').replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
    || tel
}

function linkWhatsApp(tel = '') {
  const num = tel.replace(/\D/g, '')
  const com55 = num.startsWith('55') ? num : '55' + num
  return `https://wa.me/${com55}`
}

function BadgeProduto({ produto }) {
  if (produto === 'cloudfy')
    return <span className="badge-cloudfy">Cloudfy</span>
  if (produto === 'cplung')
    return <span className="badge-cplung">Cplung</span>
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Qualificar</span>
}

function BadgeScore({ classificacao }) {
  if (classificacao === 'A') return <span className="badge-score-a">Score A</span>
  if (classificacao === 'B') return <span className="badge-score-b">Score B</span>
  return null
}

const STATUS_FUNIL = ['novo', 'contato', 'proposta', 'fechado_ganho', 'fechado_perdido']
const STATUS_LABEL = {
  novo:           'Novo',
  contato:        'Contato feito',
  proposta:       'Proposta enviada',
  fechado_ganho:  'Fechado — ganho',
  fechado_perdido:'Fechado — perdido',
}

// ── componente ────────────────────────────────────────────────
export default function Painel() {
  const navigate = useNavigate()
  const [empresas, setEmpresas]     = useState([])
  const [staging, setStaging]       = useState([])
  const [busca, setBusca]           = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      setCarregando(true)
      const [{ data: emps }, { data: stg }] = await Promise.all([
        supabase
          .from('empresas')
          .select('*')
          .is('excluido_em', null)
          .order('score', { ascending: false })
          .limit(50),
        supabase
          .from('staging_raspagem')
          .select('id')
          .eq('status', 'pendente'),
      ])
      setEmpresas(emps ?? [])
      setStaging(stg ?? [])
      setCarregando(false)
    }
    carregar()
  }, [])

  // KPIs
  const total       = empresas.length
  const emNegoc     = empresas.filter(e => ['contato','proposta'].includes(e.status_funil)).length
  const qtdCloudfy  = empresas.filter(e => e.produto_sugerido === 'cloudfy').length
  const qtdCplung   = empresas.filter(e => e.produto_sugerido === 'cplung').length
  const naFila      = staging.length

  // Filtro por busca
  const filtrados = empresas.filter(e => {
    const q = busca.toLowerCase()
    return (
      e.nome?.toLowerCase().includes(q) ||
      e.nome_fantasia?.toLowerCase().includes(q) ||
      e.bairro?.toLowerCase().includes(q) ||
      e.municipio?.toLowerCase().includes(q)
    )
  })

  const kpis = [
    { label: 'Leads ativos',    valor: total,     sub: `${naFila} aguardando triagem`, cor: 'text-gray-900' },
    { label: 'Em negociação',   valor: emNegoc,   sub: 'contato + proposta',           cor: 'text-brand-600' },
    { label: 'Cloudfy',         valor: qtdCloudfy, sub: 'ticket alto',                 cor: 'text-[#534AB7]' },
    { label: 'Cplung',          valor: qtdCplung,  sub: 'varejo',                      cor: 'text-[#1D9E75]' },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Topbar */}
      <header className="h-12 flex items-center gap-3 px-5 border-b border-gray-100 bg-white shrink-0">
        <h1 className="text-sm font-semibold text-gray-900 flex-1">Painel</h1>
        <input
          type="search"
          placeholder="Buscar lead ou empresa…"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="input-field max-w-xs h-8 text-xs"
        />
        <button
          onClick={() => navigate('/triagem')}
          className="btn-secondary text-xs"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Triagem
          {naFila > 0 && (
            <span className="ml-1 bg-brand-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
              {naFila}
            </span>
          )}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4">

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {kpis.map(({ label, valor, sub, cor }) => (
            <div key={label} className="card px-4 py-3">
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <p className={`text-2xl font-semibold ${cor}`}>
                {carregando ? '—' : valor}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Lista de leads */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            {busca ? `${filtrados.length} resultado${filtrados.length !== 1 ? 's' : ''}` : 'Leads prioritários — score A'}
          </p>
          <button
            onClick={() => navigate('/funil')}
            className="text-xs text-brand-600 hover:text-brand-700"
          >
            Ver funil →
          </button>
        </div>

        {carregando ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="card px-5 py-10 text-center">
            <p className="text-sm text-gray-400">
              {busca ? 'Nenhum lead encontrado para essa busca.' : 'Nenhum lead ainda. Comece pela triagem.'}
            </p>
            {!busca && (
              <button onClick={() => navigate('/triagem')} className="mt-3 text-xs text-brand-600 hover:underline">
                Ir para triagem →
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtrados.map(emp => (
              <div
                key={emp.id}
                className="card flex items-center gap-3 px-4 py-3 hover:border-brand-200 hover:shadow-sm transition-all cursor-pointer group"
                onClick={() => navigate(`/funil`)}
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center text-xs font-semibold shrink-0">
                  {iniciais(emp.nome_fantasia || emp.nome)}
                </div>

                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {emp.nome_fantasia || emp.nome}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {[emp.segmento, emp.bairro, emp.municipio].filter(Boolean).join(' · ')}
                  </p>
                </div>

                {/* Badges */}
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  <BadgeProduto produto={emp.produto_sugerido} />
                  <BadgeScore classificacao={emp.classificacao} />
                  <span className="text-xs text-gray-300 border border-gray-100 rounded-md px-2 py-0.5">
                    {STATUS_LABEL[emp.status_funil] ?? emp.status_funil}
                  </span>
                </div>

                {/* Score bar */}
                <div className="hidden md:flex flex-col items-end gap-1 shrink-0 w-14">
                  <span className="text-xs font-medium text-gray-500">{emp.score}</span>
                  <div className="w-full h-1 rounded-full bg-gray-100">
                    <div
                      className="h-1 rounded-full bg-brand-500"
                      style={{ width: `${Math.min(emp.score, 100)}%` }}
                    />
                  </div>
                </div>

                {/* WhatsApp */}
                {emp.telefone && (
                  <a
                    href={linkWhatsApp(emp.telefone)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="btn-whatsapp shrink-0"
                    title={`WhatsApp — ${formatarTelefone(emp.telefone)}`}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.135 1.528 5.887L.057 23.882a.5.5 0 00.61.61l6.044-1.461A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.799 9.799 0 01-5.001-1.37l-.36-.213-3.714.898.935-3.62-.234-.373A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
                    </svg>
                    Contatar
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
