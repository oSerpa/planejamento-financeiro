import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { useStore } from '../data/store'
import type { Lancamento, TipoLancamento } from '../data/types'
import { diaRelativo, hojeISO, nomeMes, parseISO } from '../lib/format'
import { ItemLancamento } from '../components/ItemLancamento'
import { Valor } from '../components/Valor'
import { SeletorMes } from '../components/SeletorMes'
import { Cabecalho } from '../components/Cabecalho'
import { Vazio } from '../components/Vazio'
import { FichaLancamento } from '../components/DetalheLancamento'

/** Hoje, Ontem ou o dia da semana (o número já aparece ao lado). */
function rotuloDia(iso: string, hoje: string) {
  const r = diaRelativo(iso, hoje)
  if (r === 'Hoje' || r === 'Ontem') return r
  return parseISO(iso).toLocaleDateString('pt-BR', { weekday: 'long' }).replace('-feira', '')
}

type Filtro = 'todos' | TipoLancamento

const nomesFiltro: Record<Filtro, string> = { todos: 'Tudo', entrada: 'Entradas', saida: 'Saídas' }

export function Lancamentos() {
  const { lancamentos, carregando, erro, mes } = useStore()
  const [aberto, setAberto] = useState<Lancamento | null>(null)
  const hoje = hojeISO()
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busca, setBusca] = useState('')

  const termo = busca.trim().toLowerCase()
  const filtrados = lancamentos.filter(
    (l) => (filtro === 'todos' || l.tipo === filtro) && l.descricao.toLowerCase().includes(termo),
  )

  const grupos = new Map<string, Lancamento[]>()
  for (const l of [...filtrados].sort((a, b) => b.data.localeCompare(a.data))) {
    grupos.set(l.data, [...(grupos.get(l.data) ?? []), l])
  }
  const porDia = [...grupos.entries()]

  const total = (t: TipoLancamento) => lancamentos.filter((l) => l.tipo === t).reduce((s, l) => s + l.valor, 0)
  const contagem = (f: Filtro) => (f === 'todos' ? lancamentos.length : lancamentos.filter((l) => l.tipo === f).length)
  const [nomeDoMes, ano] = nomeMes(`${mes}-01`).split(' de ')

  return (
    <div className="pagina pagina--v2">
      <Cabecalho
        sup="Extrato"
        titulo={
          <>
            {nomeDoMes} <span>{ano}</span>
          </>
        }
      >
        <SeletorMes compacto />
      </Cabecalho>

      {erro && <p className="alerta alerta--erro">Não deu para carregar: {erro}</p>}

      <section className="numeros entra">
        <div className="numero">
          <span className="numero__rotulo">
            <i className="ponto ponto--entrada" /> Entradas
          </span>
          <Valor valor={total('entrada')} className="numero__valor cor-entrada" />
        </div>
        <div className="numero">
          <span className="numero__rotulo">
            <i className="ponto ponto--saida" /> Saídas
          </span>
          <Valor valor={total('saida')} className="numero__valor cor-saida" />
        </div>
        <div className="numero">
          <span className="numero__rotulo">
            <i className="ponto" /> Saldo
          </span>
          <Valor valor={total('entrada') - total('saida')} className="numero__valor" />
        </div>
      </section>

      <div className="ferramentas entra" style={{ '--i': 1 } as React.CSSProperties}>
        <div className="filtros" role="tablist">
          {(['todos', 'entrada', 'saida'] as Filtro[]).map((f) => (
            <button key={f} role="tab" aria-selected={filtro === f} className={filtro === f ? 'ativo' : ''} onClick={() => setFiltro(f)}>
              {nomesFiltro[f]} <small>{contagem(f)}</small>
            </button>
          ))}
        </div>
        <label className="busca">
          <Search size={16} />
          <input placeholder="Buscar lançamento" value={busca} onChange={(e) => setBusca(e.target.value)} />
          {busca && (
            <button type="button" className="busca__limpar" onClick={() => setBusca('')} aria-label="Limpar busca">
              <X size={14} />
            </button>
          )}
        </label>
      </div>

      {porDia.length === 0 &&
        (carregando ? (
          <p className="vazio">Carregando…</p>
        ) : (
          <div className="painel">
            {lancamentos.length === 0 ? (
              <Vazio tipo="lista" titulo="Mês em branco" texto="Nenhum lançamento neste mês. Toque no + para criar o primeiro." />
            ) : (
              <Vazio tipo="lista" titulo="Nada encontrado" texto="Nenhum lançamento bate com esse filtro ou busca." />
            )}
          </div>
        ))}

      <div className="dias">
        {porDia.map(([dia, itens], i) => {
          const saldoDia = itens.reduce((s, l) => s + (l.tipo === 'entrada' ? l.valor : -l.valor), 0)
          const d = parseISO(dia)
          return (
            <section key={dia} className="dia painel entra" style={{ '--i': Math.min(i + 2, 8) } as React.CSSProperties}>
              <div className="dia__topo">
                <span className="dia__num">
                  <b>{d.getDate()}</b>
                  {d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                </span>
                <h2>{rotuloDia(dia, hoje)}</h2>
                <Valor valor={saldoDia} sinal={saldoDia >= 0 ? 'entrada' : 'saida'} className="dia__saldo" />
              </div>
              <ul className="lista">
                {itens.map((l) => (
                  <ItemLancamento key={l.id} l={l} onAbrir={setAberto} />
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      {aberto && <FichaLancamento l={aberto} onFechar={() => setAberto(null)} />}
    </div>
  )
}
