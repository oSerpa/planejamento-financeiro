import { Link } from 'react-router-dom'
import { ArrowDownLeft, ArrowUpRight, CalendarDays, ChevronRight, Flame, PiggyBank, Plus, Tags, Minus } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../data/auth'
import { useStore } from '../data/store'
import type { Lancamento, TipoLancamento } from '../data/types'
import { hojeISO, mesDe, nomeMes, parseISO } from '../lib/format'
import { Valor } from '../components/Valor'
import { ItemLancamento } from '../components/ItemLancamento'
import { NovoLancamento } from '../components/NovoLancamento'
import { SeletorMes } from '../components/SeletorMes'
import { Icone } from '../components/Icone'
import { useContagem } from '../lib/useContagem'
import { Vazio } from '../components/Vazio'
import { FichaLancamento } from '../components/DetalheLancamento'

function saudacao() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

export function Inicio() {
  const { lancamentos, metas, categorias, mes, carregando, erro, demo } = useStore()
  const { nome } = useAuth()
  const [aberto, setAberto] = useState<Lancamento | null>(null)
  const [novo, setNovo] = useState<TipoLancamento | null>(null)

  const entradas = lancamentos.filter((l) => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0)
  const saidasL = lancamentos.filter((l) => l.tipo === 'saida')
  const saidas = saidasL.reduce((s, l) => s + l.valor, 0)
  const sobra = entradas - saidas
  const saldoAnimado = useContagem(sobra)

  // dias do mês: no mês atual conta até hoje, nos passados o mês inteiro
  const hoje = hojeISO()
  const [ano, m] = mes.split('-').map(Number)
  const diasNoMes = new Date(ano, m, 0).getDate()
  const ehMesAtual = mesDe(hoje) === mes
  const diaHoje = ehMesAtual ? parseISO(hoje).getDate() : diasNoMes
  const diasRestantes = ehMesAtual ? diasNoMes - diaHoje + 1 : 0
  const porDia = diasRestantes > 0 ? Math.max(0, sobra) / diasRestantes : 0
  const mediaDia = saidas / Math.max(1, diaHoje)
  const maiorGasto = [...saidasL].sort((a, b) => b.valor - a.valor)[0]

  const porCategoria = categorias
    .filter((c) => c.tipo === 'saida')
    .map((c) => ({
      ...c,
      total: saidasL.filter((l) => l.categoriaId === c.id).reduce((s, l) => s + l.valor, 0),
      qtd: saidasL.filter((l) => l.categoriaId === c.id).length,
    }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)

  const recentes = [...lancamentos].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 5)
  const guardado = metas.reduce((s, mt) => s + mt.guardado, 0)
  const iniciais = (nome || 'c').slice(0, 1).toUpperCase()

  return (
    <div className="pagina pagina--v2">
      <header className="topo">
        <span className="topo__avatar" aria-hidden>
          {iniciais}
        </span>
        <div className="topo__texto">
          <p className="topo__sup">
            {saudacao()}
            {nome && `, ${nome}`}
            {demo && <span className="selo-demo">demo</span>}
          </p>
          <h1 className="topo__titulo">
            {nomeMes(`${mes}-01`).split(' de ')[0]} <span>{ano}</span>
          </h1>
        </div>
        <SeletorMes compacto />
      </header>

      {erro && <p className="alerta alerta--erro">Não deu para carregar: {erro}</p>}

      <div className="grade-v2">
        <section className="hero entra" style={{ '--i': 0 } as React.CSSProperties}>
          <div className="hero__linha">
            <span className="hero__rotulo">Sobrou no mês</span>
            {ehMesAtual && entradas > 0 && (
              <span className="hero__pilula">
                <CalendarDays size={13} /> {diasRestantes} {diasRestantes === 1 ? 'dia' : 'dias'} pela frente
              </span>
            )}
          </div>
          <Valor valor={saldoAnimado} className="hero__valor" />
          {ehMesAtual && entradas > 0 && (
            <p className="hero__dica">
              Dá para gastar <strong><Valor valor={porDia} /></strong> por dia até o fim do mês.
            </p>
          )}

          <div className="hero__barra" aria-label="Divisão dos gastos por categoria">
            {porCategoria.map((c) => (
              <span key={c.id} style={{ flexGrow: c.total, background: c.cor }} title={c.nome} />
            ))}
            {sobra > 0 && <span className="hero__barra-sobra" style={{ flexGrow: sobra }} title="Sobra" />}
          </div>

          <div className="hero__pares">
            <div>
              <span className="hero__mini hero__mini--entrada">
                <ArrowDownLeft size={14} strokeWidth={2.25} /> Entrou
              </span>
              <Valor valor={entradas} />
            </div>
            <div>
              <span className="hero__mini hero__mini--saida">
                <ArrowUpRight size={14} strokeWidth={2.25} /> Saiu
              </span>
              <Valor valor={saidas} />
            </div>
          </div>
        </section>

        <nav className="acoes entra" style={{ '--i': 1 } as React.CSSProperties} aria-label="Atalhos">
          <button className="acao" onClick={() => setNovo('entrada')}>
            <span className="acao__icone acao__icone--entrada">
              <Plus size={20} strokeWidth={2.25} />
            </span>
            Entrada
          </button>
          <button className="acao" onClick={() => setNovo('saida')}>
            <span className="acao__icone acao__icone--saida">
              <Minus size={20} strokeWidth={2.25} />
            </span>
            Saída
          </button>
          <Link className="acao" to="/metas">
            <span className="acao__icone acao__icone--ouro">
              <PiggyBank size={20} strokeWidth={2} />
            </span>
            Guardar
          </Link>
          <Link className="acao" to="/ajustes">
            <span className="acao__icone">
              <Tags size={19} strokeWidth={2} />
            </span>
            Categorias
          </Link>
        </nav>

        <section className="numeros entra" style={{ '--i': 2 } as React.CSSProperties}>
          <div className="numero">
            <span className="numero__rotulo">Média por dia</span>
            <Valor valor={mediaDia} className="numero__valor" />
            <span className="numero__nota">em {diaHoje} dias</span>
          </div>
          <div className="numero">
            <span className="numero__rotulo">
              <Flame size={13} /> Maior gasto
            </span>
            <Valor valor={maiorGasto?.valor ?? 0} className="numero__valor" />
            <span className="numero__nota">{maiorGasto ? maiorGasto.descricao : 'nenhum ainda'}</span>
          </div>
          <Link to="/metas" className="numero numero--link">
            <span className="numero__rotulo">
              <PiggyBank size={13} /> Guardado
            </span>
            <Valor valor={guardado} className="numero__valor" />
            <span className="numero__nota">
              em {metas.length} metas <ChevronRight size={12} />
            </span>
          </Link>
        </section>

        <section className="painel categorias-v2 entra" style={{ '--i': 3 } as React.CSSProperties}>
          <div className="painel__topo">
            <h2 className="painel__titulo">Para onde foi</h2>
            <span className="painel__extra">{porCategoria.length} categorias</span>
          </div>
          {porCategoria.length === 0 ? (
            <Vazio tipo="gastos" titulo="Nenhum gasto ainda" texto="Quando você lançar uma saída, ela aparece aqui separada por categoria." />
          ) : (
            <ul className="cats">
              {porCategoria.map((c) => {
                const pct = (c.total / saidas) * 100
                return (
                  <li key={c.id} className="cat">
                    <span className="cat__icone" style={{ color: c.cor, background: `${c.cor}1c` }}>
                      <Icone nome={c.icone} size={18} />
                    </span>
                    <div className="cat__meio">
                      <div className="cat__linha">
                        <span className="cat__nome">{c.nome}</span>
                        <Valor valor={c.total} className="cat__valor" />
                      </div>
                      <div className="cat__linha cat__linha--sub">
                        <span className="cat__trilho">
                          <span style={{ width: `${pct}%`, background: c.cor }} />
                        </span>
                        <span className="cat__pct">{Math.round(pct)}%</span>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="painel recentes-v2 entra" style={{ '--i': 4 } as React.CSSProperties}>
          <div className="painel__topo">
            <h2 className="painel__titulo">Últimos lançamentos</h2>
            <Link to="/lancamentos" className="painel__link">
              Ver todos <ChevronRight size={15} />
            </Link>
          </div>
          {recentes.length === 0 ? (
            carregando ? (
              <p className="vazio vazio--curto">Carregando…</p>
            ) : (
              <Vazio tipo="lista" titulo="Mês em branco" texto="Toque no + para lançar a primeira entrada ou saída." />
            )
          ) : (
            <ul className="lista">
              {recentes.map((l) => (
                <ItemLancamento key={l.id} l={l} onAbrir={setAberto} />
              ))}
            </ul>
          )}
        </section>

        <section className="painel metas-v2 entra" style={{ '--i': 5 } as React.CSSProperties}>
          <div className="painel__topo">
            <h2 className="painel__titulo">Metas</h2>
            <Link to="/metas" className="painel__link">
              Abrir <ChevronRight size={15} />
            </Link>
          </div>
          <ul className="metas-trilho">
            {metas.map((mt) => {
              const pct = Math.min(100, (mt.guardado / mt.alvo) * 100)
              return (
                <li key={mt.id} className="meta-mini">
                  <span className="meta-mini__icone" style={{ color: mt.cor, background: `${mt.cor}1c` }}>
                    <Icone nome={mt.icone} size={17} />
                  </span>
                  <span className="meta-mini__nome">{mt.nome}</span>
                  <span className="meta-mini__trilho">
                    <span style={{ width: `${pct}%`, background: mt.cor }} />
                  </span>
                  <span className="meta-mini__pct">
                    <Valor valor={mt.guardado} /> <small>{Math.round(pct)}%</small>
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      {aberto && <FichaLancamento l={aberto} onFechar={() => setAberto(null)} />}
      {novo && <NovoLancamento tipoInicial={novo} onFechar={() => setNovo(null)} />}
    </div>
  )
}
