import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './data/auth'
import { StoreProvider } from './data/store'
import { Shell } from './components/Shell'
import { Inicio } from './pages/Inicio'
import { Chat } from './pages/Chat'
import { ChatProvider } from './data/chat'
import { Lancamentos } from './pages/Lancamentos'
import { Metas } from './pages/Metas'
import { Ajustes } from './pages/Ajustes'
import { Cartoes } from './pages/Cartoes'
import { Entrar } from './pages/Entrar'

function Rotas() {
  const { sessao, carregando } = useAuth()
  if (carregando) return <div className="carregando" aria-label="Carregando" />
  if (!sessao) return <Entrar />
  return (
    // key: trocar de conta zera os dados em memória
    <StoreProvider key={sessao.user.id}>
      <ChatProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Shell />}>
              <Route index element={<Chat />} />
              <Route path="resumo" element={<Inicio />} />
              <Route path="lancamentos" element={<Lancamentos />} />
              <Route path="metas" element={<Metas />} />
              <Route path="cartoes" element={<Cartoes />} />
              <Route path="ajustes" element={<Ajustes />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ChatProvider>
    </StoreProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Rotas />
    </AuthProvider>
  )
}
