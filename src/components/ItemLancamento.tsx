import { useStore } from '../data/store'
import type { Lancamento } from '../data/types'
import { Icone } from './Icone'
import { Valor } from './Valor'

const semCategoria = { nome: 'Sem categoria', cor: '#8A928C', icone: 'circle' }

export function ItemLancamento({ l, onAbrir }: { l: Lancamento; onAbrir?: (l: Lancamento) => void }) {
  const cat = useStore().categoria(l.categoriaId) ?? semCategoria
  const conteudo = (
    <>
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
    </>
  )
  if (!onAbrir) return <li className="item">{conteudo}</li>
  return (
    <li>
      <button type="button" className="item item--botao" onClick={() => onAbrir(l)}>
        {conteudo}
      </button>
    </li>
  )
}
