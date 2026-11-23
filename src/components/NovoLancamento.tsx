import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, X } from 'lucide-react'
import { useStore } from '../data/store'
import type { Lancamento, TipoLancamento } from '../data/types'
import { hojeISO, lerValor, valorParaCampo } from '../lib/format'
import { Icone } from './Icone'

interface Props {
  onFechar: () => void
  /** Quando vem preenchido, a tela edita esse lançamento. */
  lancamento?: Lancamento
}

export function NovoLancamento({ onFechar, lancamento }: Props) {
  const { categorias, adicionar, atualizar, remover } = useStore()
  const editando = Boolean(lancamento)
  const [tipo, setTipo] = useState<TipoLancamento>(lancamento?.tipo ?? 'saida')
  const [valor, setValor] = useState(lancamento ? valorParaCampo(lancamento.valor) : '')
  const [descricao, setDescricao] = useState(lancamento?.descricao ?? '')
  const [categoriaId, setCategoriaId] = useState(
    lancamento?.categoriaId ?? categorias.find((c) => c.tipo === 'saida')?.id ?? '',
  )
  const [data, setData] = useState(lancamento?.data ?? hojeISO())
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const cats = categorias.filter((c) => c.tipo === tipo)
  const numero = lerValor(valor)
  const valido = numero > 0 && descricao.trim().length > 0 && cats.some((c) => c.id === categoriaId) && data

  function trocarTipo(t: TipoLancamento) {
    setTipo(t)
    setCategoriaId(categorias.find((c) => c.tipo === t)?.id ?? '')
  }

  async function executar(acao: () => Promise<void>) {
    setSalvando(true)
    setErro(null)
    try {
      await acao()
      onFechar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu para salvar. Tente de novo.')
      setSalvando(false)
    }
  }

  function salvar(e: FormEvent) {
    e.preventDefault()
    if (!valido || salvando) return
    const dados = { tipo, valor: numero, descricao: descricao.trim(), categoriaId, data, conta: lancamento?.conta }
    executar(() => (lancamento ? atualizar(lancamento.id, dados) : adicionar(dados)))
  }

  return (
    <div className="sheet-fundo" onClick={onFechar}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={salvar}>
        <div className="sheet__topo">
          <h2>{editando ? 'Editar lançamento' : 'Novo lançamento'}</h2>
          <button type="button" className="btn-icone" onClick={onFechar} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="segmento" data-tipo={tipo}>
          <button type="button" className={tipo === 'saida' ? 'ativo' : ''} onClick={() => trocarTipo('saida')}>
            Saída
          </button>
          <button type="button" className={tipo === 'entrada' ? 'ativo' : ''} onClick={() => trocarTipo('entrada')}>
            Entrada
          </button>
        </div>

        <label className={`campo-valor campo-valor--${tipo}`}>
          <span>R$</span>
          <input
            inputMode="decimal"
            placeholder="0,00"
            value={valor}
            onChange={(e) => setValor(e.target.value.replace(/[^\d.,]/g, ''))}
            autoFocus={!editando}
          />
        </label>

        <label className="campo">
          <span className="campo__rotulo">Descrição</span>
          <input
            value={descricao}
            maxLength={120}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex.: mercado do mês"
          />
        </label>

        <div className="campo">
          <span className="campo__rotulo">Categoria</span>
          <div className="chips">
            {cats.map((c) => (
              <button
                type="button"
                key={c.id}
                className={`chip ${categoriaId === c.id ? 'chip--ativo' : ''}`}
                style={{ '--cor': c.cor } as React.CSSProperties}
                onClick={() => setCategoriaId(c.id)}
              >
                <Icone nome={c.icone} size={15} />
                {c.nome}
              </button>
            ))}
            {cats.length === 0 && (
              <Link to="/ajustes" className="link" onClick={onFechar}>
                Crie uma categoria de {tipo === 'saida' ? 'saída' : 'entrada'} primeiro
              </Link>
            )}
          </div>
        </div>

        <label className="campo">
          <span className="campo__rotulo">Data</span>
          <input type="date" required value={data} onChange={(e) => setData(e.target.value)} />
        </label>

        {erro && <p className="alerta alerta--erro">{erro}</p>}

        <button className="btn btn--primario btn--largo" disabled={!valido || salvando}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
        {lancamento && (
          <button
            type="button"
            className="btn btn--fantasma btn--largo btn--perigo"
            disabled={salvando}
            onClick={() => executar(() => remover(lancamento.id))}
          >
            <Trash2 size={17} /> Apagar lançamento
          </button>
        )}
      </form>
    </div>
  )
}
