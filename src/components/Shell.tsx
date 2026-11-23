import { NavLink, Outlet } from 'react-router-dom'
import { CreditCard, Flag, LayoutGrid, MessageCircle, Plus, ReceiptText, Settings } from 'lucide-react'
import { useState } from 'react'
import { NovoLancamento } from './NovoLancamento'

const abas = [
  { to: '/', label: 'Chat', icon: MessageCircle },
  { to: '/resumo', label: 'Resumo', icon: LayoutGrid },
  { to: '/lancamentos', label: 'Extrato', icon: ReceiptText },
  { to: '/metas', label: 'Metas', icon: Flag },
  { to: '/cartoes', label: 'Cartões', icon: CreditCard },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
]

export function Shell() {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="shell">
      <aside className="lateral">
        <div className="marca">
          <span className="marca__selo">c</span>
          <span className="marca__nome">caixinha</span>
        </div>
        <nav className="lateral__nav">
          {abas.map(({ to, label, icon: I }) => (
            <NavLink key={to} to={to} end className="lateral__link">
              <I size={19} strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>
        <button className="btn btn--primario lateral__novo" onClick={() => setAberto(true)}>
          <Plus size={18} /> Novo lançamento
        </button>
      </aside>

      <main className="conteudo">
        <Outlet />
      </main>

      <nav className="doca" aria-label="Navegação">
        {abas.slice(0, 2).map(({ to, label, icon: I }) => (
          <NavLink key={to} to={to} end className="doca__link">
            <I size={21} strokeWidth={1.9} />
            <span>{label}</span>
          </NavLink>
        ))}
        <button className="doca__mais" onClick={() => setAberto(true)} aria-label="Novo lançamento">
          <Plus size={24} strokeWidth={2.5} />
        </button>
        {abas.slice(2, 4).map(({ to, label, icon: I }) => (
          <NavLink key={to} to={to} end className="doca__link">
            <I size={21} strokeWidth={1.9} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {aberto && <NovoLancamento onFechar={() => setAberto(false)} />}
    </div>
  )
}
