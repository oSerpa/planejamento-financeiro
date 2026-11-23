import { useState, type FormEvent } from 'react'
import { Check, CreditCard, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useStore } from '../data/store'
import type { Cartao, Lancamento } from '../data/types'
import { hojeISO, lerValor, nomeMes, somarMes, valorParaCampo } from '../lib/format'
import { dataNoMes, faturaAberta, somar } from '../lib/financas'
import { Cabecalho } from '../components/Cabecalho'
import { Valor } from '../components/Valor'
import { ItemLancamento } from '../components/ItemLancamento'
import { FichaLancamento } from '../components/DetalheLancamento'
import { Vazio } from '../components/Vazio'

const cores = ['#24493a', '#7A3FA0', '#D9752B', '#C2553A', '#4E6E8E', '#1c2a24', '#3E8E8A', '#9A6B4F']

type Situacao = 'paga' | 'aberta' | 'fechada' | 'vencida' | 'futura'

const nomeSituacao: Record<Situacao, string> = {
  paga: 'Paga',
  aberta: 'Aberta',
  fechada: 'Fechada',
  vencida: 'Vencida',
  futura: 'Próxima',
}

const mesCurto = (m: string) => nomeMes(`${m}-01`).split(' de ')[0].slice(0, 3)
const diaMes = (iso: string) => `${iso.slice(8)}/${iso.slice(5, 7)}`

export function Cartoes() {
  const { cartoes, todos, faturasPagas, demo } = useStore()
  const [editando, setEditando] = useState<Cartao | 'novo' | null>(null)

  return (
    <div className="pagina pagina--v2">
      <Cabecalho sup={<>Cartões{demo && <span className="selo-demo">demo</span>}</>} titulo="Faturas e limite">
        <button className="btn btn--suave btn--pequeno" onClick={() => setEditando('novo')}>
          <Plus size={16} /> Cartão
        </button>
      </Cabecalho>

      {cartoes.length === 0 && (
        <div className="painel entra">
          <Vazio
            tipo="lista"
            titulo="Nenhum cartão ainda"
            texto="Cadastre seu cartão com o limite e os dias de fechamento e vencimento. As compras caem sozinhas na fatura certa."
          />
          <button className="btn btn--primario btn--largo" onClick={() => setEditando('novo')}>
            <Plus size={17} /> Cadastrar cartão
          </button>
        </div>
      )}

      <div className="cartoes">
        {cartoes.map((c, i) => (
          <PainelCartao
            key={c.id}
            c={c}
            i={i}
            ls={todos.filter((l) => l.cartaoId === c.id)}
            pagas={faturasPagas}
            onEditar={() => setEditando(c)}
          />
        ))}
      </div>

      {editando && <FormCartao cartao={editando === 'novo' ? undefined : editando} onFechar={() => setEditando(null)} />}
    </div>
  )
}

function PainelCartao({ c, i, ls, pagas, onEditar }: { c: Cartao; i: number; ls: Lancamento[]; pagas: Set<string>; onEditar: () => void }) {
  const { marcarFatura } = useStore()
  const hoje = hojeISO()
  const aberta = faturaAberta(c, hoje)
  const paga = (m: string) => pagas.has(`${c.id}:${m}`)

  const porFatura = new Map<string, Lancamento[]>()
  for (const l of ls) if (l.fatura) porFatura.set(l.fatura, [...(porFatura.get(l.fatura) ?? []), l])

  // faturas para mostrar: as não pagas que já fecharam, a aberta e as próximas com parcelas
  const meses = [...new Set([...porFatura.keys(), aberta, somarMes(aberta, -1)])]
    .filter((m) => m >= aberta || !paga(m) || m === somarMes(aberta, -1))
    .sort()
  const [vendo, setVendo] = useState(aberta)
  const [aberto, setAberto] = useState<Lancamento | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const usado = somar(ls.filter((l) => l.fatura && !paga(l.fatura)))
  const disponivel = c.limite - usado
  const pctUsado = Math.min(100, (usado / c.limite) * 100)

  const situacao = (m: string): Situacao => {
    if (paga(m)) return 'paga'
    if (m === aberta) return 'aberta'
    if (m > aberta) return 'futura'
    return dataNoMes(m, c.vencimento) < hoje ? 'vencida' : 'fechada'
  }
  const fechaEm = (m: string) => dataNoMes(c.vencimento > c.fechamento ? m : somarMes(m, -1), c.fechamento)

  const itens = [...(porFatura.get(vendo) ?? [])].sort((a, b) => b.data.localeCompare(a.data))
  const total = somar(itens)
  const sit = situacao(vendo)

  async function alternarPaga() {
    setErro(null)
    try {
      await marcarFatura(c.id, vendo, sit !== 'paga')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu para salvar.')
    }
  }

  return (
    <section className="painel cartao entra" style={{ '--i': i, '--k': c.cor } as React.CSSProperties}>
      <div className="cartao__face">
        <div className="cartao__topo">
          <span className="cartao__nome">
            <CreditCard size={18} /> {c.nome}
          </span>
          <button type="button" className="btn-icone cartao__editar" onClick={onEditar} aria-label={`Editar ${c.nome}`}>
            <Pencil size={16} />
          </button>
        </div>
        <span className="cartao__rotulo">Limite disponível</span>
        <Valor valor={disponivel} className="cartao__valor" />
        <span className="cartao__trilho">
          <span style={{ width: `${pctUsado}%` }} />
        </span>
        <div className="cartao__rodape">
          <span>
            Usado <Valor valor={usado} /> de <Valor valor={c.limite} />
          </span>
          <span>
            fecha dia {c.fechamento} · vence dia {c.vencimento}
          </span>
        </div>
      </div>

      <div className="faturas" role="tablist" aria-label={`Faturas do ${c.nome}`}>
        {meses.map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={vendo === m}
            className={`fatura-chip fatura-chip--${situacao(m)} ${vendo === m ? 'ativo' : ''}`}
            onClick={() => setVendo(m)}
          >
            <span className="fatura-chip__mes">{mesCurto(m)}</span>
            <Valor valor={somar(porFatura.get(m) ?? [])} className="fatura-chip__valor" />
            <span className="fatura-chip__sit">{nomeSituacao[situacao(m)]}</span>
          </button>
        ))}
      </div>

      <div className="fatura">
        <div className="fatura__topo">
          <div>
            <span className="fatura__titulo">Fatura de {nomeMes(`${vendo}-01`)}</span>
            <span className="fatura__datas">
              {sit === 'aberta' ? 'fecha' : 'fechou'} {diaMes(fechaEm(vendo))} · vence {diaMes(dataNoMes(vendo, c.vencimento))}
            </span>
          </div>
          <Valor valor={total} className="fatura__total" />
        </div>
        {sit !== 'futura' && total > 0 && (
          <button type="button" className={`btn btn--largo ${sit === 'paga' ? 'btn--fantasma' : 'btn--suave'}`} onClick={alternarPaga}>
            {sit === 'paga' ? (
              <>
                <X size={16} /> Desmarcar pagamento
              </>
            ) : (
              <>
                <Check size={16} /> Marcar como paga
              </>
            )}
          </button>
        )}
        {erro && <p className="alerta alerta--erro">{erro}</p>}
        {itens.length === 0 ? (
          <p className="painel__texto">Nenhuma compra nesta fatura.</p>
        ) : (
          <ul className="lista">
            {itens.map((l) => (
              <ItemLancamento key={l.id} l={l} onAbrir={setAberto} />
            ))}
          </ul>
        )}
      </div>
      {aberto && <FichaLancamento l={aberto} onFechar={() => setAberto(null)} />}
    </section>
  )
}

