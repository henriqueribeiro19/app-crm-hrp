import { useState } from 'react'
import { Eye, Pencil, Trash2, ArrowUpDown, Building2, MapPin, Phone, Mail } from 'lucide-react'

const STATUS_COR = {
  novo: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  contato: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  proposta: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  fechado_ganho: 'bg-green-500/20 text-green-300 border-green-500/30',
  fechado_perdido: 'bg-red-500/20 text-red-300 border-red-500/30',
}

const STATUS_LABEL = {
  novo: 'Novo',
  contato: 'Contato',
  proposta: 'Proposta',
  fechado_ganho: 'Ganho',
  fechado_perdido: 'Perdido',
}

const PRODUTO_COR = {
  cloudfy: 'text-purple-400',
  cplung: 'text-teal-400',
  qualificar: 'text-gray-400',
}

export function TabelaEmpresas({ empresas, onVer, onEditar, onExcluir, ordenacao, onOrdenar }) {
  const [selecionados, setSelecionados] = useState(new Set())

  const toggleSelecao = (id) => {
    const novo = new Set(selecionados)
    if (novo.has(id)) novo.delete(id)
    else novo.add(id)
    setSelecionados(novo)
  }

  const toggleTodos = () => {
    if (selecionados.size === empresas.length) {
      setSelecionados(new Set())
    } else {
      setSelecionados(new Set(empresas.map(e => e.id)))
    }
  }

  const Header = ({ label, campo }) => (
    <th
      onClick={() => onOrdenar(campo)}
      className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200 select-none group"
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown size={12} className={`opacity-0 group-hover:opacity-50 transition-opacity ${ordenacao.campo === campo ? 'opacity-100 text-accent' : ''}`} />
      </div>
    </th>
  )

  return (
    <div className="bg-surface-card border border-white/[0.08] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-surface border-b border-white/[0.08]">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={empresas.length > 0 && selecionados.size === empresas.length}
                  onChange={toggleTodos}
                  className="rounded border-white/[0.2] bg-surface-card text-accent focus:ring-accent"
                />
              </th>
              <Header label="Empresa" campo="nome" />
              <Header label="Segmento" campo="segmento" />
              <Header label="Cidade" campo="municipio" />
              <Header label="Score" campo="score" />
              <Header label="Status" campo="status_funil" />
              <Header label="Produto" campo="produto_sugerido" />
              <Header label="Classif." campo="classificacao" />
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {empresas.map(emp => (
              <tr
                key={emp.id}
                className={`hover:bg-surface-hover/50 transition-colors ${selecionados.has(emp.id) ? 'bg-accent/5' : ''}`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selecionados.has(emp.id)}
                    onChange={() => toggleSelecao(emp.id)}
                    className="rounded border-white/[0.2] bg-surface-card text-accent focus:ring-accent"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center text-accent font-bold text-xs shrink-0">
                      {(emp.nome_fantasia || emp.nome).split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-gray-100 truncate">{emp.nome_fantasia || emp.nome}</div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {emp.cnpj && <span className="font-mono">{emp.cnpj}</span>}
                        {emp.tipo === 'filial' && (
                          <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 text-[10px] font-medium">FILIAL</span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-300">{emp.segmento || '—'}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-sm text-gray-400">
                    <MapPin size={12} />
                    <span>{[emp.municipio, emp.uf].filter(Boolean).join('/') || '—'}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 rounded-full bg-surface overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accent to-emerald-400"
                        style={{ width: `${emp.score}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-200 w-8">{emp.score}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_COR[emp.status_funil] || STATUS_COR.novo}`}>
                    {STATUS_LABEL[emp.status_funil] || emp.status_funil}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-sm font-medium capitalize ${PRODUTO_COR[emp.produto_sugerido] || 'text-gray-400'}`}>
                    {emp.produto_sugerido || '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                    emp.classificacao === 'A' ? 'bg-green-500/20 text-green-300' :
                    emp.classificacao === 'B' ? 'bg-yellow-500/20 text-yellow-300' :
                    emp.classificacao === 'C' ? 'bg-red-500/20 text-red-300' :
                    'bg-gray-500/20 text-gray-300'
                  }`}>
                    {emp.classificacao || '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onVer(emp)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                      title="Ver detalhes"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => onEditar(emp)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                      title="Editar"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => onExcluir(emp)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {empresas.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <Building2 size={48} className="mb-3 opacity-30" />
          <p className="text-lg font-medium">Nenhum registro encontrado</p>
          <p className="text-sm">Tente ajustar os filtros ou adicionar novos leads.</p>
        </div>
      )}
    </div>
  )
}
