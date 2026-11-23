import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { hojeISO, mesDe, somarMes } from '../lib/format'
import { metas as metasMock } from './mock'
import type { Categoria, Lancamento, Meta, NovaCategoriaDados, NovoLancamentoDados } from './types'

interface LinhaLancamento {
  id: string
  descricao: string
  valor: number | string
  tipo: Lancamento['tipo']
  categoria_id: string
  data: string
  conta: string | null
}

const deLinha = (r: LinhaLancamento): Lancamento => ({
  id: r.id,
  descricao: r.descricao,
  valor: Number(r.valor),
  tipo: r.tipo,
  categoriaId: r.categoria_id,
  data: r.data,
  conta: r.conta ?? undefined,
})

const paraLinha = (l: NovoLancamentoDados) => ({
  descricao: l.descricao,
  valor: l.valor,
  tipo: l.tipo,
  categoria_id: l.categoriaId,
  data: l.data,
  conta: l.conta ?? null,
})

const COLUNAS_L = 'id, descricao, valor, tipo, categoria_id, data, conta'
const COLUNAS_C = 'id, nome, tipo, cor, icone'

interface Store {
  /** Mês que está sendo visto, "yyyy-mm". */
  mes: string
  irParaMes: (n: number) => void
  categorias: Categoria[]
  lancamentos: Lancamento[]
  metas: Meta[]
  carregando: boolean
  erro: string | null
  categoria: (id: string) => Categoria | undefined
  adicionar: (l: NovoLancamentoDados) => Promise<void>
  atualizar: (id: string, l: NovoLancamentoDados) => Promise<void>
  remover: (id: string) => Promise<void>
  criarCategoria: (c: NovaCategoriaDados) => Promise<void>
  removerCategoria: (id: string) => Promise<void>
}

const Ctx = createContext<Store | null>(null)

/** Erro do Supabase vira exceção com mensagem legível. */
function checar(error: { message: string; code?: string } | null) {
  if (!error) return
  if (error.code === '23503') throw new Error('Essa categoria tem lançamentos. Mude eles de categoria antes de apagar.')
  if (error.code === '23505') throw new Error('Já existe uma categoria com esse nome.')
  throw new Error(error.message)
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [mes, setMes] = useState(() => mesDe(hojeISO()))
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const db = supabase!

  useEffect(() => {
    db.from('categorias')
      .select(COLUNAS_C)
      .order('nome')
      .then(({ data, error }) => {
        if (error) setErro(error.message)
        else setCategorias(data as Categoria[])
      })
  }, [db])

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    db.from('lancamentos')
      .select(COLUNAS_L)
      .gte('data', `${mes}-01`)
      .lt('data', `${somarMes(mes, 1)}-01`)
      .order('data', { ascending: false })
      .order('criado_em', { ascending: false })
      .then(({ data, error }) => {
        if (!ativo) return
        if (error) setErro(error.message)
        else {
          setErro(null)
          setLancamentos((data as LinhaLancamento[]).map(deLinha))
        }
        setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [db, mes])

  const doMes = useCallback((l: Lancamento) => mesDe(l.data) === mes, [mes])

  const adicionar = async (dados: NovoLancamentoDados) => {
    const { data, error } = await db.from('lancamentos').insert(paraLinha(dados)).select(COLUNAS_L).single()
    checar(error)
    const novo = deLinha(data as LinhaLancamento)
    if (doMes(novo)) setLancamentos((a) => [novo, ...a])
  }

  const atualizar = async (id: string, dados: NovoLancamentoDados) => {
    const { data, error } = await db
      .from('lancamentos')
      .update(paraLinha(dados))
      .eq('id', id)
      .select(COLUNAS_L)
      .single()
    checar(error)
    const novo = deLinha(data as LinhaLancamento)
    setLancamentos((a) => {
      const resto = a.filter((l) => l.id !== id)
      return doMes(novo) ? [novo, ...resto] : resto
    })
  }

  const remover = async (id: string) => {
    const { error } = await db.from('lancamentos').delete().eq('id', id)
    checar(error)
    setLancamentos((a) => a.filter((l) => l.id !== id))
  }

  const criarCategoria = async (c: NovaCategoriaDados) => {
    const { data, error } = await db.from('categorias').insert(c).select(COLUNAS_C).single()
    checar(error)
    setCategorias((a) => [...a, data as Categoria].sort((x, y) => x.nome.localeCompare(y.nome)))
  }

  const removerCategoria = async (id: string) => {
    const { error } = await db.from('categorias').delete().eq('id', id)
    checar(error)
    setCategorias((a) => a.filter((c) => c.id !== id))
  }

  const valor: Store = {
    mes,
    irParaMes: (n) => setMes((m) => somarMes(m, n)),
    categorias,
    lancamentos,
    metas: metasMock,
    carregando,
    erro,
    categoria: (id) => categorias.find((c) => c.id === id),
    adicionar,
    atualizar,
    remover,
    criarCategoria,
    removerCategoria,
  }

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore fora do StoreProvider')
  return s
}
