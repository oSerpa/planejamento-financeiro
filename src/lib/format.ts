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

/** Data de hoje no fuso do aparelho, em yyyy-mm-dd. */
export function hojeISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** "2026-11" a partir de "2026-11-23". */
export const mesDe = (iso: string) => iso.slice(0, 7)

/** Soma meses a um "yyyy-mm". */
export function somarMes(mes: string, n: number) {
  const [a, m] = mes.split('-').map(Number)
  const d = new Date(a, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Lê "1.234,56", "12,5" ou "12.50" e devolve número. */
export function lerValor(texto: string) {
  const t = texto.trim()
  if (!t.includes(',') && /^\d+\.\d{1,2}$/.test(t)) return Number(t)
  return Number(t.replace(/\./g, '').replace(',', '.'))
}

/** 12.5 vira "12,50" para preencher o campo de valor. */
export const valorParaCampo = (v: number) => v.toFixed(2).replace('.', ',')

/** Soma dias a um "yyyy-mm-dd". */
export function isoDeslocado(iso: string, dias: number) {
  const d = parseISO(iso)
  d.setDate(d.getDate() + dias)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
