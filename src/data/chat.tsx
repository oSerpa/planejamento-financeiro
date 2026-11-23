import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from './auth'
import { useStore } from './store'
import type { Categoria, Lancamento } from './types'
import { hojeISO } from '../lib/format'
import { EXEMPLOS, aprender, ehPergunta, interpretar, type Aprendidas, type Origem } from '../lib/interpretar'

export interface ItemSalvo {
  lanc: Lancamento
  palavras: string[]
  origem: Origem
  desfeito?: boolean
  /** Nome da categoria que o usuário ensinou nesse item. */
  aprendeu?: string
}

export type Mensagem =
  | { id: string; de: 'eu'; texto: string }
  | { id: string; de: 'bot'; tipo: 'texto'; texto: string; dicas?: string[] }
  | { id: string; de: 'bot'; tipo: 'salvo'; itens: ItemSalvo[] }
  | { id: string; de: 'bot'; tipo: 'resumo'; mes: string; entradas: number; saidas: number; qtd: number }

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
  const mudarItem = (msgId: string, idx: number, f: (i: ItemSalvo) => ItemSalvo) =>
    setMensagens((a) =>
      a.map((m) => (m.id === msgId && m.de === 'bot' && m.tipo === 'salvo' ? { ...m, itens: m.itens.map((it, i) => (i === idx ? f(it) : it)) } : m)),
    )
  const achar = (msgId: string, idx: number) => {
    const m = mensagens.find((x) => x.id === msgId)
    return m && m.de === 'bot' && m.tipo === 'salvo' ? m.itens[idx] : undefined
  }
  const falha = (e: unknown) =>
    por({ id: novoId(), de: 'bot', tipo: 'texto', texto: `Não consegui salvar: ${e instanceof Error ? e.message : 'erro desconhecido'}.` })

  async function enviar(texto: string) {
    const t = texto.trim()
    if (!t || pensando) return
    por({ id: novoId(), de: 'eu', texto: t })

    const pergunta = ehPergunta(t)
    if (pergunta === 'ajuda') {
      return por({
        id: novoId(),
        de: 'bot',
        tipo: 'texto',
        texto:
          'Escreve do jeito que você falaria: o valor, o que foi e, se quiser, quando. Eu descubro se entrou ou saiu e a categoria. Se eu errar a categoria, troca no cartão que eu aprendo pra próxima.',
        dicas: EXEMPLOS,
      })
    }
    if (pergunta === 'resumo') {
      const ls = store.lancamentos
      const soma = (tipo: string) => ls.filter((l) => l.tipo === tipo).reduce((s, l) => s + l.valor, 0)
      return por({ id: novoId(), de: 'bot', tipo: 'resumo', mes: store.mes, entradas: soma('entrada'), saidas: soma('saida'), qtd: ls.length })
    }

    const lidos = interpretar(t, store.categorias, aprendidas, hojeISO())
    if (lidos.length === 0) {
      return por({
        id: novoId(),
        de: 'bot',
        tipo: 'texto',
        texto: 'Não achei um valor nessa frase. Me fala quanto foi, tipo assim:',
        dicas: EXEMPLOS.slice(0, 3),
      })
    }

    setPensando(true)
    try {
      const itens: ItemSalvo[] = []
      for (const r of lidos) {
        const lanc = await store.adicionar({ descricao: r.descricao, valor: r.valor, tipo: r.tipo, categoriaId: r.categoriaId, data: r.data })
        itens.push({ lanc, palavras: r.palavras, origem: r.origem })
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
    const { id, ...dados } = it.lanc
    const novo = { ...dados, categoriaId: cat.id, tipo: cat.tipo }
    try {
      await store.atualizar(id, novo)
      if (it.palavras.length) setAprendidas((a) => aprender(a, it.palavras, cat.id))
      mudarItem(msgId, idx, (x) => ({ ...x, lanc: { ...novo, id }, aprendeu: x.palavras.length ? cat.nome : undefined }))
    } catch (e) {
      falha(e)
    }
  }

  async function desfazer(msgId: string, idx: number) {
    const it = achar(msgId, idx)
    if (!it || it.desfeito) return
    try {
      await store.remover(it.lanc.id)
      mudarItem(msgId, idx, (x) => ({ ...x, desfeito: true }))
    } catch (e) {
      falha(e)
    }
  }

  async function refazer(msgId: string, idx: number) {
    const it = achar(msgId, idx)
    if (!it?.desfeito) return
    const { id: _velho, ...dados } = it.lanc
    void _velho
    try {
      const lanc = await store.adicionar(dados)
      mudarItem(msgId, idx, (x) => ({ ...x, lanc, desfeito: false }))
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
