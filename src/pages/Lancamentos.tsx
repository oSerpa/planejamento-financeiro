import { useState } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { hoje } from '../data/mock'
import { useStore } from '../data/store'
import type { TipoLancamento } from '../data/types'
import { diaRelativo, nomeMes } from '../lib/format'
import { ItemLancamento } from '../components/ItemLancamento'
import { Valor } from '../components/Valor'

type Filtro = 'todos' | TipoLancamento

export function Lancamentos() {
  const { lancamentos } = useStore()
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busca, setBusca] = useState('')

  const filtrados = lancamentos.filter(
    (l) =>
      (filtro === 'todos' || l.tipo === filtro) &&
      l.descricao.toLowerCase().includes(busca.toLowerCase()),
  )

  const grupos = new Map<string, typeof filtrados>()
  for (const l of [...filtrados].sort((a, b) => b.data.localeCompare(a.data))) {
    grupos.set(l.data, [...(grupos.get(l.data) ?? []), l])
  }
  const porDia = [...grupos.entries()]

  const total = (t: TipoLancamento) =>
    lancamentos.filter((l) => l.tipo === t).reduce((s, l) => s + l.valor, 0)

  return (
    <div className="pagina">
      <header className="cabecalho cabecalho--linha">
        <h1 className="cabecalho__titulo">Lançamentos</h1>
        <div className="mes">
          <button className="btn-icone" aria-label="Mês anterior">
            <ChevronLeft size={18} />
          </button>
          <span className="mes__nome">{nomeMes(hoje)}</span>
          <button className="btn-icone" aria-label="Próximo mês">
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      <div className="resumo-linha">
        <div className="resumo-linha__item">
          <span className="rotulo">Entradas</span>
          <Valor valor={total('entrada')} className="cor-entrada" />
        </div>
        <div className="resumo-linha__item">
          <span className="rotulo">Saídas</span>
          <Valor valor={total('saida')} className="cor-saida" />
        </div>
        <div className="resumo-linha__item">
          <span className="rotulo">Saldo</span>
          <Valor valor={total('entrada') - total('saida')} />
        </div>
      </div>

      <div className="ferramentas">
        <div className="filtros" role="tablist">
          {(['todos', 'entrada', 'saida'] as Filtro[]).map((f) => (
            <button key={f} className={filtro === f ? 'ativo' : ''} onClick={() => setFiltro(f)}>
              {f === 'todos' ? 'Todos' : f === 'entrada' ? 'Entradas' : 'Saídas'}
            </button>
          ))}
        </div>
        <label className="busca">
          <Search size={16} />
          <input placeholder="Buscar" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </label>
      </div>

      {porDia.length === 0 && <p className="vazio">Nada por aqui com esse filtro.</p>}

      {porDia.map(([dia, itens]) => {
        const saldoDia = itens.reduce((s, l) => s + (l.tipo === 'entrada' ? l.valor : -l.valor), 0)
        return (
          <section key={dia} className="dia">
            <div className="dia__topo">
              <h2>{diaRelativo(dia, hoje)}</h2>
              <Valor valor={saldoDia} className="dia__saldo" />
            </div>
            <ul className="lista cartao">
              {itens.map((l) => (
                <ItemLancamento key={l.id} l={l} />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
