export function SkeletonTabela({ linhas = 5, colunas = 9 }) {
  return (
    <div className="bg-surface-card border border-white/[0.08] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-surface border-b border-white/[0.08]">
              {Array.from({ length: colunas }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <div className="h-4 bg-white/5 rounded w-20 animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {Array.from({ length: linhas }).map((_, li) => (
              <tr key={li}>
                {Array.from({ length: colunas }).map((_, ci) => (
                  <td key={ci} className="px-4 py-3">
                    <div className={`h-4 bg-white/5 rounded animate-pulse ${ci === 0 ? 'w-4' : ci === 1 ? 'w-32' : 'w-20'}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
