import { NavLink, Outlet } from 'react-router-dom'
import { Flag, House, Plus, ReceiptText, Settings } from 'lucide-react'
import { useState } from 'react'
import { NovoLancamento } from './NovoLancamento'

const abas = [
  { to: '/', label: 'Início', icon: House },
  { to: '/lancamentos', label: 'Lançamentos', icon: ReceiptText },
  { to: '/metas', label: 'Metas', icon: Flag },
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

      <nav className="abas" aria-label="Navegação">
        {abas.map(({ to, label, icon: I }) => (
          <NavLink key={to} to={to} end className="abas__link">
            <I size={22} strokeWidth={1.75} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <button className="fab" onClick={() => setAberto(true)} aria-label="Novo lançamento">
        <Plus size={26} strokeWidth={2.25} />
      </button>

      {aberto && <NovoLancamento onFechar={() => setAberto(false)} />}
    </div>
  )
}
