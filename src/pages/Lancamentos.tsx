import { useEffect, useState } from 'react'
import { Download, Search, SlidersHorizontal, X } from 'lucide-react'
import { useStore } from '../data/store'
import type { Lancamento, TipoLancamento } from '../data/types'
import { diaRelativo, hojeISO, isoDeslocado, lerValor, mesDe, nomeMes, parseISO, somarMes } from '../lib/format'
import { baixar, paraCSV } from '../lib/financas'
import { Icone } from '../components/Icone'
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

type Periodo = 'mes' | '3m' | 'ano' | 'livre'
const nomesPeriodo: Record<Periodo, string> = { mes: 'Mês', '3m': '3 meses', ano: 'Este ano', livre: 'Escolher' }

/** Faixa de datas [inicio, fim) do período escolhido. */
function faixa(p: Periodo, mes: string, de: string, ate: string, hoje: string): [string, string] {
  if (p === '3m') return [`${somarMes(mesDe(hoje), -2)}-01`, `${somarMes(mesDe(hoje), 1)}-01`]
  if (p === 'ano') return [`${hoje.slice(0, 4)}-01-01`, `${Number(hoje.slice(0, 4)) + 1}-01-01`]
  if (p === 'livre' && de && ate && de <= ate) return [de, isoDeslocado(ate, 1)]
  return [`${mes}-01`, `${somarMes(mes, 1)}-01`]
}
const dataCurta = (iso: string) => parseISO(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')

export function Lancamentos() {
  const { lancamentos: doMes, todos, carregando, erro, mes, categorias, cartoes, carregarPeriodo } = useStore()
  const [aberto, setAberto] = useState<Lancamento | null>(null)
  const hoje = hojeISO()
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busca, setBusca] = useState('')
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [de, setDe] = useState(`${mesDe(hoje)}-01`)
  const [ate, setAte] = useState(hoje)
  const [painel, setPainel] = useState(false)
  const [cats, setCats] = useState<string[]>([])
  const [pagamento, setPagamento] = useState<string>('todos')
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [erroPeriodo, setErroPeriodo] = useState<string | null>(null)

  const [ini, fim] = faixa(periodo, mes, de, ate, hoje)
  useEffect(() => {
    if (periodo === 'mes') return
    let ativo = true
    setBuscando(true)
    setErroPeriodo(null)
    carregarPeriodo(ini, fim)
      .catch((e) => ativo && setErroPeriodo(e instanceof Error ? e.message : String(e)))
      .finally(() => ativo && setBuscando(false))
    return () => {
      ativo = false
    }
  }, [periodo, ini, fim, carregarPeriodo])

  const lancamentos = periodo === 'mes' ? doMes : todos.filter((l) => l.data >= ini && l.data < fim)

  const termo = busca.trim().toLowerCase()
  const vMin = min ? lerValor(min) : 0
  const vMax = max ? lerValor(max) : Infinity
  const extras = (cats.length ? 1 : 0) + (pagamento !== 'todos' ? 1 : 0) + (min || max ? 1 : 0)
  const passa = (l: Lancamento) =>
    (cats.length === 0 || cats.includes(l.categoriaId)) &&
    (pagamento === 'todos' || (pagamento === 'sem' ? !l.cartaoId : l.cartaoId === pagamento)) &&
    l.valor >= vMin &&
    l.valor <= vMax
  const base = lancamentos.filter(passa)
  const filtrados = base.filter((l) => (filtro === 'todos' || l.tipo === filtro) && l.descricao.toLowerCase().includes(termo))

  function limparFiltros() {
    setCats([])
    setPagamento('todos')
    setMin('')
    setMax('')
  }

  function exportar() {
    const nome = periodo === 'mes' ? mes : `${ini}_a_${isoDeslocado(fim, -1)}`
    baixar(`extrato-${nome}.csv`, paraCSV(filtrados, categorias, cartoes))
  }

  const grupos = new Map<string, Lancamento[]>()
  for (const l of [...filtrados].sort((a, b) => b.data.localeCompare(a.data))) {
    grupos.set(l.data, [...(grupos.get(l.data) ?? []), l])
  }
  const porDia = [...grupos.entries()]

  const total = (t: TipoLancamento) => base.filter((l) => l.tipo === t).reduce((s, l) => s + l.valor, 0)
  const contagem = (f: Filtro) => (f === 'todos' ? base.length : base.filter((l) => l.tipo === f).length)
  const [nomeDoMes, ano] = nomeMes(`${mes}-01`).split(' de ')
  const tituloPeriodo =
    periodo === 'mes' ? (
      <>
        {nomeDoMes} <span>{ano}</span>
      </>
    ) : periodo === 'ano' ? (
      <>
        Ano <span>{hoje.slice(0, 4)}</span>
      </>
    ) : (
      <>
        {dataCurta(ini)} <span>a {dataCurta(isoDeslocado(fim, -1))}</span>
      </>
    )

  return (
    <div className="pagina pagina--v2">
      <Cabecalho sup="Extrato" titulo={tituloPeriodo}>
        <div className="topo__acoes">
          <button type="button" className="btn-icone" onClick={exportar} disabled={filtrados.length === 0} aria-label="Exportar CSV" title="Exportar CSV">
            <Download size={18} />
          </button>
          {periodo === 'mes' && <SeletorMes compacto />}
        </div>
      </Cabecalho>

      {(erro || erroPeriodo) && <p className="alerta alerta--erro">Não deu para carregar: {erro ?? erroPeriodo}</p>}

      <div className="periodos entra" role="tablist" aria-label="Período">
        {(Object.keys(nomesPeriodo) as Periodo[]).map((p) => (
          <button key={p} type="button" role="tab" aria-selected={periodo === p} className={`data-op ${periodo === p ? 'data-op--ativa' : ''}`} onClick={() => setPeriodo(p)}>
            {nomesPeriodo[p]}
          </button>
        ))}
        <button type="button" className={`data-op filtros-btn ${painel || extras ? 'data-op--ativa' : ''}`} onClick={() => setPainel((v) => !v)} aria-expanded={painel}>
          <SlidersHorizontal size={14} /> Filtros{extras > 0 && <small>{extras}</small>}
        </button>
      </div>

      {periodo === 'livre' && (
        <div className="periodo-livre entra">
          <label className="campo">
            <span className="campo__rotulo">De</span>
            <input type="date" value={de} max={ate} onChange={(e) => setDe(e.target.value)} />
          </label>
          <label className="campo">
            <span className="campo__rotulo">Até</span>
            <input type="date" value={ate} min={de} onChange={(e) => setAte(e.target.value)} />
          </label>
        </div>
      )}

      {painel && (
        <section className="painel filtros-painel entra">
          <div className="campo">
            <span className="campo__rotulo">Categorias</span>
            <div className="recibo__grupo">
              {categorias.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`chip-cat ${cats.includes(c.id) ? 'chip-cat--ativa' : ''}`}
                  style={{ '--c': c.cor } as React.CSSProperties}
                  aria-pressed={cats.includes(c.id)}
                  onClick={() => setCats((a) => (a.includes(c.id) ? a.filter((x) => x !== c.id) : [...a, c.id]))}
                >
                  <Icone nome={c.icone} size={14} /> {c.nome}
                </button>
              ))}
            </div>
          </div>
          {cartoes.length > 0 && (
            <div className="campo">
              <span className="campo__rotulo">Pagamento</span>
              <div className="datas">
                {[['todos', 'Todos'], ['sem', 'Fora do cartão'], ...cartoes.map((c) => [c.id, c.nome])].map(([id, nome]) => (
                  <button key={id} type="button" className={`data-op ${pagamento === id ? 'data-op--ativa' : ''}`} onClick={() => setPagamento(id)}>
                    {nome}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="campo-duplo">
            <label className="campo">
              <span className="campo__rotulo">Valor mínimo</span>
              <input inputMode="decimal" placeholder="R$ 0" value={min} onChange={(e) => setMin(e.target.value.replace(/[^\d.,]/g, ''))} />
            </label>
            <label className="campo">
              <span className="campo__rotulo">Valor máximo</span>
              <input inputMode="decimal" placeholder="sem limite" value={max} onChange={(e) => setMax(e.target.value.replace(/[^\d.,]/g, ''))} />
            </label>
          </div>
          {extras > 0 && (
            <button type="button" className="btn btn--fantasma" onClick={limparFiltros}>
              <X size={16} /> Limpar filtros
            </button>
          )}
        </section>
      )}

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
        (carregando || buscando ? (
          <p className="vazio">Carregando…</p>
        ) : (
          <div className="painel">
            {lancamentos.length === 0 ? (
              <Vazio
                tipo="lista"
                titulo={periodo === 'mes' ? 'Mês em branco' : 'Período em branco'}
                texto={periodo === 'mes' ? 'Nenhum lançamento neste mês. Toque no + para criar o primeiro.' : 'Nenhum lançamento nesse período.'}
              />
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
