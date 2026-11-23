import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '../data/store'
import { nomeMes } from '../lib/format'

/** compacto: só as setas, o nome do mês já aparece no título da página. */
export function SeletorMes({ compacto = false }: { compacto?: boolean }) {
  const { mes, irParaMes } = useStore()
  return (
    <div className={`mes ${compacto ? 'mes--compacto' : ''}`}>
      <button className="btn-icone" aria-label="Mês anterior" onClick={() => irParaMes(-1)}>
        <ChevronLeft size={18} />
      </button>
      {!compacto && <span className="mes__nome">{nomeMes(`${mes}-01`)}</span>}
      <button className="btn-icone" aria-label="Próximo mês" onClick={() => irParaMes(1)}>
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
