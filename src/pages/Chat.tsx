import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowDownLeft, ArrowUp, ArrowUpRight, CalendarClock, Check, ChevronRight, CreditCard, Layers, Repeat, RotateCcw, Settings, Sparkles, Tag, Undo2 } from 'lucide-react'
import { useAuth } from '../data/auth'
import { useStore } from '../data/store'
import { useChat, type ItemSalvo, type Mensagem, type Orcamento } from '../data/chat'
import { EXEMPLOS } from '../lib/interpretar'
import { diaRelativo, hojeISO, nomeMes, parseISO } from '../lib/format'
import { nivelOrcamento, somar } from '../lib/financas'
import { Valor } from '../components/Valor'
import { Icone } from '../components/Icone'

const semCategoria = { nome: 'Sem categoria', cor: '#8A928C', icone: 'circle' }

export function Chat() {
  const { lancamentos, mes, demo } = useStore()
  const { nome } = useAuth()
  const { mensagens, pensando, enviar } = useChat()
  const [texto, setTexto] = useState('')
  const fim = useRef<HTMLDivElement>(null)
  const campo = useRef<HTMLInputElement>(null)

  const entradas = lancamentos.filter((l) => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0)
  const saidas = lancamentos.filter((l) => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0)

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: mensagens.length ? 'smooth' : 'auto', block: 'end' })
  }, [mensagens.length, pensando])

  function mandar(e?: FormEvent, t = texto) {
    e?.preventDefault()
    if (!t.trim()) return
    enviar(t)
    setTexto('')
    campo.current?.focus()
  }

  return (
    <div className="pagina chat">
      <header className="topo">
        <span className="topo__avatar" aria-hidden>
          <Sparkles size={19} />
        </span>
        <div className="topo__texto">
          <p className="topo__sup">
            {nome ? `Oi, ${nome}` : 'Oi'}
            {demo && <span className="selo-demo">demo</span>}
          </p>
          <h1 className="topo__titulo">O que entrou ou saiu?</h1>
        </div>
        <Link to="/ajustes" className="btn-icone chat__ajustes" aria-label="Ajustes">
          <Settings size={20} />
        </Link>
      </header>

      <Link to="/resumo" className="chat__resumo">
        <span className="chat__resumo-texto">
          <span className="chat__resumo-rotulo">Sobrou em {nomeMes(`${mes}-01`).split(' de ')[0]}</span>
          <Valor valor={entradas - saidas} className="chat__resumo-valor" />
        </span>
        <span className="chat__resumo-pares">
          <span>
            <ArrowDownLeft size={13} strokeWidth={2.4} className="cor-entrada" /> <Valor valor={entradas} />
          </span>
          <span>
            <ArrowUpRight size={13} strokeWidth={2.4} className="cor-saida" /> <Valor valor={saidas} />
          </span>
        </span>
        <ChevronRight size={18} className="chat__resumo-seta" />
      </Link>

      <div className="conversa" aria-live="polite">
        <div className="bolha bolha--bot">
          <p>
            Me conta o que você gastou ou recebeu, do jeito que falaria. Eu anoto, escolho a categoria e você corrige se eu
            errar.
          </p>
          {mensagens.length === 0 && <Dicas dicas={EXEMPLOS} onEscolher={(d) => mandar(undefined, d)} />}
        </div>

        {mensagens.map((m) => (
          <Balao key={m.id} m={m} onDica={(d) => mandar(undefined, d)} />
        ))}

        {pensando && (
          <div className="bolha bolha--bot bolha--pensando" aria-label="Salvando">
            <span />
            <span />
            <span />
          </div>
        )}
        <div ref={fim} />
      </div>

      <form className="compositor" onSubmit={mandar}>
        <input
          ref={campo}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="gastei 35 no ifood"
          aria-label="Escreva um lançamento"
          enterKeyHint="send"
          autoComplete="off"
        />
        <button type="submit" className="compositor__enviar" disabled={!texto.trim() || pensando} aria-label="Enviar">
          <ArrowUp size={20} strokeWidth={2.5} />
        </button>
      </form>
    </div>
  )
}

function Dicas({ dicas, onEscolher }: { dicas: string[]; onEscolher: (d: string) => void }) {
  return (
    <div className="dicas">
      {dicas.map((d) => (
        <button key={d} type="button" className="dica" onClick={() => onEscolher(d)}>
          {d}
        </button>
      ))}
    </div>
  )
}

