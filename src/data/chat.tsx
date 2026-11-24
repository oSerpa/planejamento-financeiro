import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from './auth'
import { useStore } from './store'
import type { Categoria, Lancado, Lancamento, NovoLancamentoDados, Repeticao } from './types'
import { hojeISO, mesDe } from '../lib/format'
import { faturaAberta, somar } from '../lib/financas'
import { EXEMPLOS, EXEMPLOS_MAIS, aprender, ehPergunta, interpretar, lerOrcamento, type Aprendidas, type Origem } from '../lib/interpretar'

export interface Orcamento {
  gasto: number
  limite: number
}

export interface ItemSalvo {
  /** Lançamento que aparece no cartão. Numa recorrência que ainda não lançou, tem id vazio. */
  lanc: Lancamento
  /** Tudo que foi criado junto (parcelas, recorrência). Mensagens antigas não têm. */
  lancado?: Lancado
  repeticao?: Repeticao
  palavras: string[]
  origem: Origem
  desfeito?: boolean
  /** Nome da categoria que o usuário ensinou nesse item. */
  aprendeu?: string
  /** Como ficou o orçamento da categoria depois de salvar. */
  orcamento?: Orcamento
}

export interface LinhaOrcamento {
  categoriaId: string
  gasto: number
  limite: number
}

export interface LinhaFatura {
  cartaoId: string
  mes: string
  total: number
  disponivel: number
}

export type Mensagem =
  | { id: string; de: 'eu'; texto: string }
  | { id: string; de: 'bot'; tipo: 'texto'; texto: string; dicas?: string[] }
  | { id: string; de: 'bot'; tipo: 'salvo'; itens: ItemSalvo[] }
  | { id: string; de: 'bot'; tipo: 'resumo'; mes: string; entradas: number; saidas: number; qtd: number }
  | { id: string; de: 'bot'; tipo: 'orcamentos'; mes: string; itens: LinhaOrcamento[]; salvo?: boolean }
  | { id: string; de: 'bot'; tipo: 'faturas'; itens: LinhaFatura[] }

interface Chat {
  mensagens: Mensagem[]
  aprendidas: Aprendidas
  pensando: boolean
  enviar: (texto: string) => Promise<void>
  trocarCategoria: (msgId: string, idx: number, cat: Categoria) => Promise<void>
  desfazer: (msgId: string, idx: number) => Promise<void>
  refazer: (msgId: string, idx: number) => Promise<void>
  esquecer: (palavra: string) => void
  limpar: () => void
}

const Ctx = createContext<Chat | null>(null)

