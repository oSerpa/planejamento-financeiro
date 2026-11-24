import { describe, expect, test } from 'vitest'
import { EXEMPLOS, EXEMPLOS_MAIS, ehPergunta, interpretar, lerOrcamento } from './interpretar'
import { categoriasDemo } from '../data/demo'

const HOJE = '2026-11-23'
const ler = (frase: string) => interpretar(frase, categoriasDemo, {}, HOJE)
const nomeCat = (id: string) => categoriasDemo.find((c) => c.id === id)?.nome

describe('frases de exemplo do chat', () => {
  test('gastei 35 no ifood', () => {
    const [l] = ler('gastei 35 no ifood')
    expect(l).toMatchObject({ valor: 35, tipo: 'saida', data: HOJE })
    expect(nomeCat(l.categoriaId)).toBe('Alimentação')
  })

  test('recebi 2000 de salário', () => {
    const [l] = ler('recebi 2000 de salário')
    expect(l).toMatchObject({ valor: 2000, tipo: 'entrada' })
    expect(nomeCat(l.categoriaId)).toBe('Salário')
  })

  test('uber 18,50 ontem', () => {
    const [l] = ler('uber 18,50 ontem')
    expect(l).toMatchObject({ valor: 18.5, tipo: 'saida', data: '2026-11-22' })
    expect(nomeCat(l.categoriaId)).toBe('Transporte')
  })

  test('netflix 55 todo mês', () => {
    const [l] = ler('netflix 55 todo mês')
    expect(l).toMatchObject({ valor: 55, repeticao: { tipo: 'mensal' } })
  })

  test('tv 2000 em 10x', () => {
    const [l] = ler('tv 2000 em 10x')
    expect(l).toMatchObject({ valor: 2000, repeticao: { tipo: 'parcelado', parcelas: 10 } })
  })

  test('orçamento mercado 800', () => {
    expect(lerOrcamento('orçamento mercado 800', categoriasDemo)).toMatchObject({ valor: 800, categoria: { nome: 'Mercado' } })
  })

  test('todos os exemplos são entendidos', () => {
    for (const frase of [...EXEMPLOS, ...EXEMPLOS_MAIS]) {
      const entendeu = ehPergunta(frase) || lerOrcamento(frase, categoriasDemo) || ler(frase).length > 0
      expect(entendeu, frase).toBeTruthy()
    }
  })

  test('dois lançamentos na mesma frase', () => {
    expect(ler('gastei 35 no ifood e 20 de uber').map((l) => l.valor)).toEqual([35, 20])
  })

  test('sem categorias não lança (o chat avisa em vez de dizer que faltou valor)', () => {
    expect(interpretar('gastei 35 no ifood', [], {}, HOJE)).toEqual([])
  })
})
