import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface Auth {
  sessao: Session | null
  carregando: boolean
  nome: string
  sair: () => Promise<void>
}

const Ctx = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session)
      setCarregando(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSessao(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const usuario = sessao?.user
  const nome = (usuario?.user_metadata?.nome as string | undefined) || usuario?.email?.split('@')[0] || ''

  const sair = async () => {
    await supabase?.auth.signOut()
  }

  return <Ctx.Provider value={{ sessao, carregando, nome, sair }}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const a = useContext(Ctx)
  if (!a) throw new Error('useAuth fora do AuthProvider')
  return a
}
