/** Estado vazio com um desenho simples em traço, no lugar de só um texto cinza. */
export function Vazio({ tipo, titulo, texto }: { tipo: 'lista' | 'gastos'; titulo: string; texto: string }) {
  return (
    <div className="vazio-v2">
      <svg viewBox="0 0 120 84" className="vazio-v2__desenho" aria-hidden>
        {tipo === 'lista' ? (
          <>
            <rect x="26" y="8" width="68" height="68" rx="10" className="t-fundo" />
            <rect x="36" y="22" width="12" height="12" rx="4" className="t-cor" />
            <rect x="54" y="24" width="30" height="4" rx="2" className="t-linha" />
            <rect x="54" y="30" width="18" height="3" rx="1.5" className="t-linha t-claro" />
            <rect x="36" y="44" width="12" height="12" rx="4" className="t-linha t-claro" />
            <rect x="54" y="46" width="26" height="4" rx="2" className="t-linha t-claro" />
            <circle cx="92" cy="66" r="12" className="t-cor" />
            <path d="M92 60v12M86 66h12" className="t-mais" />
          </>
        ) : (
          <>
            <circle cx="60" cy="42" r="28" className="t-fundo" />
            <path d="M60 14a28 28 0 0 1 26.6 19.3L60 42Z" className="t-cor" />
            <circle cx="60" cy="42" r="12" className="t-miolo" />
          </>
        )}
      </svg>
      <p className="vazio-v2__titulo">{titulo}</p>
      <p className="vazio-v2__texto">{texto}</p>
    </div>
  )
}
