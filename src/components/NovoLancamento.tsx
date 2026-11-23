import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, X } from 'lucide-react'
import { useStore } from '../data/store'
import type { Lancamento, Repeticao, TipoLancamento } from '../data/types'
import { dinheiro, hojeISO, isoDeslocado, lerValor, parseISO, valorParaCampo } from '../lib/format'
import { dividir } from '../lib/financas'
import { Icone } from './Icone'

interface Props {
  onFechar: () => void
  /** Quando vem preenchido, a tela edita esse lançamento. */
  lancamento?: Lancamento
  /** Tipo já escolhido ao abrir pelos atalhos. */
  tipoInicial?: TipoLancamento
}

export function NovoLancamento({ onFechar, lancamento, tipoInicial = 'saida' }: Props) {
  const { categorias, cartoes, lancar, atualizar, remover, removerGrupo } = useStore()
  const editando = Boolean(lancamento)
  const [tipo, setTipo] = useState<TipoLancamento>(lancamento?.tipo ?? tipoInicial)
  const [valor, setValor] = useState(lancamento ? valorParaCampo(lancamento.valor) : '')
  const [descricao, setDescricao] = useState(lancamento?.descricao ?? '')
  const [categoriaId, setCategoriaId] = useState(
    lancamento?.categoriaId ?? categorias.find((c) => c.tipo === (lancamento?.tipo ?? tipoInicial))?.id ?? '',
  )
  const [data, setData] = useState(lancamento?.data ?? hojeISO())
  const [cartaoId, setCartaoId] = useState<string | undefined>(lancamento?.cartaoId)
  const [repetir, setRepetir] = useState<Repeticao['tipo']>('unica')
  const [parcelas, setParcelas] = useState('2')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const cats = categorias.filter((c) => c.tipo === tipo)
  const hoje = hojeISO()
  const atalhosData: [string, string][] = [
    ['Hoje', hoje],
    ['Ontem', isoDeslocado(hoje, -1)],
  ]
  const numero = lerValor(valor)
  const nParcelas = Math.min(72, Math.max(2, Math.round(Number(parcelas) || 2)))
  const valido = numero > 0 && descricao.trim().length > 0 && cats.some((c) => c.id === categoriaId) && data

  function trocarTipo(t: TipoLancamento) {
    setTipo(t)
    if (t === 'entrada' && repetir === 'parcelado') setRepetir('unica')
    setCategoriaId(categorias.find((c) => c.tipo === t)?.id ?? '')
  }

  async function executar(acao: () => Promise<unknown>) {
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
    const dados = { ...lancamento, tipo, valor: numero, descricao: descricao.trim(), categoriaId, data, cartaoId: tipo === 'saida' ? cartaoId : undefined }
    delete (dados as Partial<Lancamento>).id
    const rep: Repeticao =
      repetir === 'mensal' ? { tipo: 'mensal', dia: parseISO(data).getDate() } : repetir === 'parcelado' ? { tipo: 'parcelado', parcelas: nParcelas } : { tipo: 'unica' }
    executar(() => (lancamento ? atualizar(lancamento.id, dados) : lancar(dados, rep)))
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

        {tipo === 'saida' && cartoes.length > 0 && (
          <div className="campo">
            <span className="campo__rotulo">Pagou com</span>
            <div className="datas">
              <button type="button" className={`data-op ${!cartaoId ? 'data-op--ativa' : ''}`} onClick={() => setCartaoId(undefined)}>
                Débito ou pix
              </button>
              {cartoes.map((c) => (
                <button type="button" key={c.id} className={`data-op ${cartaoId === c.id ? 'data-op--ativa' : ''}`} onClick={() => setCartaoId(c.id)}>
                  {c.nome}
                </button>
              ))}
            </div>
          </div>
        )}

        {!editando && (
          <div className="campo">
            <span className="campo__rotulo">Repetir</span>
            <div className="datas">
              {(
                [
                  ['unica', 'Uma vez'],
                  ['mensal', 'Todo mês'],
                  ...(tipo === 'saida' ? [['parcelado', 'Parcelado']] : []),
                ] as [Repeticao['tipo'], string][]
              ).map(([k, rotulo]) => (
                <button type="button" key={k} className={`data-op ${repetir === k ? 'data-op--ativa' : ''}`} onClick={() => setRepetir(k)}>
                  {rotulo}
                </button>
              ))}
              {repetir === 'parcelado' && tipo === 'saida' && (
                <label className="data-op data-op--campo parcelas-campo">
                  <input inputMode="numeric" value={parcelas} onChange={(e) => setParcelas(e.target.value.replace(/\D/g, '').slice(0, 2))} aria-label="Número de parcelas" />
                  x
                </label>
              )}
            </div>
            {repetir === 'mensal' && <p className="campo__ajuda">Lança sozinho todo dia {parseISO(data).getDate()}. Dá para parar em Ajustes.</p>}
            {repetir === 'parcelado' && tipo === 'saida' && numero > 0 && (
              <p className="campo__ajuda">
                {nParcelas}x de {dinheiro(dividir(numero, nParcelas)[1])}, uma por mês{cartaoId ? ', cada uma numa fatura' : ''}. O valor acima é o total.
              </p>
            )}
          </div>
        )}
        {lancamento?.parcelas && <p className="campo__ajuda">Parcela {lancamento.parcela} de {lancamento.parcelas}. Editar aqui muda só esta parcela.</p>}

        {erro && <p className="alerta alerta--erro">{erro}</p>}

        <button className="btn btn--primario btn--largo" disabled={!valido || salvando}>
          {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : repetir === 'parcelado' ? `Lançar em ${nParcelas}x` : repetir === 'mensal' ? 'Salvar recorrente' : `Lançar ${tipo === 'saida' ? 'saída' : 'entrada'}`}
        </button>
        {lancamento && (
          <button
            type="button"
            className="btn btn--fantasma btn--largo btn--perigo"
            disabled={salvando}
            onClick={() => executar(() => remover(lancamento.id))}
          >
            <Trash2 size={17} /> Apagar {lancamento.parcelas ? 'só esta parcela' : 'lançamento'}
          </button>
        )}
        {lancamento?.grupo && (
          <button
            type="button"
            className="btn btn--fantasma btn--largo btn--perigo"
            disabled={salvando}
            onClick={() => executar(() => removerGrupo(lancamento.grupo!))}
          >
            <Trash2 size={17} /> Apagar as {lancamento.parcelas} parcelas
          </button>
        )}
      </form>
    </div>
  )
}
