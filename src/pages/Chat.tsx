import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownLeft, ArrowUp, ArrowUpRight, Check, ChevronRight, RotateCcw, Settings, Sparkles, Tag, Undo2 } from 'lucide-react'
import { useAuth } from '../data/auth'
import { useStore } from '../data/store'
import { useChat, type ItemSalvo, type Mensagem } from '../data/chat'
import { EXEMPLOS } from '../lib/interpretar'
import { diaRelativo, hojeISO, nomeMes } from '../lib/format'
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
  const { categoria, categorias } = useStore()
  const { trocarCategoria, desfazer, refazer } = useChat()
  const [trocando, setTrocando] = useState(it.origem === 'padrao' && !it.aprendeu)
  const l = it.lanc
  const cat = categoria(l.categoriaId) ?? semCategoria
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
            {l.tipo === 'entrada' ? 'Entrada' : 'Saída'} · {cat.nome} · {diaRelativo(l.data, hojeISO())}
          </span>
        </span>
        <Valor valor={l.valor} sinal={l.tipo} className="item__valor" />
      </div>

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
