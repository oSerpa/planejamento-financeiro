export function Barra({ pct, cor }: { pct: number; cor: string }) {
  return (
    <div className="barra" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="barra__fill" style={{ width: `${Math.min(100, pct)}%`, background: cor }} />
    </div>
  )
}