function FormCartao({ cartao, onFechar }: { cartao?: Cartao; onFechar: () => void }) {
  const { salvarCartao, removerCartao } = useStore()
  const [nome, setNome] = useState(cartao?.nome ?? '')
  const [limite, setLimite] = useState(cartao ? valorParaCampo(cartao.limite) : '')
  const [fechamento, setFechamento] = useState(String(cartao?.fechamento ?? ''))
  const [vencimento, setVencimento] = useState(String(cartao?.vencimento ?? ''))
  const [cor, setCor] = useState(cartao?.cor ?? cores[1])
  const [ocupado, setOcupado] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const dia = (s: string) => {
    const n = Number(s)
    return Number.isInteger(n) && n >= 1 && n <= 31 ? n : 0
  }
  const valido = nome.trim() && lerValor(limite) > 0 && dia(fechamento) && dia(vencimento)

  async function tentar(acao: () => Promise<void>) {
    setOcupado(true)
    setErro(null)
    try {
      await acao()
      onFechar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Algo deu errado.')
      setOcupado(false)
    }
  }

  function salvar(e: FormEvent) {
    e.preventDefault()
    if (!valido || ocupado) return
    tentar(() =>
      salvarCartao({ nome: nome.trim(), limite: lerValor(limite), fechamento: dia(fechamento), vencimento: dia(vencimento), cor }, cartao?.id),
    )
  }

  return (
    <div className="sheet-fundo" onClick={onFechar}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={salvar}>
        <div className="sheet__alca" />
        <div className="sheet__topo">
          <h2>{cartao ? 'Editar cartão' : 'Novo cartão'}</h2>
          <button type="button" className="btn-icone" onClick={onFechar} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>
        <label className="campo">
          <span className="campo__rotulo">Nome</span>
          <input value={nome} maxLength={30} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Nubank" autoFocus={!cartao} />
        </label>
        <label className="campo">
          <span className="campo__rotulo">Limite</span>
          <input inputMode="decimal" value={limite} onChange={(e) => setLimite(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="2.000,00" />
        </label>
        <div className="campo-duplo">
          <label className="campo">
            <span className="campo__rotulo">Fecha no dia</span>
            <input inputMode="numeric" value={fechamento} onChange={(e) => setFechamento(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="3" />
          </label>
          <label className="campo">
            <span className="campo__rotulo">Vence no dia</span>
            <input inputMode="numeric" value={vencimento} onChange={(e) => setVencimento(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="10" />
          </label>
        </div>
        <p className="campo__ajuda">Compra feita no dia do fechamento ou depois já entra na fatura seguinte.</p>
        <div className="campo">
          <span className="campo__rotulo">Cor</span>
          <div className="cores">
            {cores.map((c) => (
              <button type="button" key={c} className={`cor ${cor === c ? 'cor--ativa' : ''}`} style={{ background: c }} onClick={() => setCor(c)} aria-label={`Cor ${c}`} />
            ))}
          </div>
        </div>
        {erro && <p className="alerta alerta--erro">{erro}</p>}
        <button className="btn btn--primario btn--largo" disabled={!valido || ocupado}>
          {ocupado ? 'Salvando…' : cartao ? 'Salvar cartão' : 'Cadastrar cartão'}
        </button>
        {cartao && (
          <button
            type="button"
            className={`btn btn--largo ${confirmar ? 'btn--perigo-cheio' : 'btn--fantasma btn--perigo'}`}
            disabled={ocupado}
            onClick={() => (confirmar ? tentar(() => removerCartao(cartao.id)) : setConfirmar(true))}
          >
            <Trash2 size={17} /> {confirmar ? 'Confirmar: as compras ficam, sem cartão' : 'Apagar cartão'}
          </button>
        )}
      </form>
    </div>
  )
}
