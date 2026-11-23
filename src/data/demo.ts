import type { Categoria, Lancamento } from './types'
import { hojeISO, somarMes } from '../lib/format'

/** Mesmas categorias que o schema.sql cria para conta nova. */
export const categoriasDemo: Categoria[] = [
  { id: 'c-sal', nome: 'Salário', tipo: 'entrada', cor: '#3F7D58', icone: 'briefcase' },
  { id: 'c-fre', nome: 'Freela', tipo: 'entrada', cor: '#6B8F3A', icone: 'laptop' },
  { id: 'c-oe', nome: 'Outras entradas', tipo: 'entrada', cor: '#8A928C', icone: 'circle' },
  { id: 'c-mor', nome: 'Moradia', tipo: 'saida', cor: '#C2553A', icone: 'home' },
  { id: 'c-mer', nome: 'Mercado', tipo: 'saida', cor: '#D08A2E', icone: 'cart' },
  { id: 'c-tra', nome: 'Transporte', tipo: 'saida', cor: '#4E6E8E', icone: 'bus' },
  { id: 'c-laz', nome: 'Lazer', tipo: 'saida', cor: '#8C5A9E', icone: 'ticket' },
  { id: 'c-sau', nome: 'Saúde', tipo: 'saida', cor: '#3E8E8A', icone: 'heart' },
  { id: 'c-ass', nome: 'Assinaturas', tipo: 'saida', cor: '#9A6B4F', icone: 'repeat' },
  { id: 'c-est', nome: 'Estudos', tipo: 'saida', cor: '#5A6BB0', icone: 'book' },
  { id: 'c-og', nome: 'Outros gastos', tipo: 'saida', cor: '#8A928C', icone: 'circle' },
].sort((a, b) => a.nome.localeCompare(b.nome)) as Categoria[]

type Modelo = [dia: number, descricao: string, valor: number, categoriaId: string, conta?: string]

const modelo: Modelo[] = [
  [5, 'Salário', 3200, 'c-sal', 'Nubank'],
  [5, 'Aluguel', 1150, 'c-mor', 'Nubank'],
  [6, 'Faculdade', 389.9, 'c-est', 'Nubank'],
  [7, 'Mercado do mês', 412.37, 'c-mer', 'Crédito'],
  [8, 'Bilhete único', 120, 'c-tra', 'Nubank'],
  [9, 'Spotify', 21.9, 'c-ass', 'Crédito'],
  [10, 'Netflix', 44.9, 'c-ass', 'Crédito'],
  [11, 'Farmácia', 63.4, 'c-sau', 'Débito'],
  [12, 'Cinema com a galera', 58, 'c-laz', 'Crédito'],
  [14, 'Freela de site', 600, 'c-fre', 'Pix'],
  [15, 'Hortifruti', 47.85, 'c-mer', 'Débito'],
  [16, 'Uber pra casa', 26.7, 'c-tra', 'Crédito'],
  [18, 'Conta de luz', 138.2, 'c-mor', 'Nubank'],
  [19, 'Livro de SQL', 79.9, 'c-est', 'Crédito'],
  [20, 'Pizza de sexta', 72, 'c-laz', 'Pix'],
  [21, 'Padaria', 18.5, 'c-mer', 'Débito'],
  [22, 'Internet', 99.9, 'c-mor', 'Nubank'],
  [23, 'Mercado da semana', 156.3, 'c-mer', 'Crédito'],
  [25, 'Academia', 89.9, 'c-sau', 'Crédito'],
  [27, 'Presente de aniversário', 95, 'c-og', 'Pix'],
]

/** Três meses de exemplo até hoje, para dar para ver as telas sem banco. */
export function lancamentosDemo(): Lancamento[] {
  const hoje = hojeISO()
  const mesAtual = hoje.slice(0, 7)
  const lista: Lancamento[] = []
  for (let n = -2; n <= 0; n++) {
    const mes = somarMes(mesAtual, n)
    modelo.forEach(([dia, descricao, valor, categoriaId, conta], i) => {
      const data = `${mes}-${String(dia).padStart(2, '0')}`
      if (data > hoje) return
      const cat = categoriasDemo.find((c) => c.id === categoriaId)!
      // varia um pouco os gastos de um mês para o outro
      const fator = cat.tipo === 'saida' && i % 3 !== 0 ? 1 + ((n * 7 + i) % 5) * 0.06 : 1
      lista.push({
        id: `d-${mes}-${i}`,
        descricao,
        valor: Math.round(valor * fator * 100) / 100,
        tipo: cat.tipo,
        categoriaId,
        data,
        conta,
      })
    })
  }
  return lista
}
