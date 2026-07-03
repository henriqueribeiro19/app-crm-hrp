import { useState } from 'react'
import { Search, Filter, X, SlidersHorizontal } from 'lucide-react'

export function FiltrosAvancados({ filtros, onFiltrosChange, opcoes }) {
  const [expandido, setExpandido] = useState(false)

  const handleChange = (campo, valor) => {
    onFiltrosChange({ ...filtros, [campo]: valor })
  }

  const limparFiltros = () => {
    onFiltrosChange({
      busca: '',
      segmento: '',
      municipio: '',
      status_funil: '',
      produto_sugerido: '',
      classificacao: '',
      porte: '',
      scoreMin: 0,
      scoreMax: 100,
    })
  }

  const temFiltrosAtivos = Object.values(filtros).some(v => v !== '' && v !== 0 && v !== 100)

  const inputClass = "bg-surface border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all"
  const selectClass = "bg-surface border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all appearance-none cursor-pointer"

  return (
    <div className="bg-surface-card border border-white/[0.08] rounded-xl p-4 mb-4">
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
        {/* Busca */}
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por nome, fantasia ou CNPJ..."
            value={filtros.busca}
            onChange={e => handleChange('busca', e.target.value)}
            className={`${inputClass} w-full pl-9`}
          />
        </div>

        {/* Filtros rápidos */}
        <div className="flex gap-2 flex-wrap">
          <select
            value={filtros.status_funil}
            onChange={e => handleChange('status_funil', e.target.value)}
            className={selectClass}
          >
            <option value="">Status</option>
            {opcoes.status?.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={filtros.segmento}
            onChange={e => handleChange('segmento', e.target.value)}
            className={selectClass}
          >
            <option value="">Segmento</option>
            {opcoes.segmento?.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={filtros.produto_sugerido}
            onChange={e => handleChange('produto_sugerido', e.target.value)}
            className={selectClass}
          >
            <option value="">Produto</option>
            {opcoes.produto?.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <button
            onClick={() => setExpandido(!expandido)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              expandido ? 'bg-accent text-black' : 'bg-surface hover:bg-surface-hover text-gray-300'
            }`}
          >
            <SlidersHorizontal size={16} />
            Mais filtros
          </button>

          {temFiltrosAtivos && (
            <button
              onClick={limparFiltros}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <X size={14} />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Filtros expandidos */}
      {expandido && (
        <div className="mt-4 pt-4 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            value={filtros.municipio}
            onChange={e => handleChange('municipio', e.target.value)}
            className={selectClass}
          >
            <option value="">Município</option>
            {opcoes.municipio?.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <select
            value={filtros.classificacao}
            onChange={e => handleChange('classificacao', e.target.value)}
            className={selectClass}
          >
            <option value="">Classificação</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>

          <select
            value={filtros.porte}
            onChange={e => handleChange('porte', e.target.value)}
            className={selectClass}
          >
            <option value="">Porte</option>
            <option value="MEI">MEI</option>
            <option value="ME">ME</option>
            <option value="EPP">EPP</option>
            <option value="DEMAIS">DEMAIS</option>
          </select>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 whitespace-nowrap">Score:</span>
            <input
              type="number"
              min="0"
              max="100"
              value={filtros.scoreMin}
              onChange={e => handleChange('scoreMin', parseInt(e.target.value) || 0)}
              className={`${inputClass} w-16 text-center`}
            />
            <span className="text-gray-500">-</span>
            <input
              type="number"
              min="0"
              max="100"
              value={filtros.scoreMax}
              onChange={e => handleChange('scoreMax', parseInt(e.target.value) || 100)}
              className={`${inputClass} w-16 text-center`}
            />
          </div>
        </div>
      )}
    </div>
  )
}
