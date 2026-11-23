const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const dinheiro = (v: number) => brl.format(v)

/** Separa "R$ 1.234,56" em partes para estilizar os centavos. */
export function partesDinheiro(v: number) {
  const [inteiro, centavos] = brl.format(Math.abs(v)).replace('R$', '').trim().split(',')
  return { inteiro, centavos }
}

export function parseISO(iso: string) {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d)
}

export function diaRelativo(iso: string, hojeISO: string) {
  const dif = Math.round((parseISO(hojeISO).getTime() - parseISO(iso).getTime()) / 86400000)
  if (dif === 0) return 'Hoje'
  if (dif === 1) return 'Ontem'
  return parseISO(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })
}

export const nomeMes = (iso: string) =>
  parseISO(iso).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

export function mesesAte(prazoISO: string, hojeISO: string) {
  const a = parseISO(hojeISO)
  const b = parseISO(prazoISO)
  return Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()))
}
