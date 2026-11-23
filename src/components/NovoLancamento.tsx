import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, X } from 'lucide-react'
import { useStore } from '../data/store'
import type { Lancamento, TipoLancamento } from '../data/types'
import { hojeISO, isoDeslocado, lerValor, valorParaCampo } from '../lib/format'
import { Icone } from './Icone'

interface Props {
  onFechar: () => void
  /** Quando vem preenchido, a tela edita esse lançamento. */
  lancamento?: Lancamento
  /** Tipo já escolhido ao abrir pelos atalhos. */
  tipoInicial?: TipoLancamento
}

export function NovoLancamento({ onFechar, lancamento, tipoInicial = 'saida' }: Props) {
  const { categorias, adicionar, atualizar, remover } = useStore()
  const editando = Boolean(lancamento)
  const [tipo, setTipo] = useState<TipoLancamento>(lancamento?.tipo ?? tipoInicial)
  const [valor, setValor] = useState(lancamento ? valorParaCampo(lancamento.valor) : '')
  const [descricao, setDescricao] = useState(lancamento?.descricao ?? '')
  const [categoriaId, setCategoriaId] = useState(
    lancamento?.categoriaId ?? categorias.find((c) => c.tipo === (lancamento?.tipo ?? tipoInicial))?.id ?? '',
  )
  const [data, setData] = useState(lancamento?.data ?? hojeISO())
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const cats = categorias.filter((c) => c.tipo === tipo)
  const hoje = hojeISO()
  const atalhosData: [string, string][] = [
    ['Hoje', hoje],
    ['Ontem', isoDeslocado(hoje, -1)],
  ]
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
        <div className="sheet__alca" />
        <div className="sheet__topo">
          <h2>{editando ? 'Editar lançamento' : 'Novo lançamento'}</h2>
          <button type="button" className="btn-icone" onClick={onFechar} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="segmento segmento--deslizante" data-tipo={tipo}>
          <span className="segmento__marca" aria-hidden />
          <button type="button" className={tipo === 'saida' ? 'ativo' : ''} onClick={() => trocarTipo('saida')}>
            Saída
          </button>
          <button type="button" className={tipo === 'entrada' ? 'ativo' : ''} onClick={() => trocarTipo('entrada')}>
            Entrada
          </button>
        </div>

        <label className={`campo-valor campo-valor--${tipo}`}>
          <span>{tipo === 'saida' ? '−' : '+'} R$</span>
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
          <div className="cat-grade">
            {cats.map((c) => (
              <button
                type="button"
                key={c.id}
                className={`cat-op ${categoriaId === c.id ? 'cat-op--ativa' : ''}`}
                style={{ '--cor': c.cor } as React.CSSProperties}
                onClick={() => setCategoriaId(c.id)}
                aria-pressed={categoriaId === c.id}
              >
                <span className="cat-op__icone">
                  <Icone nome={c.icone} size={19} />
                </span>
                <span className="cat-op__nome">{c.nome}</span>
              </button>
            ))}
          </div>
          {cats.length === 0 && (
            <Link to="/ajustes" className="link" onClick={onFechar}>
              Crie uma categoria de {tipo === 'saida' ? 'saída' : 'entrada'} primeiro
            </Link>
          )}
        </div>

        <div className="campo">
          <span className="campo__rotulo">Data</span>
          <div className="datas">
            {atalhosData.map(([rotulo, iso]) => (
              <button
                type="button"
                key={rotulo}
                className={`data-op ${data === iso ? 'data-op--ativa' : ''}`}
                onClick={() => setData(iso)}
              >
                {rotulo}
              </button>
            ))}
            <input
              type="date"
              required
              aria-label="Outra data"
              className={`data-op data-op--campo ${atalhosData.some(([, iso]) => iso === data) ? '' : 'data-op--ativa'}`}
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>
        </div>

        {erro && <p className="alerta alerta--erro">{erro}</p>}

        <button className="btn btn--primario btn--largo" disabled={!valido || salvando}>
          {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : `Lançar ${tipo === 'saida' ? 'saída' : 'entrada'}`}
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
