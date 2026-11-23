import type { ReactNode } from 'react'

/** Topo padrão das páginas: linha pequena em cima, título e ações à direita. */
export function Cabecalho({ sup, titulo, children }: { sup: ReactNode; titulo: ReactNode; children?: ReactNode }) {
  return (
    <header className="topo">
      <div className="topo__texto">
        <p className="topo__sup">{sup}</p>
        <h1 className="topo__titulo">{titulo}</h1>
      </div>
      {children}
    </header>
  )
}