function Balao({ m, onDica }: { m: Mensagem; onDica: (d: string) => void }) {
  if (m.de === 'eu') return <div className="bolha bolha--eu">{m.texto}</div>
  if (m.tipo === 'texto')
    return (
      <div className="bolha bolha--bot">
        <p>{m.texto}</p>
        {m.dicas && <Dicas dicas={m.dicas} onEscolher={onDica} />}
      </div>
    )
  if (m.tipo === 'resumo') {
    const sobra = m.entradas - m.saidas
    return (
      <div className="bolha bolha--bot">
        <p>
          Em {nomeMes(`${m.mes}-01`)} foram {m.qtd} lançamentos. Entrou <Valor valor={m.entradas} sinal="entrada" />, saiu{' '}
          <Valor valor={m.saidas} sinal="saida" /> e {sobra >= 0 ? 'sobrou' : 'faltou'} <strong><Valor valor={Math.abs(sobra)} /></strong>.
        </p>
        <Link to="/resumo" className="link">
          Ver o resumo completo
        </Link>
      </div>
    )
  }
  if (m.tipo === 'orcamentos')
    return (
      <div className="bolha bolha--bot bolha--recibo">
        <p>{m.salvo ? 'Orçamento salvo. Te aviso quando chegar em 80% e quando passar.' : `Seus orçamentos em ${nomeMes(`${m.mes}-01`).split(' de ')[0]}:`}</p>
        {m.itens.map((o) => (
          <LinhaOrc key={o.categoriaId} categoriaId={o.categoriaId} o={o} />
        ))}
      </div>
    )
  if (m.tipo === 'faturas') return <Faturas itens={m.itens} />
  const ativos = m.itens.filter((i) => !i.desfeito).length
  return (
    <div className="bolha bolha--bot bolha--recibo">
      <p>
        {ativos === 0 ? 'Desfeito, não ficou nada salvo.' : m.itens.length > 1 ? `Anotei ${m.itens.length} lançamentos.` : 'Anotado.'}
      </p>
      {m.itens.map((it, i) => (
        <Recibo key={i} it={it} msgId={m.id} idx={i} />
      ))}
    </div>
  )
}

