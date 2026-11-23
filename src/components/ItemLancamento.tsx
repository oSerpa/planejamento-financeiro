import { categorias } from '../data/mock'
import type { Lancamento } from '../data/types'
import { Icone } from './Icone'
import { Valor } from './Valor'

export function ItemLancamento({ l }: { l: Lancamento }) {
  const cat = categorias.find((c) => c.id === l.categoriaId)!
  return (
    <li className="item">
      <span className="item__icone" style={{ color: cat.cor, background: `${cat.cor}1f` }}>
        <Icone nome={cat.icone} size={18} />
      </span>
      <span className="item__texto">
        <span className="item__desc">{l.descricao}</span>
        <span className="item__meta">
          {cat.nome}
          {l.conta && <> · {l.conta}</>}
        </span>
      </span>
      <Valor valor={l.valor} sinal={l.tipo} className="item__valor" />
    </li>
  )
}
