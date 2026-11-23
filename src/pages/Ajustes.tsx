import { useState, type FormEvent } from 'react'
import { LogOut, Plus, Repeat, Trash2, X } from 'lucide-react'
import { useChat } from '../data/chat'
import { useAuth } from '../data/auth'
import { useStore } from '../data/store'
import type { TipoLancamento } from '../data/types'
import { Icone, nomesIcones } from '../components/Icone'
import { Cabecalho } from '../components/Cabecalho'
import { Valor } from '../components/Valor'
import { proximaData } from '../lib/financas'
import { hojeISO, parseISO } from '../lib/format'

const cores = ['#3F7D58', '#6B8F3A', '#C2553A', '#D08A2E', '#C99A2E', '#4E6E8E', '#5A6BB0', '#8C5A9E', '#3E8E8A', '#9A6B4F']

export function Ajustes() {
  const { categorias, criarCategoria, removerCategoria, demo, recorrencias, pararRecorrencia, cartao } = useStore()
  const [parando, setParando] = useState<string | null>(null)
  const { sessao, sair } = useAuth()
  const { aprendidas, esquecer } = useChat()
  const palavras = Object.entries(aprendidas).sort(([a], [b]) => a.localeCompare(b))
  const [tipo, setTipo] = useState<TipoLancamento>('saida')
  const [nome, setNome] = useState('')
  const [cor, setCor] = useState(cores[2])
  const [icone, setIcone] = useState('cart')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function tentar(acao: () => Promise<void>) {
    setOcupado(true)
    setErro(null)
    try {
      await acao()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Algo deu errado.')
    }
    setOcupado(false)
  }

  function criar(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    tentar(async () => {
      await criarCategoria({ nome: nome.trim(), tipo, cor, icone })
      setNome('')
    })
  }

  const lista = categorias.filter((c) => c.tipo === tipo)

  return (
    <div className="pagina pagina--v2">
      <Cabecalho sup="Ajustes" titulo="Categorias e conta" />

      <section className="painel ajustes entra">
        <div className="painel__topo">
          <h2 className="painel__titulo">Categorias</h2>
          <span className="painel__extra">{lista.length} de {tipo === 'saida' ? 'saída' : 'entrada'}</span>
        </div>
        <div className="segmento segmento--deslizante" data-tipo={tipo}>
          <span className="segmento__marca" aria-hidden />
          <button type="button" className={tipo === 'saida' ? 'ativo' : ''} onClick={() => setTipo('saida')}>
            Saídas
          </button>
          <button type="button" className={tipo === 'entrada' ? 'ativo' : ''} onClick={() => setTipo('entrada')}>
            Entradas
          </button>
        </div>

        <ul className="lista cats-ajuste">
          {lista.map((c) => (
            <li key={c.id} className="item">
              <span className="item__icone" style={{ color: c.cor, background: `${c.cor}1f` }}>
                <Icone nome={c.icone} size={18} />
              </span>
              <span className="item__texto">
                <span className="item__desc">{c.nome}</span>
              </span>
              <button
                className="btn-icone"
                aria-label={`Apagar ${c.nome}`}
                disabled={ocupado}
                onClick={() => tentar(() => removerCategoria(c.id))}
              >
                <Trash2 size={17} />
              </button>
            </li>
          ))}
          {lista.length === 0 && <p className="vazio vazio--curto">Nenhuma categoria aqui ainda.</p>}
        </ul>

        <form className="nova-cat" onSubmit={criar}>
          <p className="nova-cat__titulo">
            <span className="nova-cat__previa" style={{ color: cor, background: `${cor}1f` }}>
              <Icone nome={icone} size={18} />
            </span>
            {nome.trim() || 'Nova categoria'}
          </p>
          <label className="campo">
            <span className="campo__rotulo">Nome da categoria de {tipo === 'saida' ? 'saída' : 'entrada'}</span>
            <input value={nome} maxLength={40} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Pets" />
          </label>
          <div className="campo">
            <span className="campo__rotulo">Cor</span>
            <div className="cores">
              {cores.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`cor ${cor === c ? 'cor--ativa' : ''}`}
                  style={{ background: c }}
                  onClick={() => setCor(c)}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          </div>
          <div className="campo">
            <span className="campo__rotulo">Ícone</span>
            <div className="icones">
              {nomesIcones.map((n) => (
                <button
                  type="button"
                  key={n}
                  className={`icone-op ${icone === n ? 'icone-op--ativo' : ''}`}
                  style={{ '--cor': cor } as React.CSSProperties}
                  onClick={() => setIcone(n)}
                  aria-label={n}
                >
                  <Icone nome={n} size={18} />
                </button>
              ))}
            </div>
          </div>
          {erro && <p className="alerta alerta--erro">{erro}</p>}
          <button className="btn btn--suave" disabled={ocupado || !nome.trim()}>
            <Plus size={18} /> Adicionar categoria
          </button>
        </form>
      </section>

      <section className="painel ajustes entra" style={{ '--i': 1 } as React.CSSProperties}>
        <div className="painel__topo">
          <h2 className="painel__titulo">Recorrentes</h2>
          <span className="painel__extra">{recorrencias.length}</span>
        </div>
        {recorrencias.length === 0 ? (
          <p className="conta__email">
            Contas fixas e assinaturas que lançam sozinhas todo mês. Crie pelo chat ("netflix 55 todo mês") ou marcando "Todo mês" no novo lançamento.
          </p>
        ) : (
          <ul className="lista cats-ajuste">
            {recorrencias.map((r) => {
              const c = categorias.find((x) => x.id === r.categoriaId)
              const prox = parseISO(proximaData(r, hojeISO())).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')
              const k = cartao(r.cartaoId)
              return (
                <li key={r.id} className="item">
                  <span className="item__icone" style={{ color: c?.cor, background: `${c?.cor ?? '#8A928C'}1f` }}>
                    {c ? <Icone nome={c.icone} size={18} /> : <Repeat size={18} />}
                  </span>
                  <span className="item__texto">
                    <span className="item__desc">{r.descricao}</span>
                    <span className="item__meta">
                      todo dia {r.dia} · próximo {prox}
                      {k && <> · {k.nome}</>}
                    </span>
                  </span>
                  <Valor valor={r.valor} sinal={r.tipo} className="item__valor" />
                  <button
                    className={`btn-icone ${parando === r.id ? 'btn-icone--perigo' : ''}`}
                    aria-label={parando === r.id ? `Confirmar parar ${r.descricao}` : `Parar ${r.descricao}`}
                    title={parando === r.id ? 'Toque de novo para parar' : 'Parar de lançar'}
                    disabled={ocupado}
                    onClick={() => (parando === r.id ? tentar(() => pararRecorrencia(r.id)).then(() => setParando(null)) : setParando(r.id))}
                  >
                    {parando === r.id ? <Trash2 size={17} /> : <X size={17} />}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {recorrencias.length > 0 && <p className="campo__ajuda">Parar não apaga o que já foi lançado.</p>}
      </section>

      <section className="painel ajustes entra" style={{ '--i': 2 } as React.CSSProperties}>
        <div className="painel__topo">
          <h2 className="painel__titulo">Palavras que o chat aprendeu</h2>
          <span className="painel__extra">{palavras.length}</span>
        </div>
        {palavras.length === 0 ? (
          <p className="conta__email">
            Quando você troca a categoria de um lançamento no chat, a palavra fica guardada aqui e da próxima vez ele já acerta.
          </p>
        ) : (
          <ul className="aprendidas">
            {palavras.map(([w, id]) => {
              const c = categorias.find((x) => x.id === id)
              return (
                <li key={w} className="aprendida">
                  <span className="aprendida__palavra">{w}</span>
                  <span className="aprendida__cat" style={{ color: c?.cor }}>
                    {c && <Icone nome={c.icone} size={14} />} {c?.nome ?? 'Categoria apagada'}
                  </span>
                  <button type="button" className="btn-icone" onClick={() => esquecer(w)} aria-label={`Esquecer ${w}`}>
                    <X size={16} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {demo ? (
        <section className="painel ajustes conta entra" style={{ '--i': 3 } as React.CSSProperties}>
          <div>
            <span className="rotulo">Modo demonstração</span>
            <p className="conta__email">
              Os dados são de exemplo e somem ao recarregar. Para salvar de verdade, ligue o Supabase seguindo o README.
            </p>
          </div>
        </section>
      ) : (
        <section className="painel ajustes conta entra" style={{ '--i': 3 } as React.CSSProperties}>
          <div>
            <span className="rotulo">Conta</span>
            <p className="conta__email">{sessao?.user.email}</p>
          </div>
          <button className="btn btn--contorno" onClick={sair}>
            <LogOut size={17} /> Sair
          </button>
        </section>
      )}
    </div>
  )
}
