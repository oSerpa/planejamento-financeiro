import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { categorias, hoje } from '../data/mock'
import { useStore } from '../data/store'
import type { TipoLancamento } from '../data/types'
import { Icone } from './Icone'

export function NovoLancamento({ onFechar }: { onFechar: () => void }) {
  const { adicionar } = useStore()
  const [tipo, setTipo] = useState<TipoLancamento>('saida')
  const [valor, setValor] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoriaId, setCategoriaId] = useState('mercado')
  const [data, setData] = useState(hoje)

  const cats = categorias.filter((c) => c.tipo === tipo)
  const numero = Number(valor.replace(/\./g, '').replace(',', '.'))
  const valido = numero > 0 && descricao.trim().length > 0

  function trocarTipo(t: TipoLancamento) {
    setTipo(t)
    setCategoriaId(categorias.find((c) => c.tipo === t)!.id)
  }

  function salvar(e: FormEvent) {
    e.preventDefault()
    if (!valido) return
    adicionar({ tipo, valor: numero, descricao: descricao.trim(), categoriaId, data })
    onFechar()
  }

  return (
    <div className="sheet-fundo" onClick={onFechar}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={salvar}>
        <div className="sheet__topo">
          <h2>Novo lançamento</h2>
          <button type="button" className="btn-icone" onClick={onFechar} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="segmento" data-tipo={tipo}>
          <button type="button" className={tipo === 'saida' ? 'ativo' : ''} onClick={() => trocarTipo('saida')}>
            Saída
          </button>
          <button type="button" className={tipo === 'entrada' ? 'ativo' : ''} onClick={() => trocarTipo('entrada')}>
            Entrada
          </button>
        </div>

        <label className={`campo-valor campo-valor--${tipo}`}>
          <span>R$</span>
          <input
            inputMode="decimal"
            placeholder="0,00"
            value={valor}
            onChange={(e) => setValor(e.target.value.replace(/[^\d.,]/g, ''))}
            autoFocus
          />
        </label>

        <label className="campo">
          <span className="campo__rotulo">Descrição</span>
          <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: mercado do mês" />
        </label>

        <div className="campo">
          <span className="campo__rotulo">Categoria</span>
          <div className="chips">
            {cats.map((c) => (
              <button
                type="button"
                key={c.id}
                className={`chip ${categoriaId === c.id ? 'chip--ativo' : ''}`}
                style={{ '--cor': c.cor } as React.CSSProperties}
                onClick={() => setCategoriaId(c.id)}
              >
                <Icone nome={c.icone} size={15} />
                {c.nome}
              </button>
            ))}
          </div>
        </div>

        <label className="campo">
          <span className="campo__rotulo">Data</span>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </label>

        <button className="btn btn--primario btn--largo" disabled={!valido}>
          Salvar
        </button>
      </form>
    </div>
  )
}
