import type { Cartao, Categoria, Lancamento, Recorrencia } from './types'
import type { Backend } from './store'
import { hojeISO, mesDe, parseISO, somarMes } from '../lib/format'
import { dividir, faturaDe, somarMesesData } from '../lib/financas'

/** Mesmas categorias que o schema.sql cria para conta nova. */
export const categoriasDemo: Categoria[] = [
  { id: 'c-sal', nome: 'Salário', tipo: 'entrada', cor: '#3F7D58', icone: 'briefcase' },
  { id: 'c-fre', nome: 'Freela', tipo: 'entrada', cor: '#6B8F3A', icone: 'laptop' },
  { id: 'c-oe', nome: 'Outras entradas', tipo: 'entrada', cor: '#8A928C', icone: 'circle' },
  { id: 'c-mor', nome: 'Moradia', tipo: 'saida', cor: '#C2553A', icone: 'home' },
  { limite: 650, id: 'c-mer', nome: 'Mercado', tipo: 'saida', cor: '#D08A2E', icone: 'cart' },
  { limite: 150, id: 'c-ali', nome: 'Alimentação', tipo: 'saida', cor: '#B8642E', icone: 'food' },
  { limite: 200, id: 'c-tra', nome: 'Transporte', tipo: 'saida', cor: '#4E6E8E', icone: 'bus' },
  { limite: 120, id: 'c-laz', nome: 'Lazer', tipo: 'saida', cor: '#8C5A9E', icone: 'ticket' },
  { id: 'c-sau', nome: 'Saúde', tipo: 'saida', cor: '#3E8E8A', icone: 'heart' },
  { limite: 80, id: 'c-ass', nome: 'Assinaturas', tipo: 'saida', cor: '#9A6B4F', icone: 'repeat' },
  { id: 'c-est', nome: 'Estudos', tipo: 'saida', cor: '#5A6BB0', icone: 'book' },
  { id: 'c-og', nome: 'Outros gastos', tipo: 'saida', cor: '#8A928C', icone: 'circle' },
].map((c) => ({ limite: null, ...c })).sort((a, b) => a.nome.localeCompare(b.nome)) as Categoria[]

export const cartoesDemo: Cartao[] = [
  { id: 'k-nu', nome: 'Nubank', limite: 2500, fechamento: 3, vencimento: 10, cor: '#7A3FA0' },
  { id: 'k-in', nome: 'Inter', limite: 1200, fechamento: 25, vencimento: 5, cor: '#D9752B' },
]

type Modelo = [dia: number, descricao: string, valor: number, categoriaId: string, conta?: string]

/** Itens do modelo que são recorrentes (índice no array abaixo). */
const RECORRENTES = [1, 5, 6, 16, 18]

const modelo: Modelo[] = [
  [5, 'Salário', 3200, 'c-sal', 'Conta'],
  [5, 'Aluguel', 1150, 'c-mor', 'Conta'],
  [6, 'Faculdade', 389.9, 'c-est', 'Conta'],
  [7, 'Mercado do mês', 412.37, 'c-mer', 'k-nu'],
  [8, 'Bilhete único', 120, 'c-tra', 'Conta'],
  [9, 'Spotify', 21.9, 'c-ass', 'k-nu'],
  [10, 'Netflix', 44.9, 'c-ass', 'k-nu'],
  [11, 'Farmácia', 63.4, 'c-sau', 'Débito'],
  [12, 'Cinema com a galera', 58, 'c-laz', 'k-nu'],
  [14, 'Freela de site', 600, 'c-fre', 'Pix'],
  [15, 'Hortifruti', 47.85, 'c-mer', 'Débito'],
  [16, 'Uber pra casa', 26.7, 'c-tra', 'k-nu'],
  [18, 'Conta de luz', 138.2, 'c-mor', 'Conta'],
  [19, 'Livro de SQL', 79.9, 'c-est', 'k-nu'],
  [20, 'Pizza de sexta', 72, 'c-ali', 'Pix'],
  [21, 'Padaria', 18.5, 'c-mer', 'Débito'],
  [22, 'Internet', 99.9, 'c-mor', 'Conta'],
  [23, 'Mercado da semana', 156.3, 'c-mer', 'k-in'],
  [25, 'Academia', 89.9, 'c-sau', 'k-nu'],
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
      const fator = cat.tipo === 'saida' && i % 3 !== 0 && !RECORRENTES.includes(i) ? 1 + ((n * 7 + i) % 5) * 0.06 : 1
      const cartao = cartoesDemo.find((c) => c.id === conta)
      lista.push({
        id: `d-${mes}-${i}`,
        descricao,
        valor: Math.round(valor * fator * 100) / 100,
        tipo: cat.tipo,
        categoriaId,
        data,
        conta: cartao ? undefined : conta,
        cartaoId: cartao?.id,
        fatura: cartao ? faturaDe(data, cartao) : undefined,
        recorrenciaId: RECORRENTES.includes(i) ? `r-${i}` : undefined,
      })
    })
  }
  // um fone parcelado em 6x no Nubank, comprado há dois meses
  const compra = `${somarMes(mesAtual, -2)}-17`
  const nu = cartoesDemo[0]
  dividir(479.4, 6).forEach((valor, k) => {
    const data = somarMesesData(compra, k)
    lista.push({
      id: `d-fone-${k}`,
      descricao: 'Fone bluetooth',
      valor,
      tipo: 'saida',
      categoriaId: 'c-og',
      data,
      grupo: 'g-fone',
      parcela: k + 1,
      parcelas: 6,
      cartaoId: nu.id,
      fatura: somarMes(faturaDe(compra, nu), k),
    })
  })
  return lista
}

