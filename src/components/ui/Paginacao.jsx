import { ChevronLeft, ChevronRight } from 'lucide-react'

export function Paginacao({ pagina, totalPaginas, totalRegistros, onPaginaChange, itensPorPagina = 20 }) {
  const inicio = totalRegistros === 0 ? 0 : (pagina - 1) * itensPorPagina + 1
  const fim = Math.min(pagina * itensPorPagina, totalRegistros)

  const gerarPaginas = () => {
    const paginas = []
    const maxVisiveis = 5
    let start = Math.max(1, pagina - Math.floor(maxVisiveis / 2))
    let end = Math.min(totalPaginas, start + maxVisiveis - 1)

    if (end - start + 1 < maxVisiveis) {
      start = Math.max(1, end - maxVisiveis + 1)
    }

    if (start > 1) {
      paginas.push(1)
      if (start > 2) paginas.push('...')
    }

    for (let i = start; i <= end; i++) paginas.push(i)

    if (end < totalPaginas) {
      if (end < totalPaginas - 1) paginas.push('...')
      paginas.push(totalPaginas)
    }

    return paginas
  }

  if (totalPaginas <= 1) return null

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-surface-card border-t border-white/[0.08]">
      <span className="text-sm text-gray-400">
        Mostrando <strong className="text-gray-200">{inicio}-{fim}</strong> de <strong className="text-gray-200">{totalRegistros}</strong>
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPaginaChange(pagina - 1)}
          disabled={pagina === 1}
          className="p-2 rounded-lg bg-surface hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        {gerarPaginas().map((p, i) => (
          p === '...' ? (
            <span key={`dots-${i}`} className="px-2 text-gray-500">...</span>
          ) : (
            <button
              key={p}
              onClick={() => onPaginaChange(p)}
              className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-colors ${
                p === pagina
                  ? 'bg-accent text-black'
                  : 'bg-surface hover:bg-surface-hover text-gray-300'
              }`}
            >
              {p}
            </button>
          )
        ))}
        <button
          onClick={() => onPaginaChange(pagina + 1)}
          disabled={pagina === totalPaginas}
          className="p-2 rounded-lg bg-surface hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
