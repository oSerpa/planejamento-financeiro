import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../data/store'
import { lerValor, valorParaCampo } from '../lib/format'
import { Icone } from './Icone'

/** Folha para definir o limite mensal de cada categoria de saída. Campo vazio tira o orçamento. */
export function EditarOrcamentos({ onFechar }: { onFechar: () => void }) {
  const { categorias, definirLimite } = useStore()
  const cats = categorias.filter((c) => c.tipo === 'saida')
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(cats.map((c) => [c.id, c.limite ? valorParaCampo(c.limite).replace(',00', '') : ''])),
  )
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro(null)
    try {
      for (const c of cats) {
        const n = lerValor(valores[c.id] ?? '')
        const novo = n > 0 ? Math.round(n * 100) / 100 : null
        if (novo !== c.limite) await definirLimite(c.id, novo)
      }
      onFechar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não deu para salvar.')
      setSalvando(false)
    }
  }

  return (
    <div className="sheet-fundo" onClick={onFechar}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={salvar}>
        <div className="sheet__alca" />
        <div className="sheet__topo">
          <h2>Orçamento por mês</h2>
          <button type="button" className="btn-icone" onClick={onFechar} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>
        <p className="campo__ajuda">Quanto você quer gastar no máximo em cada categoria por mês. Deixe em branco para não ter limite.</p>
        <ul className="orc-form">
          {cats.map((c) => (
            <li key={c.id}>
              <span className="item__icone" style={{ color: c.cor, background: `${c.cor}1f` }}>
                <Icone nome={c.icone} size={18} />
              </span>
              <span className="orc-form__nome">{c.nome}</span>
              <label className="orc-form__campo">
                <span>R$</span>
                <input
                  inputMode="decimal"
                  placeholder="sem limite"
                  value={valores[c.id] ?? ''}
                  onChange={(e) => setValores((v) => ({ ...v, [c.id]: e.target.value.replace(/[^\d.,]/g, '') }))}
                  aria-label={`Limite de ${c.nome}`}
                />
              </label>
            </li>
          ))}
        </ul>
        {erro && <p className="alerta alerta--erro">{erro}</p>}
        <button className="btn btn--primario btn--largo" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar orçamento'}
        </button>
      </form>
    </div>
  )
}
