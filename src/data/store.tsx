import { createContext, useContext, useState, type ReactNode } from 'react'
import { lancamentos as iniciais, metas as metasIniciais } from './mock'
import type { Lancamento, Meta } from './types'

interface Store {
  lancamentos: Lancamento[]
  metas: Meta[]
  adicionar: (l: Omit<Lancamento, 'id'>) => void
}

const Ctx = createContext<Store | null>(null)

/** Estado em memória. No passo 2 isso vira Supabase. */
export function StoreProvider({ children }: { children: ReactNode }) {
  const [lancamentos, setLancamentos] = useState(iniciais)
  const [metas] = useState(metasIniciais)
  const adicionar = (l: Omit<Lancamento, 'id'>) =>
    setLancamentos((atual) => [...atual, { ...l, id: crypto.randomUUID() }])
  return <Ctx.Provider value={{ lancamentos, metas, adicionar }}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore fora do StoreProvider')
  return s
}
