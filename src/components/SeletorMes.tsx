import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '../data/store'
import { nomeMes } from '../lib/format'

export function SeletorMes() {
  const { mes, irParaMes } = useStore()
  return (
    <div className="mes">
      <button className="btn-icone" aria-label="Mês anterior" onClick={() => irParaMes(-1)}>
        <ChevronLeft size={18} />
      </button>
      <span className="mes__nome">{nomeMes(`${mes}-01`)}</span>
      <button className="btn-icone" aria-label="Próximo mês" onClick={() => irParaMes(1)}>
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
