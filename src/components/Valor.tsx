import { partesDinheiro } from '../lib/format'

interface Props {
  valor: number
  sinal?: 'entrada' | 'saida'
  className?: string
}

/** Valor em reais com centavos menores, como num extrato. */
export function Valor({ valor, sinal, className = '' }: Props) {
  const { inteiro, centavos } = partesDinheiro(valor)
  const prefixo = sinal === 'entrada' ? '+ ' : sinal === 'saida' ? '− ' : valor < 0 ? '− ' : ''
  return (
    <span className={`valor ${sinal ? `valor--${sinal}` : ''} ${className}`}>
      {prefixo}
      <span className="valor__moeda">R$</span>
      {inteiro}
      <span className="valor__cent">,{centavos}</span>
    </span>
  )
}
