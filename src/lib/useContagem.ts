import { useEffect, useRef, useState } from 'react'

/** Anima um número do valor anterior até o novo (efeito de "contagem"). */
export function useContagem(alvo: number, ms = 700) {
  const [atual, setAtual] = useState(alvo)
  const de = useRef(alvo)

  useEffect(() => {
    const inicio = de.current
    if (inicio === alvo || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      de.current = alvo
      setAtual(alvo)
      return
    }
    const t0 = performance.now()
    let raf = 0
    const passo = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      const suave = 1 - Math.pow(1 - p, 3)
      const v = inicio + (alvo - inicio) * suave
      setAtual(v)
      de.current = v
      if (p < 1) raf = requestAnimationFrame(passo)
    }
    raf = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(raf)
  }, [alvo, ms])

  return atual
}
