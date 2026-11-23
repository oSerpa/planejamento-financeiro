import { useState } from 'react'
import { CalendarDays, CreditCard, Pencil, Tag, Trash2, X } from 'lucide-react'
import { useStore } from '../data/store'
import type { Lancamento } from '../data/types'
import { parseISO } from '../lib/format'
import { Icone } from './Icone'
import { Valor } from './Valor'
import { NovoLancamento } from './NovoLancamento'

const semCategoria = { nome: 'Sem categoria', cor: '#8A928C', icone: 'circle' }

interface Props {
  l: Lancamento
  onFechar: () => void
  onEditar: () => void
}

/** Ficha do lançamento: abre ao tocar num item, com atalho para editar ou apagar. */
export function DetalheLancamento({ l, onFechar, onEditar }: Props) {
  const { categoria, lancamentos, remover } = useStore()
  const [confirmar, setConfirmar] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const cat = categoria(l.categoriaId) ?? semCategoria

  const mesmaCat = lancamentos.filter((x) => x.categoriaId === l.categoriaId)
  const totalCat = mesmaCat.reduce((s, x) => s + x.valor, 0)
  const pct = totalCat ? (l.valor / totalCat) * 100 : 0
  const data = parseISO(l.data).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  async function apagar() {
    if (!confirmar) return setConfirmar(true)
    try {
      await remover(l.id)
      onFechar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu para apagar.')
    }
  }

  return (
    <div className="sheet-fundo" onClick={onFechar}>
      <div className="sheet detalhe" role="dialog" aria-label="Detalhe do lançamento" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__alca" />
        <button type="button" className="btn-icone detalhe__fechar" onClick={onFechar} aria-label="Fechar">
          <X size={20} />
        </button>

        <div className="detalhe__cabeca">
          <span className="detalhe__icone" style={{ color: cat.cor, background: `${cat.cor}1f` }}>
            <Icone nome={cat.icone} size={26} />
          </span>
          <p className="detalhe__desc">{l.descricao}</p>
          <Valor valor={l.valor} sinal={l.tipo} className="detalhe__valor" />
          <span className={`detalhe__tipo detalhe__tipo--${l.tipo}`}>{l.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span>
        </div>

        <dl className="detalhe__dados">
          <div>
            <dt>
              <Tag size={15} /> Categoria
            </dt>
            <dd>{cat.nome}</dd>
          </div>
          <div>
            <dt>
              <CalendarDays size={15} /> Data
            </dt>
            <dd className="detalhe__data">{data}</dd>
          </div>
          {l.conta && (
            <div>
              <dt>
                <CreditCard size={15} /> Conta
              </dt>
              <dd>{l.conta}</dd>
            </div>
          )}
        </dl>

        {mesmaCat.length > 1 && (
          <div className="detalhe__peso">
            <div className="detalhe__peso-linha">
              <span>
                {Math.round(pct)}% de {cat.nome.toLowerCase()} no mês
              </span>
              <Valor valor={totalCat} />
            </div>
            <span className="cat__trilho">
              <span style={{ width: `${pct}%`, background: cat.cor }} />
            </span>
          </div>
        )}

        {erro && <p className="alerta alerta--erro">{erro}</p>}

        <div className="detalhe__acoes">
          <button type="button" className="btn btn--suave" onClick={onEditar}>
            <Pencil size={17} /> Editar
          </button>
          <button type="button" className={`btn ${confirmar ? 'btn--perigo-cheio' : 'btn--fantasma btn--perigo'}`} onClick={apagar}>
            <Trash2 size={17} /> {confirmar ? 'Confirmar' : 'Apagar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Abre a ficha e, se pedir para editar, troca pelo formulário. */
export function FichaLancamento({ l, onFechar }: { l: Lancamento; onFechar: () => void }) {
  const [editando, setEditando] = useState(false)
  if (editando) return <NovoLancamento lancamento={l} onFechar={onFechar} />
  return <DetalheLancamento l={l} onFechar={onFechar} onEditar={() => setEditando(true)} />
}
