import { useState, useEffect } from 'react'
import { X, Building2, Phone, Mail, MapPin, FileText, Save, MessageSquare, History, Tag } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const STATUS_OPCOES = [
  { value: 'novo', label: 'Novo', cor: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { value: 'contato', label: 'Contato', cor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  { value: 'proposta', label: 'Proposta', cor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { value: 'fechado_ganho', label: 'Ganho', cor: 'bg-green-500/20 text-green-300 border-green-500/30' },
  { value: 'fechado_perdido', label: 'Perdido', cor: 'bg-red-500/20 text-red-300 border-red-500/30' },
]

const PRODUTO_OPCOES = [
  { value: 'cloudfy', label: 'Cloudfy', cor: 'text-purple-400' },
  { value: 'cplung', label: 'Cplung', cor: 'text-teal-400' },
  { value: 'qualificar', label: 'Qualificar', cor: 'text-gray-400' },
]

export function ModalEmpresa({ empresa, onClose, onSalvar }) {
  const [aba, setAba] = useState('dados')
  const [form, setForm] = useState(empresa || {})
  const [interacoes, setInteracoes] = useState([])
  const [novaInteracao, setNovaInteracao] = useState({ tipo: 'anotacao', notas: '' })
  const [salvando, setSalvando] = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)

  useEffect(() => {
    if (empresa?.id) {
      carregarInteracoes()
    }
  }, [empresa?.id])

  const carregarInteracoes = async () => {
    const { data } = await supabase
      .from('interacoes')
      .select('*')
      .eq('empresa_id', empresa.id)
      .order('ocorreu_em', { ascending: false })
    setInteracoes(data || [])
  }

  const handleSalvar = async () => {
    setSalvando(true)
    await onSalvar(form)
    setSalvando(false)
  }

  const handleAddInteracao = async () => {
    if (!novaInteracao.notas.trim()) return
    await supabase.from('interacoes').insert({
      empresa_id: empresa.id,
      tipo: novaInteracao.tipo,
      notas: novaInteracao.notas,
    })
    setNovaInteracao({ tipo: 'anotacao', notas: '' })
    carregarInteracoes()
  }

  const handleExcluir = async () => {
    if (!confirmarExclusao) {
      setConfirmarExclusao(true)
      return
    }
    await supabase.from('empresas').update({ excluido_em: new Date().toISOString() }).eq('id', empresa.id)
    onClose()
    window.location.reload()
  }

  if (!empresa) return null

  const inputClass = "w-full bg-surface border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all"
  const labelClass = "block text-xs font-medium text-gray-400 mb-1.5"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-card border border-white/[0.08] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center text-accent font-bold text-sm">
              {(form.nome_fantasia || form.nome || '').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-100">{form.nome_fantasia || form.nome}</h2>
              <p className="text-sm text-gray-500">{form.cnpj || 'Sem CNPJ'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-gray-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-white/[0.08] px-6">
          {[
            { id: 'dados', label: 'Dados', icon: Building2 },
            { id: 'interacoes', label: 'Interações', icon: MessageSquare },
            { id: 'notas', label: 'Notas & Observações', icon: FileText },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                aba === id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {aba === 'dados' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Razão Social *</label>
                  <input value={form.nome || ''} onChange={e => setForm({...form, nome: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Nome Fantasia</label>
                  <input value={form.nome_fantasia || ''} onChange={e => setForm({...form, nome_fantasia: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>CNPJ</label>
                  <input value={form.cnpj || ''} onChange={e => setForm({...form, cnpj: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Telefone</label>
                  <input value={form.telefone || ''} onChange={e => setForm({...form, telefone: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>E-mail</label>
                  <input value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Segmento</label>
                  <input value={form.segmento || ''} onChange={e => setForm({...form, segmento: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Município</label>
                  <input value={form.municipio || ''} onChange={e => setForm({...form, municipio: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Bairro</label>
                  <input value={form.bairro || ''} onChange={e => setForm({...form, bairro: e.target.value})} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Status do Funil</label>
                  <select
                    value={form.status_funil || 'novo'}
                    onChange={e => setForm({...form, status_funil: e.target.value})}
                    className={inputClass}
                  >
                    {STATUS_OPCOES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Produto Sugerido</label>
                  <select
                    value={form.produto_sugerido || ''}
                    onChange={e => setForm({...form, produto_sugerido: e.target.value})}
                    className={inputClass}
                  >
                    <option value="">Selecione...</option>
                    {PRODUTO_OPCOES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Classificação</label>
                  <select
                    value={form.classificacao || ''}
                    onChange={e => setForm({...form, classificacao: e.target.value})}
                    className={inputClass}
                  >
                    <option value="">—</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                </div>
              </div>

              {/* Tipo: Matriz/Filial */}
              <div className="border border-white/[0.08] rounded-lg p-4 bg-surface/50">
                <label className={labelClass}>Tipo de Empresa</label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={form.tipo !== 'filial'}
                      onChange={() => setForm({...form, tipo: 'matriz', matriz_id: null, unidade: null})}
                      className="text-accent focus:ring-accent"
                    />
                    <span className="text-sm text-gray-300">Matriz</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={form.tipo === 'filial'}
                      onChange={() => setForm({...form, tipo: 'filial'})}
                      className="text-accent focus:ring-accent"
                    />
                    <span className="text-sm text-gray-300">Filial</span>
                  </label>
                </div>
                {form.tipo === 'filial' && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Nome da Unidade</label>
                      <input
                        value={form.unidade || ''}
                        onChange={e => setForm({...form, unidade: e.target.value})}
                        placeholder="Ex: Loja Centro"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Matriz (CNPJ)</label>
                      <input
                        value={form.matriz_cnpj || ''}
                        onChange={e => setForm({...form, matriz_cnpj: e.target.value})}
                        placeholder="CNPJ da matriz"
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {aba === 'interacoes' && (
            <div className="space-y-4">
              <div className="bg-surface border border-white/[0.08] rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3">Nova Interação</h3>
                <div className="flex gap-3">
                  <select
                    value={novaInteracao.tipo}
                    onChange={e => setNovaInteracao({...novaInteracao, tipo: e.target.value})}
                    className="bg-surface-card border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-gray-100"
                  >
                    <option value="anotacao">Anotação</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="ligacao">Ligação</option>
                    <option value="email">E-mail</option>
                    <option value="visita">Visita</option>
                  </select>
                  <input
                    value={novaInteracao.notas}
                    onChange={e => setNovaInteracao({...novaInteracao, notas: e.target.value})}
                    placeholder="Descreva a interação..."
                    className={`${inputClass} flex-1`}
                    onKeyDown={e => e.key === 'Enter' && handleAddInteracao()}
                  />
                  <button
                    onClick={handleAddInteracao}
                    className="px-4 py-2 bg-accent text-black rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {interacoes.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Nenhuma interação registrada.</p>
                ) : (
                  interacoes.map(i => (
                    <div key={i.id} className="bg-surface border border-white/[0.08] rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          i.tipo === 'whatsapp' ? 'bg-green-500/20 text-green-300' :
                          i.tipo === 'ligacao' ? 'bg-blue-500/20 text-blue-300' :
                          i.tipo === 'email' ? 'bg-purple-500/20 text-purple-300' :
                          i.tipo === 'visita' ? 'bg-amber-500/20 text-amber-300' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          {i.tipo}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(i.ocorreu_em).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300">{i.notas}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {aba === 'notas' && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Observações Gerais</label>
                <textarea
                  value={form.observacoes || ''}
                  onChange={e => setForm({...form, observacoes: e.target.value})}
                  placeholder="Adicione observações, anotações internas, histórico de negociação..."
                  className="w-full min-h-[300px] bg-surface border border-white/[0.08] rounded-lg p-4 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 resize-y transition-all leading-relaxed"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.08] bg-surface/30">
          <button
            onClick={handleExcluir}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              confirmarExclusao
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'text-red-400 hover:bg-red-500/10'
            }`}
          >
            {confirmarExclusao ? 'Clique novamente para confirmar' : 'Excluir'}
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSalvar}
              disabled={salvando}
              className="flex items-center gap-2 px-5 py-2 bg-accent text-black rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              <Save size={16} />
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