export function recorrenciasDemo(): Recorrencia[] {
  const hoje = hojeISO()
  const dHoje = parseISO(hoje).getDate()
  return RECORRENTES.map((i) => {
    const [dia, descricao, valor, categoriaId, conta] = modelo[i]
    const cartao = cartoesDemo.find((c) => c.id === conta)
    return {
      id: `r-${i}`,
      descricao,
      valor,
      tipo: 'saida',
      categoriaId,
      cartaoId: cartao?.id,
      dia,
      inicio: `${somarMes(mesDe(hoje), -2)}-01`,
      geradoAte: dia <= dHoje ? mesDe(hoje) : somarMes(mesDe(hoje), -1),
    }
  })
}

/** Banco de mentira em memória: some ao recarregar. */
export function criarBackendDemo(): Backend {
  let cats = categoriasDemo.map((c) => ({ ...c }))
  let ls = lancamentosDemo()
  let recs = recorrenciasDemo()
  let cards = cartoesDemo.map((c) => ({ ...c }))
  let pagas = new Set<string>()
  // faturas que já venceram começam pagas
  for (const c of cards) for (let n = -4; n <= 0; n++) {
    const m = somarMes(mesDe(hojeISO()), n)
    if (`${m}-${String(c.vencimento).padStart(2, '0')}` < hojeISO()) pagas.add(`${c.id}:${m}`)
  }
  const novoId = () => `d-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const espera = <T,>(v: T) => Promise.resolve(structuredClone(v))
  const erro = (msg: string) => Promise.reject(new Error(msg))

  return {
    categorias: () => espera(cats),
    criarCategoria(c) {
      if (cats.some((x) => x.tipo === c.tipo && x.nome === c.nome)) return erro('Já existe uma categoria com esse nome.')
      const nova = { limite: null, ...c, id: novoId() }
      cats = [...cats, nova]
      return espera(nova)
    },
    removerCategoria(id) {
      if (ls.some((l) => l.categoriaId === id)) return erro('Essa categoria tem lançamentos. Mude eles de categoria antes de apagar.')
      cats = cats.filter((c) => c.id !== id)
      recs = recs.filter((r) => r.categoriaId !== id)
      return espera(undefined)
    },
    definirLimite(id, limite) {
      cats = cats.map((c) => (c.id === id ? { ...c, limite } : c))
      return espera(undefined)
    },
    lancamentosEntre: (ini, fim) => espera(ls.filter((l) => l.data >= ini && l.data < fim)),
    lancamentosDeCartao: (desde) => espera(ls.filter((l) => l.cartaoId && (l.fatura ?? '') >= desde)),
    inserir(novos) {
      const com = novos.map((l) => ({ ...l, id: novoId() }))
      ls = [...com, ...ls]
      return espera(com)
    },
    inserirGerados(novos) {
      const faltam = novos.filter((n) => !ls.some((l) => l.recorrenciaId === n.recorrenciaId && l.data === n.data))
      const com = faltam.map((l) => ({ ...l, id: novoId() }))
      ls = [...com, ...ls]
      return espera(com)
    },
    atualizar(id, l) {
      const novo = { ...l, id }
      ls = ls.map((x) => (x.id === id ? novo : x))
      return espera(novo)
    },
    recategorizar(ids, categoriaId, tipo) {
      ls = ls.map((l) => (ids.includes(l.id) ? { ...l, categoriaId, tipo } : l))
      return espera(undefined)
    },
    remover(ids) {
      ls = ls.filter((l) => !ids.includes(l.id))
      return espera(undefined)
    },
    removerGrupo(grupo) {
      ls = ls.filter((l) => l.grupo !== grupo)
      return espera(undefined)
    },
    recorrencias: () => espera(recs),
    criarRecorrencia(r) {
      const nova = { ...r, id: novoId() }
      recs = [...recs, nova]
      return espera(nova)
    },
    atualizarRecorrencia(id, campos) {
      recs = recs.map((r) => (r.id === id ? { ...r, ...campos } : r))
      return espera(undefined)
    },
    removerRecorrencia(id) {
      recs = recs.filter((r) => r.id !== id)
      ls = ls.map((l) => (l.recorrenciaId === id ? { ...l, recorrenciaId: undefined } : l))
      return espera(undefined)
    },
    cartoes: () => espera(cards),
    salvarCartao(c, id) {
      if (cards.some((x) => x.nome === c.nome && x.id !== id)) return erro('Já existe um cartão com esse nome.')
      const salvo = { ...c, id: id ?? novoId() }
      cards = [...cards.filter((x) => x.id !== salvo.id), salvo]
      return espera(salvo)
    },
    removerCartao(id) {
      cards = cards.filter((c) => c.id !== id)
      ls = ls.map((l) => (l.cartaoId === id ? { ...l, cartaoId: undefined, fatura: undefined } : l))
      return espera(undefined)
    },
    faturasPagas: () => espera([...pagas]),
    marcarFatura(cartaoId, mes, paga) {
      pagas = new Set(pagas)
      if (paga) pagas.add(`${cartaoId}:${mes}`)
      else pagas.delete(`${cartaoId}:${mes}`)
      return espera(undefined)
    },
  }
}
