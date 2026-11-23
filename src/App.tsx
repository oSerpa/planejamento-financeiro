import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { StoreProvider } from './data/store'
import { Shell } from './components/Shell'
import { Inicio } from './pages/Inicio'
import { Lancamentos } from './pages/Lancamentos'
import { Metas } from './pages/Metas'

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Inicio />} />
            <Route path="lancamentos" element={<Lancamentos />} />
            <Route path="metas" element={<Metas />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  )
}
