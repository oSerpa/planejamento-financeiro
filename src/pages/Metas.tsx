import { CheckCircle2, Plus } from 'lucide-react'
import { useStore } from '../data/store'
import { dinheiro, hojeISO, mesesAte, parseISO } from '../lib/format'
import { Icone } from '../components/Icone'
import { Valor } from '../components/Valor'

function Anel({ pct, cor }: { pct: number; cor: string }) {
  const r = 26
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 64 64" className="anel" aria-hidden>
      <circle cx="32" cy="32" r={r} className="anel__fundo" />
      <circle
        cx="32"
        cy="32"
        r={r}
        stroke={cor}
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(1, pct / 100))}
        className="anel__fill"
      />
      <text x="32" y="36" textAnchor="middle" className="anel__texto">
        {Math.round(pct)}%
      </text>
    </svg>
  )
}

export function Metas() {
  const { metas } = useStore()
  const guardado = metas.reduce((s, m) => s + m.guardado, 0)
  const alvo = metas.reduce((s, m) => s + m.alvo, 0)

  return (
    <div className="pagina">
      <header className="cabecalho cabecalho--linha">
        <div>
          <p className="cabecalho__sup">Guardado no total</p>
          <h1 className="cabecalho__titulo">
            <Valor valor={guardado} />
          </h1>
          <p className="cabecalho__sub">de {dinheiro(alvo)} somando todas as metas</p>
        </div>
        <button className="btn btn--contorno">
          <Plus size={18} /> Nova meta
        </button>
      </header>

      <div className="metas">
        {metas.map((m) => {
          const pct = (m.guardado / m.alvo) * 100
          const falta = Math.max(0, m.alvo - m.guardado)
          const meses = mesesAte(m.prazo, hojeISO())
          const concluida = falta === 0
          return (
            <article key={m.id} className={`cartao meta ${concluida ? 'meta--ok' : ''}`}>
              <div className="meta__topo">
                <span className="meta__icone" style={{ color: m.cor, background: `${m.cor}1f` }}>
                  <Icone nome={m.icone} size={20} />
                </span>
                <div className="meta__titulo">
                  <h2>{m.nome}</h2>
                  <span className="meta__prazo">
                    até{' '}
                    {parseISO(m.prazo).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <Anel pct={pct} cor={m.cor} />
              </div>

              <div className="meta__valores">
                <Valor valor={m.guardado} className="meta__guardado" />
                <span className="meta__alvo">de {dinheiro(m.alvo)}</span>
              </div>

              {concluida ? (
                <p className="meta__dica meta__dica--ok">
                  <CheckCircle2 size={16} /> Meta batida. Boa!
                </p>
              ) : (
                <p className="meta__dica">
                  Faltam <strong>{dinheiro(falta)}</strong>
                  {meses > 0 && (
                    <>
                      {' '}
                      · guardando <strong>{dinheiro(Math.ceil(falta / meses))}</strong> por mês você chega lá
                    </>
                  )}
                </p>
              )}

              {!concluida && (
                <div className="meta__acoes">
                  <button className="btn btn--suave">Guardar</button>
                  <button className="btn btn--fantasma">Retirar</button>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
