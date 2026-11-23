import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { hojeISO, mesDe, somarMes } from '../lib/format'
import { comFatura, gerarPendentes, montar } from '../lib/financas'
import { metas as metasMock } from './mock'
import { criarBackendDemo } from './demo'
import { criarBackendSupabase } from './backend'
import type {
  Cartao, Categoria, Lancado, Lancamento, Meta, NovaCategoriaDados, NovoCartaoDados, NovoLancamentoDados, Recorrencia, Repeticao,
} from './types'

/**
 * O que o app precisa do banco. Tem duas versões: Supabase (backend.ts) e memória (demo.ts).
 * A Store em cima disso é a mesma para as duas.
 */
export interface Backend {
  categorias(): Promise<Categoria[]>
  criarCategoria(c: NovaCategoriaDados): Promise<Categoria>
  removerCategoria(id: string): Promise<void>
  definirLimite(id: string, limite: number | null): Promise<void>

  /** Lançamentos com data entre inicio (inclusive) e fim (exclusive). */
  lancamentosEntre(inicio: string, fim: string): Promise<Lancamento[]>
  /** Lançamentos de cartão com fatura a partir desse mês. */
  lancamentosDeCartao(desdeFatura: string): Promise<Lancamento[]>
  inserir(ls: NovoLancamentoDados[]): Promise<Lancamento[]>
  atualizar(id: string, l: NovoLancamentoDados): Promise<Lancamento>
  /** Muda só a categoria (e o tipo) de vários de uma vez. */
  recategorizar(ids: string[], categoriaId: string, tipo: Lancamento['tipo']): Promise<void>
  remover(ids: string[]): Promise<void>
  /** Apaga todas as parcelas de uma compra, carregadas ou não. */
  removerGrupo(grupo: string): Promise<void>

  recorrencias(): Promise<Recorrencia[]>
  criarRecorrencia(r: Omit<Recorrencia, 'id'>): Promise<Recorrencia>
  atualizarRecorrencia(id: string, campos: Partial<Omit<Recorrencia, 'id'>>): Promise<void>
  removerRecorrencia(id: string): Promise<void>
  /** Insere ignorando o que já existe (mesma recorrência e data). */
  inserirGerados(ls: NovoLancamentoDados[]): Promise<Lancamento[]>

  cartoes(): Promise<Cartao[]>
  salvarCartao(c: NovoCartaoDados, id?: string): Promise<Cartao>
  removerCartao(id: string): Promise<void>
  faturasPagas(): Promise<string[]>
  marcarFatura(cartaoId: string, mes: string, paga: boolean): Promise<void>
}

interface Store {
  /** true quando roda sem Supabase, só com dados de exemplo em memória. */
  demo: boolean
  /** Mês que está sendo visto, "yyyy-mm". */
  mes: string
  irParaMes: (n: number) => void
  categorias: Categoria[]
  /** Lançamentos do mês visto. */
  lancamentos: Lancamento[]
  /** Lançamentos do mês anterior ao visto, para comparar. */
  anterior: Lancamento[]
  /** Tudo que já foi carregado (mês, anterior, cartões e períodos pedidos no extrato). */
  todos: Lancamento[]
  recorrencias: Recorrencia[]
  cartoes: Cartao[]
  /** Chaves "cartaoId:yyyy-mm" das faturas pagas. */
  faturasPagas: Set<string>
  metas: Meta[]
  carregando: boolean
  erro: string | null
  categoria: (id: string) => Categoria | undefined
  cartao: (id?: string) => Cartao | undefined
  /** Garante que o período está carregado em `todos`. */
  carregarPeriodo: (inicio: string, fim: string) => Promise<void>
  /** Soma das saídas da categoria no mês, lendo do banco se precisar. */
  gastoNoMes: (categoriaId: string, mes: string) => Promise<number>
  adicionar: (l: NovoLancamentoDados) => Promise<Lancamento>
  lancar: (l: NovoLancamentoDados, rep: Repeticao) => Promise<Lancado>
  desfazerLancado: (r: Lancado) => Promise<void>
  recategorizar: (r: Lancado, cat: Categoria) => Promise<Lancado>
  atualizar: (id: string, l: NovoLancamentoDados) => Promise<void>
  remover: (id: string) => Promise<void>
  /** Apaga todas as parcelas da compra. */
  removerGrupo: (grupo: string) => Promise<void>
  pararRecorrencia: (id: string) => Promise<void>
  criarCategoria: (c: NovaCategoriaDados) => Promise<void>
  removerCategoria: (id: string) => Promise<void>
  definirLimite: (id: string, limite: number | null) => Promise<void>
  salvarCartao: (c: NovoCartaoDados, id?: string) => Promise<void>
  removerCartao: (id: string) => Promise<void>
  marcarFatura: (cartaoId: string, mes: string, paga: boolean) => Promise<void>
}

