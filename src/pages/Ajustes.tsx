import { useState, type FormEvent } from 'react'
import { LogOut, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../data/auth'
import { useStore } from '../data/store'
import type { TipoLancamento } from '../data/types'
import { Icone, nomesIcones } from '../components/Icone'

const cores = ['#3F7D58', '#6B8F3A', '#C2553A', '#D08A2E', '#C99A2E', '#4E6E8E', '#5A6BB0', '#8C5A9E', '#3E8E8A', '#9A6B4F']

export function Ajustes() {
  const { categorias, criarCategoria, removerCategoria } = useStore()
  const { sessao, sair } = useAuth()
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
    <div className="pagina">
      <header className="cabecalho">
        <h1 className="cabecalho__titulo">Ajustes</h1>
      </header>

      <section className="cartao ajustes">
        <div className="secao-topo">
          <h2 className="secao-titulo">Categorias</h2>
        </div>
        <div className="segmento" data-tipo={tipo}>
          <button type="button" className={tipo === 'saida' ? 'ativo' : ''} onClick={() => setTipo('saida')}>
            Saídas
          </button>
          <button type="button" className={tipo === 'entrada' ? 'ativo' : ''} onClick={() => setTipo('entrada')}>
            Entradas
          </button>
        </div>

        <ul className="lista">
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
          <label className="campo">
            <span className="campo__rotulo">Nova categoria de {tipo === 'saida' ? 'saída' : 'entrada'}</span>
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

      <section className="cartao ajustes conta">
        <div>
          <span className="rotulo">Conta</span>
          <p className="conta__email">{sessao?.user.email}</p>
        </div>
        <button className="btn btn--contorno" onClick={sair}>
          <LogOut size={17} /> Sair
        </button>
      </section>
    </div>
  )
}