function Recibo({ it, msgId, idx }: { it: ItemSalvo; msgId: string; idx: number }) {
  const { categoria, categorias, cartao: acharCartao } = useStore()
  const { trocarCategoria, desfazer, refazer } = useChat()
  const [trocando, setTrocando] = useState(it.origem === 'padrao' && !it.aprendeu)
  const l = it.lanc
  const cat = categoria(l.categoriaId) ?? semCategoria
  const cartao = acharCartao(l.cartaoId)
  const grupos = (['saida', 'entrada'] as const).map((t) => ({ t, cats: categorias.filter((c) => c.tipo === t) }))

  return (
    <div className={`recibo ${it.desfeito ? 'recibo--desfeito' : ''}`}>
      <div className="recibo__linha">
        <span className="item__icone" style={{ color: cat.cor, background: `${cat.cor}1f` }}>
          <Icone nome={cat.icone} size={18} />
        </span>
        <span className="item__texto">
          <span className="item__desc">{l.descricao}</span>
          <span className="item__meta">
            {l.tipo === 'entrada' ? 'Entrada' : 'Saída'} · {cat.nome} · {l.id ? diaRelativo(l.data, hojeISO()) : 'ainda não lançou'}
            {cartao && <> · {cartao.nome}</>}
          </span>
        </span>
        <Valor valor={l.valor} sinal={l.tipo} className="item__valor" />
      </div>

      {!it.desfeito && <Repeticao it={it} />}
      {!it.desfeito && it.orcamento && <AvisoOrcamento nome={cat.nome} o={it.orcamento} />}

      {it.desfeito ? (
        <div className="recibo__acoes">
          <button type="button" className="recibo__btn" onClick={() => refazer(msgId, idx)}>
            <RotateCcw size={14} /> Salvar de novo
          </button>
        </div>
      ) : (
        <>
          {it.origem === 'padrao' && !it.aprendeu && (
            <p className="recibo__nota">Não reconheci a categoria. Escolhe a certa que eu aprendo pra próxima vez.</p>
          )}
          {it.aprendeu && (
            <p className="recibo__nota recibo__nota--ok">
              <Check size={14} /> Aprendi: “{l.descricao}” agora é {it.aprendeu}.
            </p>
          )}
          {trocando && (
            <div className="recibo__cats">
              {grupos.map(({ t, cats }) => (
                <div key={t} className="recibo__grupo">
                  <span className="recibo__grupo-rotulo">{t === 'saida' ? 'Saída' : 'Entrada'}</span>
                  {cats.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`chip-cat ${c.id === l.categoriaId ? 'chip-cat--ativa' : ''}`}
                      style={{ '--c': c.cor } as React.CSSProperties}
                      onClick={() => {
                        setTrocando(false)
                        if (c.id !== l.categoriaId) trocarCategoria(msgId, idx, c)
                      }}
                    >
                      <Icone nome={c.icone} size={14} /> {c.nome}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
          <div className="recibo__acoes">
            <button type="button" className="recibo__btn" onClick={() => setTrocando((v) => !v)} aria-expanded={trocando}>
              <Tag size={14} /> {trocando ? 'Fechar' : 'Trocar categoria'}
            </button>
            <button type="button" className="recibo__btn recibo__btn--perigo" onClick={() => desfazer(msgId, idx)}>
              <Undo2 size={14} /> Desfazer
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/** Linha extra no cartão: "Todo mês, dia 23" ou "10x de R$ 200". */
function Repeticao({ it }: { it: ItemSalvo }) {
  const r = it.repeticao
  if (!r || r.tipo === 'unica') return null
  if (r.tipo === 'parcelado') {
    const ls = it.lancado?.lancamentos ?? []
    const ultima = [...ls].sort((a, b) => b.data.localeCompare(a.data))[0]
    return (
      <p className="recibo__extra">
        <Layers size={14} /> {r.parcelas}x de <Valor valor={it.lanc.valor} />, total <Valor valor={somar(ls)} />
        {ultima && <> · última em {parseISO(ultima.data).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '')}</>}
      </p>
    )
  }
  const proxima = it.lanc.id ? null : parseISO(it.lanc.data).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
  return (
    <p className="recibo__extra">
      <Repeat size={14} /> Todo mês, dia {r.dia}
      {proxima && (
        <>
          {' '}
          · <CalendarClock size={14} /> começa em {proxima}
        </>
      )}
    </p>
  )
}

function AvisoOrcamento({ nome, o }: { nome: string; o: Orcamento }) {
  const nivel = nivelOrcamento(o.gasto, o.limite)
  const pct = Math.round((o.gasto / o.limite) * 100)
  return (
    <div className={`orc-aviso orc-aviso--${nivel}`}>
      <div className="orc-aviso__linha">
        {nivel !== 'ok' && <AlertTriangle size={14} />}
        <span>
          {nivel === 'estourou' ? (
            <>
              Passou do orçamento de {nome} em <Valor valor={o.gasto - o.limite} />
            </>
          ) : nivel === 'atencao' ? (
            <>Chegou em {pct}% do orçamento de {nome}</>
          ) : (
            <>Orçamento de {nome}</>
          )}
        </span>
        <span className="orc-aviso__num">
          <Valor valor={o.gasto} /> / <Valor valor={o.limite} />
        </span>
      </div>
      <span className="orc-barra">
        <span style={{ width: `${Math.min(100, pct)}%` }} />
      </span>
    </div>
  )
}

function LinhaOrc({ categoriaId, o }: { categoriaId: string; o: Orcamento }) {
  const c = useStore().categoria(categoriaId)
  if (!c) return null
  return (
    <div className="recibo">
      <div className="recibo__linha">
        <span className="item__icone" style={{ color: c.cor, background: `${c.cor}1f` }}>
          <Icone nome={c.icone} size={18} />
        </span>
        <span className="item__texto">
          <span className="item__desc">{c.nome}</span>
          <span className="item__meta">
            {o.gasto > o.limite ? 'Passou' : 'Restam'} <Valor valor={Math.abs(o.limite - o.gasto)} />
          </span>
        </span>
        <span className="item__valor">{Math.round((o.gasto / o.limite) * 100)}%</span>
      </div>
      <AvisoOrcamento nome={c.nome} o={o} />
    </div>
  )
}

function Faturas({ itens }: { itens: { cartaoId: string; mes: string; total: number; disponivel: number }[] }) {
  const { cartao } = useStore()
  return (
    <div className="bolha bolha--bot bolha--recibo">
      <p>Faturas abertas agora:</p>
      {itens.map((f) => {
        const c = cartao(f.cartaoId)
        if (!c) return null
        return (
          <div key={f.cartaoId} className="recibo">
            <div className="recibo__linha">
              <span className="item__icone" style={{ color: c.cor, background: `${c.cor}1f` }}>
                <CreditCard size={18} strokeWidth={1.75} />
              </span>
              <span className="item__texto">
                <span className="item__desc">{c.nome}</span>
                <span className="item__meta">
                  vence {c.vencimento}/{f.mes.slice(5)} · livre <Valor valor={f.disponivel} />
                </span>
              </span>
              <Valor valor={f.total} className="item__valor" />
            </div>
          </div>
        )
      })}
      <Link to="/cartoes" className="link">
        Abrir cartões
      </Link>
    </div>
  )
}