const Ctx = createContext<Store | null>(null)

const porNome = <T extends { nome: string }>(a: T[]) => [...a].sort((x, y) => x.nome.localeCompare(y.nome))
const recentes = (a: Lancamento[]) => [...a].sort((x, y) => y.data.localeCompare(x.data))

export function StoreProvider({ children }: { children: ReactNode }) {
  const backend = useMemo(() => (supabase ? criarBackendSupabase(supabase) : criarBackendDemo()), [])
  return (
    <StoreCore backend={backend} demo={!supabase}>
      {children}
    </StoreCore>
  )
}

function StoreCore({ backend: db, demo, children }: { backend: Backend; demo: boolean; children: ReactNode }) {
  const [mes, setMes] = useState(() => mesDe(hojeISO()))
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [recorrencias, setRecorrencias] = useState<Recorrencia[]>([])
  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [pagas, setPagas] = useState<Set<string>>(new Set())
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // cache de lançamentos: o ref é lido nas funções assíncronas, o estado faz a tela renderizar
  const cache = useRef(new Map<string, Lancamento>())
  const [versao, setVersao] = useState(0)
  /** Faixas de datas já buscadas, "inicio|fim". */
  const carregados = useRef(new Set<string>())
  const cartoesRef = useRef<Cartao[]>([])
  cartoesRef.current = cartoes

  const mexer = useCallback((f: (m: Map<string, Lancamento>) => void) => {
    f(cache.current)
    setVersao((v) => v + 1)
  }, [])
  const guardar = useCallback((ls: Lancamento[]) => mexer((m) => ls.forEach((l) => m.set(l.id, l))), [mexer])

  const carregarPeriodo = useCallback(
    async (inicio: string, fim: string) => {
      const chave = `${inicio}|${fim}`
      if (carregados.current.has(chave)) return
      const ls = await db.lancamentosEntre(inicio, fim)
      carregados.current.add(chave)
      guardar(ls)
    },
    [db, guardar],
  )

  /** Cria os lançamentos das recorrências que venceram desde a última vez que o app abriu. */
  const gerarRecorrentes = useCallback(
    async (lista: Recorrencia[], cards: Cartao[]) => {
      const hoje = hojeISO()
      const novas = [...lista]
      for (let i = 0; i < novas.length; i++) {
        const r = novas[i]
        const { lancamentos, geradoAte } = gerarPendentes(r, hoje, cards)
        if (geradoAte === r.geradoAte) continue
        if (lancamentos.length) guardar(await db.inserirGerados(lancamentos))
        await db.atualizarRecorrencia(r.id, { geradoAte })
        novas[i] = { ...r, geradoAte }
      }
      return novas
    },
    [db, guardar],
  )

  // carga inicial: categorias, cartões, faturas pagas, recorrências e lançamentos de cartão
  useEffect(() => {
    let ativo = true
    ;(async () => {
      try {
        const [cats, cards, fp, recs] = await Promise.all([db.categorias(), db.cartoes(), db.faturasPagas(), db.recorrencias()])
        if (!ativo) return
        setCategorias(porNome(cats))
        setCartoes(porNome(cards))
        setPagas(new Set(fp))
        if (cards.length) guardar(await db.lancamentosDeCartao(somarMes(mesDe(hojeISO()), -6)))
        const geradas = await gerarRecorrentes(recs, cards)
        if (ativo) setRecorrencias(geradas)
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      ativo = false
    }
  }, [db, gerarRecorrentes, guardar])

  // mês visto e o anterior (para comparar no resumo)
  useEffect(() => {
    let ativo = true
    setCarregando(true)
    carregarPeriodo(`${somarMes(mes, -1)}-01`, `${somarMes(mes, 1)}-01`)
      .then(() => ativo && setErro(null))
      .catch((e) => ativo && setErro(e instanceof Error ? e.message : String(e)))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [mes, carregarPeriodo])

  const todos = useMemo(() => {
    void versao
    return recentes([...cache.current.values()])
  }, [versao])
  const doMes = (m: string) => todos.filter((l) => mesDe(l.data) === m)

  const gastoNoMes = async (categoriaId: string, m: string) => {
    await carregarPeriodo(`${m}-01`, `${somarMes(m, 1)}-01`)
    let s = 0
    for (const l of cache.current.values()) if (l.categoriaId === categoriaId && l.tipo === 'saida' && mesDe(l.data) === m) s += l.valor
    return s
  }

  const lancar = async (dados: NovoLancamentoDados, rep: Repeticao): Promise<Lancado> => {
    const plano = montar(dados, rep, cartoesRef.current)
    if (plano.recorrencia) {
      const r = await db.criarRecorrencia(plano.recorrencia)
      const [gerada] = await gerarRecorrentes([r], cartoesRef.current)
      setRecorrencias((a) => [...a, gerada])
      const lancamentos = [...cache.current.values()].filter((l) => l.recorrenciaId === r.id)
      return { lancamentos, recorrencia: gerada }
    }
    const novos = await db.inserir(plano.lancamentos)
    guardar(novos)
    return { lancamentos: novos }
  }

  const remover = async (id: string) => {
    await db.remover([id])
    mexer((m) => m.delete(id))
  }

  const pararRecorrencia = async (id: string) => {
    await db.removerRecorrencia(id)
    setRecorrencias((a) => a.filter((r) => r.id !== id))
    // os lançamentos que já saíram ficam, só perdem o vínculo
    mexer((m) => m.forEach((l, k) => l.recorrenciaId === id && m.set(k, { ...l, recorrenciaId: undefined })))
  }

  const valor: Store = {
    demo,
    mes,
    irParaMes: (n) => setMes((m) => somarMes(m, n)),
    categorias,
    lancamentos: doMes(mes),
    anterior: doMes(somarMes(mes, -1)),
    todos,
    recorrencias,
    cartoes,
    faturasPagas: pagas,
    metas: metasMock,
    carregando,
    erro,
    categoria: (id) => categorias.find((c) => c.id === id),
    cartao: (id) => (id ? cartoes.find((c) => c.id === id) : undefined),
    carregarPeriodo,
    gastoNoMes,
    lancar,
    adicionar: async (l) => (await lancar(l, { tipo: 'unica' })).lancamentos[0],
    desfazerLancado: async (r) => {
      if (r.recorrencia) await pararRecorrencia(r.recorrencia.id)
      const ids = r.lancamentos.map((l) => l.id)
      if (ids.length) await db.remover(ids)
      mexer((m) => ids.forEach((id) => m.delete(id)))
    },
    recategorizar: async (r, cat) => {
      const ids = r.lancamentos.map((l) => l.id)
      if (ids.length) await db.recategorizar(ids, cat.id, cat.tipo)
      let recorrencia = r.recorrencia
      if (recorrencia) {
        await db.atualizarRecorrencia(recorrencia.id, { categoriaId: cat.id, tipo: cat.tipo })
        recorrencia = { ...recorrencia, categoriaId: cat.id, tipo: cat.tipo }
        const rid = recorrencia.id
        setRecorrencias((a) => a.map((x) => (x.id === rid ? { ...x, categoriaId: cat.id, tipo: cat.tipo } : x)))
      }
      const lancamentos = r.lancamentos.map((l) => ({ ...l, categoriaId: cat.id, tipo: cat.tipo }))
      guardar(lancamentos)
      return { lancamentos, recorrencia }
    },
    atualizar: async (id, l) => guardar([await db.atualizar(id, comFatura(l, cartoesRef.current))]),
    remover,
    removerGrupo: async (grupo) => {
      await db.removerGrupo(grupo)
      mexer((m) => m.forEach((l, k) => l.grupo === grupo && m.delete(k)))
    },
    pararRecorrencia,
    criarCategoria: async (c) => {
      const nova = await db.criarCategoria(c)
      setCategorias((a) => porNome([...a, nova]))
    },
    removerCategoria: async (id) => {
      await db.removerCategoria(id)
      setCategorias((a) => a.filter((c) => c.id !== id))
    },
    definirLimite: async (id, limite) => {
      await db.definirLimite(id, limite)
      setCategorias((a) => a.map((c) => (c.id === id ? { ...c, limite } : c)))
    },
    salvarCartao: async (c, id) => {
      const salvo = await db.salvarCartao(c, id)
      setCartoes((a) => porNome([...a.filter((x) => x.id !== salvo.id), salvo]))
      if (!id) guardar(await db.lancamentosDeCartao(somarMes(mesDe(hojeISO()), -6)))
    },
    removerCartao: async (id) => {
      await db.removerCartao(id)
      setCartoes((a) => a.filter((c) => c.id !== id))
      mexer((m) => m.forEach((l, k) => l.cartaoId === id && m.set(k, { ...l, cartaoId: undefined, fatura: undefined })))
    },
    marcarFatura: async (cartaoId, m, paga) => {
      await db.marcarFatura(cartaoId, m, paga)
      setPagas((s) => {
        const n = new Set(s)
        if (paga) n.add(`${cartaoId}:${m}`)
        else n.delete(`${cartaoId}:${m}`)
        return n
      })
    },
  }

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore fora do StoreProvider')
  return s
}
