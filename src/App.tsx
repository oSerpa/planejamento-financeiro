import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { configurado } from './lib/supabase'
import { AuthProvider, useAuth } from './data/auth'
import { StoreProvider } from './data/store'
import { Shell } from './components/Shell'
import { Inicio } from './pages/Inicio'
import { Lancamentos } from './pages/Lancamentos'
import { Metas } from './pages/Metas'
import { Ajustes } from './pages/Ajustes'
import { Entrar } from './pages/Entrar'
import { Configurar } from './pages/Configurar'

function Rotas() {
  const { sessao, carregando } = useAuth()
  if (carregando) return <div className="carregando" aria-label="Carregando" />
  if (!sessao) return <Entrar />
  return (
    // key: trocar de conta zera os dados em memória
    <StoreProvider key={sessao.user.id}>
      <BrowserRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Inicio />} />
            <Route path="lancamentos" element={<Lancamentos />} />
            <Route path="metas" element={<Metas />} />
            <Route path="ajustes" element={<Ajustes />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  )
}

export default function App() {
  if (!configurado) return <Configurar />
  return (
    <AuthProvider>
      <Rotas />
    </AuthProvider>
  )
}