const novoId = () => `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

function ler<T>(chave: string, padrao: T): T {
  try {
    const v = localStorage.getItem(chave)
    return v ? (JSON.parse(v) as T) : padrao
  } catch {
    return padrao
  }
}
function gravar(chave: string, valor: unknown) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor))
  } catch {
    // sem espaço ou modo privado: segue só em memória
  }
}

const lancadoDe = (it: ItemSalvo): Lancado => it.lancado ?? { lancamentos: [it.lanc] }

/** Lançamento que representa o que foi criado: a primeira parcela, ou a recorrência se ainda não lançou. */
function representante(r: Lancado, dados: NovoLancamentoDados): Lancamento {
  const primeiro = [...r.lancamentos].sort((a, b) => a.data.localeCompare(b.data))[0]
  if (primeiro) return primeiro
  return { ...dados, id: '' }
}

/**
 * Conversa e palavras aprendidas. Fica acima das rotas para não perder a conversa ao trocar de aba.
 * As palavras ficam salvas no aparelho. A conversa também, menos no modo demo (lá os dados somem ao recarregar).
 */
export function ChatProvider({ children }: { children: ReactNode }) {
  const { sessao } = useAuth()
  const store = useStore()
  const uid = sessao?.user.id ?? 'anon'
  const chaveP = `caixinha:palavras:${uid}`
  const chaveM = `caixinha:chat:${uid}`

  const [aprendidas, setAprendidas] = useState<Aprendidas>(() => ler(chaveP, {}))
  const [mensagens, setMensagens] = useState<Mensagem[]>(() => (store.demo ? [] : ler(chaveM, [])))
  const [pensando, setPensando] = useState(false)

  useEffect(() => gravar(chaveP, aprendidas), [chaveP, aprendidas])
  useEffect(() => {
    if (!store.demo) gravar(chaveM, mensagens.slice(-80))
  }, [chaveM, mensagens, store.demo])

  const por = (m: Mensagem) => setMensagens((a) => [...a, m])
  const texto = (t: string, dicas?: string[]) => por({ id: novoId(), de: 'bot', tipo: 'texto', texto: t, dicas })
  const mudarItem = (msgId: string, idx: number, f: (i: ItemSalvo) => ItemSalvo) =>
    setMensagens((a) =>
      a.map((m) => (m.id === msgId && m.de === 'bot' && m.tipo === 'salvo' ? { ...m, itens: m.itens.map((it, i) => (i === idx ? f(it) : it)) } : m)),
    )
  const achar = (msgId: string, idx: number) => {
    const m = mensagens.find((x) => x.id === msgId)
    return m && m.de === 'bot' && m.tipo === 'salvo' ? m.itens[idx] : undefined
  }
  const falha = (e: unknown) => texto(`Não consegui salvar: ${e instanceof Error ? e.message : 'erro desconhecido'}.`)

  /** Orçamento da categoria no mês do lançamento, se ela tiver um. */
  async function orcamentoDe(l: Lancamento, cat?: Categoria): Promise<Orcamento | undefined> {
    const c = cat ?? store.categoria(l.categoriaId)
    if (!c?.limite || l.tipo !== 'saida' || !l.id) return undefined
    return { gasto: await store.gastoNoMes(c.id, mesDe(l.data)), limite: c.limite }
  }

  async function enviar(t0: string) {
    const t = t0.trim()
    if (!t || pensando) return
    por({ id: novoId(), de: 'eu', texto: t })

    const pergunta = ehPergunta(t)
    if (pergunta === 'ajuda') {
      return texto(
        'Escreve do jeito que você falaria: o valor, o que foi e, se quiser, quando. Eu descubro se entrou ou saiu e a categoria. Também entendo "todo mês" para contas fixas, "em 10x" para parcelado, o nome do cartão e "orçamento mercado 800" para definir um limite.',
        [...EXEMPLOS.slice(0, 2), ...EXEMPLOS_MAIS],
      )
    }
    if (pergunta === 'resumo') {
      const ls = store.lancamentos
      const soma = (tipo: string) => ls.filter((l) => l.tipo === tipo).reduce((s, l) => s + l.valor, 0)
      return por({ id: novoId(), de: 'bot', tipo: 'resumo', mes: store.mes, entradas: soma('entrada'), saidas: soma('saida'), qtd: ls.length })
    }
    if (pergunta === 'orcamentos') {
      const mes = mesDe(hojeISO())
      const com = store.categorias.filter((c) => c.tipo === 'saida' && c.limite)
      if (com.length === 0) return texto('Você ainda não tem orçamento em nenhuma categoria. Manda assim:', ['orçamento mercado 800'])
      const itens = await Promise.all(com.map(async (c) => ({ categoriaId: c.id, limite: c.limite!, gasto: await store.gastoNoMes(c.id, mes) })))
      return por({ id: novoId(), de: 'bot', tipo: 'orcamentos', mes, itens: itens.sort((a, b) => b.gasto / b.limite - a.gasto / a.limite) })
    }
    if (pergunta === 'faturas') {
      if (store.cartoes.length === 0) return texto('Você ainda não cadastrou nenhum cartão. Dá para cadastrar na tela de Cartões, pelo Resumo.')
      const hoje = hojeISO()
      const itens = store.cartoes.map((c) => {
        const doCartao = store.todos.filter((l) => l.cartaoId === c.id)
        const mes = faturaAberta(c, hoje)
        const aberto = doCartao.filter((l) => l.fatura && !store.faturasPagas.has(`${c.id}:${l.fatura}`))
        return { cartaoId: c.id, mes, total: somar(doCartao.filter((l) => l.fatura === mes)), disponivel: c.limite - somar(aberto) }
      })
      return por({ id: novoId(), de: 'bot', tipo: 'faturas', itens })
    }

    const orc = lerOrcamento(t, store.categorias)
    if (orc) {
      try {
        await store.definirLimite(orc.categoria.id, orc.valor)
      } catch (e) {
        return falha(e)
      }
      if (orc.valor === null) return texto(`Tirei o orçamento de ${orc.categoria.nome}.`)
      const gasto = await store.gastoNoMes(orc.categoria.id, mesDe(hojeISO()))
      return por({ id: novoId(), de: 'bot', tipo: 'orcamentos', mes: mesDe(hojeISO()), itens: [{ categoriaId: orc.categoria.id, gasto, limite: orc.valor }], salvo: true })
    }

    if (store.categorias.length === 0) {
      return texto(
        store.erro
          ? `Não consegui carregar suas categorias (${store.erro}). Recarregue a página e tente de novo.`
          : 'Você ainda não tem categorias, então não tenho onde anotar. Crie uma em Ajustes e manda de novo.',
      )
    }
    const lidos = interpretar(t, store.categorias, aprendidas, hojeISO(), store.cartoes)
    if (lidos.length === 0) return texto('Não achei um valor nessa frase. Me fala quanto foi, tipo assim:', EXEMPLOS.slice(0, 3))

    setPensando(true)
    try {
      const itens: ItemSalvo[] = []
      for (const r of lidos) {
        const dados = { descricao: r.descricao, valor: r.valor, tipo: r.tipo, categoriaId: r.categoriaId, data: r.data, cartaoId: r.cartaoId }
        const lancado = await store.lancar(dados, r.repeticao)
        const lanc = representante(lancado, dados)
        itens.push({ lanc, lancado, repeticao: r.repeticao, palavras: r.palavras, origem: r.origem, orcamento: await orcamentoDe(lanc) })
      }
      por({ id: novoId(), de: 'bot', tipo: 'salvo', itens })
    } catch (e) {
      falha(e)
    } finally {
      setPensando(false)
    }
  }

  async function trocarCategoria(msgId: string, idx: number, cat: Categoria) {
    const it = achar(msgId, idx)
    if (!it || it.desfeito) return
    try {
      const lancado = await store.recategorizar(lancadoDe(it), cat)
      const lanc = { ...it.lanc, categoriaId: cat.id, tipo: cat.tipo }
      if (it.palavras.length) setAprendidas((a) => aprender(a, it.palavras, cat.id))
      const orcamento = await orcamentoDe(lanc, cat)
      mudarItem(msgId, idx, (x) => ({ ...x, lanc, lancado, orcamento, aprendeu: x.palavras.length ? cat.nome : undefined }))
    } catch (e) {
      falha(e)
    }
  }

  async function desfazer(msgId: string, idx: number) {
    const it = achar(msgId, idx)
    if (!it || it.desfeito) return
    try {
      await store.desfazerLancado(lancadoDe(it))
      mudarItem(msgId, idx, (x) => ({ ...x, desfeito: true }))
    } catch (e) {
      falha(e)
    }
  }

  async function refazer(msgId: string, idx: number) {
    const it = achar(msgId, idx)
    if (!it?.desfeito) return
    const { id: _velho, grupo: _g, parcela: _p, parcelas: _n, recorrenciaId: _r, fatura: _f, ...dados } = it.lanc
    void [_velho, _g, _p, _n, _r, _f]
    // parcelado: o valor guardado é o da 1ª parcela, volta para o total
    const total = it.repeticao?.tipo === 'parcelado' ? somar(lancadoDe(it).lancamentos) : dados.valor
    try {
      const lancado = await store.lancar({ ...dados, valor: total }, it.repeticao ?? { tipo: 'unica' })
      const lanc = representante(lancado, dados)
      mudarItem(msgId, idx, (x) => ({ ...x, lanc, lancado, desfeito: false }))
    } catch (e) {
      falha(e)
    }
  }

  const esquecer = (palavra: string) =>
    setAprendidas((a) => {
      const novo = { ...a }
      delete novo[palavra]
      return novo
    })

  const valor: Chat = { mensagens, aprendidas, pensando, enviar, trocarCategoria, desfazer, refazer, esquecer, limpar: () => setMensagens([]) }
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useChat() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useChat fora do ChatProvider')
  return c
}
