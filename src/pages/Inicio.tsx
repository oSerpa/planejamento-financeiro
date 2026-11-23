import { Link } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight, ChevronRight, PiggyBank } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../data/auth'
import { useStore } from '../data/store'
import type { Lancamento } from '../data/types'
import { nomeMes } from '../lib/format'
import { Valor } from '../components/Valor'
import { Barra } from '../components/Barra'
import { ItemLancamento } from '../components/ItemLancamento'
import { NovoLancamento } from '../components/NovoLancamento'
import { SeletorMes } from '../components/SeletorMes'

function saudacao() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

export function Inicio() {
  const { lancamentos, metas, categorias, mes, carregando, erro } = useStore()
  const { nome } = useAuth()
  const [aberto, setAberto] = useState<Lancamento | null>(null)
  const entradas = lancamentos.filter((l) => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0)
  const saidas = lancamentos.filter((l) => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0)
  const guardado = metas.reduce((s, m) => s + m.guardado, 0)

  const porCategoria = categorias
    .filter((c) => c.tipo === 'saida')
    .map((c) => ({
      ...c,
      total: lancamentos.filter((l) => l.categoriaId === c.id).reduce((s, l) => s + l.valor, 0),
    }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)
  const maior = porCategoria[0]?.total ?? 1

  const recentes = [...lancamentos].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 5)
  const pctGasto = entradas ? (saidas / entradas) * 100 : 0

  return (
    <div className="pagina">
      <header className="cabecalho cabecalho--linha">
        <div>
          <p className="cabecalho__sup">
            {saudacao()}
            {nome && `, ${nome}`}
          </p>
          <h1 className="cabecalho__titulo">
            Seu mês de <em>{nomeMes(`${mes}-01`).split(' ')[0]}</em>
          </h1>
        </div>
        <SeletorMes />
      </header>

      {erro && <p className="alerta alerta--erro">Não deu para carregar: {erro}</p>}

      <div className="grade-inicio">
        <section className="saldo">
          <p className="saldo__rotulo">Sobrou até agora</p>
          <Valor valor={entradas - saidas} className="saldo__valor" />
          <div className="saldo__trilho">
            <div className="saldo__gasto" style={{ width: `${Math.min(100, pctGasto)}%` }} />
          </div>
          <p className="saldo__nota">
            {entradas > 0
              ? `Você já usou ${Math.round(pctGasto)}% do que entrou neste mês.`
              : 'Nenhuma entrada lançada neste mês ainda.'}
          </p>
          <div className="saldo__pares">
            <div>
              <span className="saldo__mini">
                <ArrowUpRight size={14} /> Entrou
              </span>
              <Valor valor={entradas} />
            </div>
            <div>
              <span className="saldo__mini">
                <ArrowDownRight size={14} /> Saiu
              </span>
              <Valor valor={saidas} />
            </div>
          </div>
        </section>

        <Link to="/metas" className="cartao guardado">
          <span className="guardado__icone">
            <PiggyBank size={22} strokeWidth={1.75} />
          </span>
          <span className="guardado__texto">
            <span className="rotulo">Guardado nas metas</span>
            <Valor valor={guardado} className="guardado__valor" />
          </span>
          <ChevronRight size={18} className="guardado__seta" />
        </Link>

        <section className="cartao categorias">
          <h2 className="secao-titulo">Para onde foi</h2>
          {porCategoria.length === 0 && <p className="vazio vazio--curto">Nenhum gasto neste mês.</p>}
          <ul className="cat-lista">
            {porCategoria.map((c) => (
              <li key={c.id}>
                <div className="cat-lista__linha">
                  <span className="cat-lista__nome">
                    <i style={{ background: c.cor }} />
                    {c.nome}
                  </span>
                  <Valor valor={c.total} className="cat-lista__valor" />
                </div>
                <Barra pct={(c.total / maior) * 100} cor={c.cor} />
              </li>
            ))}
          </ul>
        </section>

        <section className="cartao recentes">
          <div className="secao-topo">
            <h2 className="secao-titulo">Últimos lançamentos</h2>
            <Link to="/lancamentos" className="link">
              Ver todos
            </Link>
          </div>
          {recentes.length === 0 && (
            <p className="vazio vazio--curto">{carregando ? 'Carregando…' : 'Nada lançado neste mês.'}</p>
          )}
          <ul className="lista">
            {recentes.map((l) => (
              <ItemLancamento key={l.id} l={l} onAbrir={setAberto} />
            ))}
          </ul>
        </section>
      </div>

      {aberto && <NovoLancamento lancamento={aberto} onFechar={() => setAberto(null)} />}
    </div>
  )
}
