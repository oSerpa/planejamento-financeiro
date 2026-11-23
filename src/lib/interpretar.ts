import type { Cartao, Categoria, Repeticao, TipoLancamento } from '../data/types'
import { isoDeslocado, lerValor, mesDe, parseISO, somarMes } from './format'
import { dataNoMes } from './financas'

/**
 * Lê frases como "gastei 35 no ifood ontem" e devolve o lançamento.
 * Tudo por palavras-chave, roda offline e sem custo.
 */

/** Tira acento e deixa minúsculo: "Salário" vira "salario". */
export const normalizar = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/** Palavras que o usuário já ensinou: palavra normalizada -> id da categoria. */
export type Aprendidas = Record<string, string>

/** Como a categoria foi escolhida. "padrao" quer dizer que não reconheceu. */
export type Origem = 'aprendida' | 'nome' | 'palavra' | 'padrao'

export interface Interpretado {
  valor: number
  tipo: TipoLancamento
  categoriaId: string
  data: string
  descricao: string
  origem: Origem
  /** Palavras da descrição, usadas para aprender se a categoria for corrigida. */
  palavras: string[]
  /** "todo mês" vira mensal, "em 10x" vira parcelado. */
  repeticao: Repeticao
  cartaoId?: string
}

const VERBOS_ENTRADA = new Set([
  'recebi', 'receber', 'recebido', 'recebimento', 'ganhei', 'ganho', 'entrou', 'entrada', 'caiu',
  'vendi', 'venda', 'rendeu', 'rendimento', 'reembolso', 'reembolsaram', 'devolveram', 'pagaram', 'mesada',
])
const VERBOS_SAIDA = new Set([
  'gastei', 'gasto', 'gastar', 'paguei', 'pagar', 'pago', 'comprei', 'compra', 'saiu', 'saida',
  'torrei', 'transferi', 'mandei', 'doei', 'assinei', 'abasteci', 'parcelei', 'passei',
])

const VAZIAS = new Set([
  'no', 'na', 'nos', 'nas', 'de', 'do', 'da', 'dos', 'das', 'em', 'pro', 'pra', 'para', 'por', 'com', 'o', 'a',
  'os', 'as', 'um', 'uma', 'e', 'meu', 'minha', 'meus', 'minhas', 'mais', 'foi', 'foram', 'eu', 'me', 'hj', 'hoje',
  'ontem', 'anteontem', 'dia', 'reais', 'real', 'r$', 'conto', 'contos', 'pila', 'mil', 'k', 'passada', 'passado',
  'que', 'ai', 'la', 'so', 'tipo', 'num', 'numa', 'valor', 'agora', 'pix', 'via', 'cartao', 'credito', 'debito',
  'todo', 'toda', 'todos', 'mes', 'meses', 'mensal', 'mensalmente', 'vezes', 'parcelas', 'parcelado', 'parcelada', 'x', 'sem', 'juros',
  ...VERBOS_ENTRADA, ...VERBOS_SAIDA,
])

/** Palavra-chave -> nomes de categoria que servem, do mais provável ao menos. */
const DICIONARIO: { dicas: string[]; palavras: string[] }[] = [
  {
    dicas: ['alimentacao', 'comida', 'restaurante', 'delivery', 'lanches', 'lazer'],
    palavras: [
      'ifood', 'rappi', 'restaurante', 'lanche', 'lanchonete', 'almoco', 'almocei', 'janta', 'jantar', 'jantei',
      'pizza', 'hamburguer', 'burger', 'mcdonalds', 'mc', 'bk', 'sushi', 'acai', 'cafe', 'marmita', 'comida',
      'delivery', 'sorvete', 'pastel', 'salgado', 'coxinha', 'esfiha', 'churrasco', 'temaki', 'refri',
    ],
  },
  {
    dicas: ['mercado', 'supermercado', 'compras', 'alimentacao'],
    palavras: [
      'mercado', 'supermercado', 'feira', 'hortifruti', 'sacolao', 'atacadao', 'assai', 'carrefour', 'padaria',
      'acougue', 'pao', 'compras',
    ],
  },
  {
    dicas: ['transporte', 'carro', 'mobilidade'],
    palavras: [
      'uber', '99pop', 'taxi', 'onibus', 'metro', 'bilhete', 'gasolina', 'combustivel', 'posto', 'etanol',
      'estacionamento', 'pedagio', 'passagem', 'trem', 'cabify', 'brt', 'abasteci', 'moto', 'mecanico', 'oficina',
    ],
  },
  {
    dicas: ['moradia', 'casa', 'contas'],
    palavras: [
      'aluguel', 'condominio', 'luz', 'energia', 'agua', 'internet', 'gas', 'iptu', 'enel', 'sabesp', 'wifi',
      'faxina', 'diarista',
    ],
  },
  {
    dicas: ['saude', 'farmacia'],
    palavras: [
      'farmacia', 'remedio', 'remedios', 'medico', 'consulta', 'dentista', 'exame', 'academia', 'drogasil',
      'drogaria', 'psicologo', 'terapia', 'smartfit', 'hospital', 'vacina',
    ],
  },
  {
    dicas: ['lazer', 'diversao'],
    palavras: [
      'cinema', 'show', 'bar', 'cerveja', 'breja', 'balada', 'festa', 'jogo', 'steam', 'ingresso', 'role',
      'praia', 'viagem', 'passeio', 'teatro', 'boliche', 'psn', 'xbox',
    ],
  },
  {
    dicas: ['assinaturas', 'assinatura', 'streaming'],
    palavras: [
      'netflix', 'spotify', 'prime', 'disney', 'hbo', 'max', 'youtube', 'globoplay', 'icloud', 'deezer',
      'assinatura', 'crunchyroll', 'chatgpt', 'paramount', 'apple',
    ],
  },
  {
    dicas: ['estudos', 'educacao', 'faculdade'],
    palavras: ['faculdade', 'curso', 'livro', 'livros', 'apostila', 'udemy', 'alura', 'escola', 'material', 'mensalidade', 'xerox'],
  },
  { dicas: ['vestuario', 'roupas', 'compras', 'outros gastos'], palavras: ['roupa', 'roupas', 'tenis', 'camisa', 'calca', 'shein', 'renner'] },
  { dicas: ['salario'], palavras: ['salario', 'holerite', 'adiantamento', 'decimo', '13o', 'ferias', 'vale'] },
  { dicas: ['freela', 'freelance', 'trabalho extra'], palavras: ['freela', 'freelance', 'job', 'bico', 'cliente', 'projeto'] },
  { dicas: ['outras entradas'], palavras: ['reembolso', 'rendimento', 'rendeu', 'venda', 'vendi', 'cashback', 'mesada', 'presente'] },
]

/** Jeito bonito de escrever algumas marcas na descrição. */
const GRAFIAS: Record<string, string> = {
  ifood: 'iFood', mcdonalds: "McDonald's", mc: "McDonald's", bk: 'Burger King', '99pop': '99', hbo: 'HBO',
  psn: 'PSN', chatgpt: 'ChatGPT', youtube: 'YouTube', icloud: 'iCloud', iptu: 'IPTU', brt: 'BRT', '13o': '13º', tv: 'TV',
}

const DIAS_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']

const RE_VALOR = /^(?:r\$)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(k|mil|reais|real|conto|contos)?$/

interface Pedaco {
  original: string
  norm: string
}

function quebrar(texto: string): Pedaco[] {
  return texto
    .split(/\s+/)
    .map((t) => t.replace(/^[("'“]+|[)"'”.,!?;:]+$/g, ''))
    .filter(Boolean)
    .map((original) => ({ original, norm: normalizar(original) }))
}

function acharValor(p: Pedaco[], ignorar = new Set<number>()): { valor: number; usados: Set<number> } | null {
  const opcoes: { valor: number; usados: number[]; forte: boolean }[] = []
  p.forEach((t, i) => {
    if (ignorar.has(i)) return
    const m = RE_VALOR.exec(t.norm)
    if (!m) return
    const ant = p[i - 1]?.norm
    // "dia 12" e "às 14" não são dinheiro
    if (ant === 'dia' || ant === 'as' || ant === 'x') return
    let valor = lerValor(m[1])
    const usados = [i]
    let forte = t.norm.startsWith('r$') || ant === 'r$' || Boolean(m[2])
    let sufixo = m[2]
    const prox = p[i + 1]?.norm
    if (!sufixo && prox && ['mil', 'k', 'reais', 'real', 'conto', 'contos', 'pila'].includes(prox)) {
      sufixo = prox
      usados.push(i + 1)
      forte = true
    }
    if (sufixo === 'mil' || sufixo === 'k') valor *= 1000
    if (ant === 'r$') usados.push(i - 1)
    if (valor > 0 && Number.isFinite(valor)) opcoes.push({ valor: Math.round(valor * 100) / 100, usados, forte })
  })
  const escolhido = opcoes.find((o) => o.forte) ?? opcoes[0]
  return escolhido ? { valor: escolhido.valor, usados: new Set(escolhido.usados) } : null
}

function acharData(p: Pedaco[], hoje: string, ignorar = new Set<number>()): { data: string; usados: Set<number> } | null {
  for (let i = 0; i < p.length; i++) {
    if (ignorar.has(i)) continue
    const t = p[i].norm
    if (t === 'anteontem') return { data: isoDeslocado(hoje, -2), usados: new Set([i]) }
    if (t === 'ontem') return { data: isoDeslocado(hoje, -1), usados: new Set([i]) }
    if (t === 'hoje' || t === 'hj') return { data: hoje, usados: new Set([i]) }

    const barra = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/.exec(t)
    if (barra) {
      const [, d, m, a] = barra
      const h = parseISO(hoje)
      let ano = a ? Number(a.length === 2 ? `20${a}` : a) : h.getFullYear()
      let iso = montar(ano, Number(m), Number(d))
      if (!a && iso && iso > hoje) iso = montar(--ano, Number(m), Number(d))
      if (iso) return { data: iso, usados: new Set([i]) }
    }

    if (t === 'dia' && /^\d{1,2}$/.test(p[i + 1]?.norm ?? '')) {
      const d = Number(p[i + 1].norm)
      const h = parseISO(hoje)
      let iso = montar(h.getFullYear(), h.getMonth() + 1, d)
      if (iso && iso > hoje) {
        const ant = new Date(h.getFullYear(), h.getMonth() - 1, 1)
        iso = montar(ant.getFullYear(), ant.getMonth() + 1, d)
      }
      if (iso) return { data: iso, usados: new Set([i, i + 1]) }
    }

    const dow = DIAS_SEMANA.findIndex((d) => t === d || t === `${d}-feira` || t === `${d}feira`)
    if (dow >= 0) {
      let dif = (parseISO(hoje).getDay() - dow + 7) % 7
      const usados = new Set([i])
      if (['passada', 'passado'].includes(p[i + 1]?.norm ?? '')) {
        if (dif === 0) dif = 7
        usados.add(i + 1)
      }
      if (['feira'].includes(p[i + 1]?.norm ?? '')) usados.add(i + 1)
      return { data: isoDeslocado(hoje, -dif), usados }
    }
  }
  return null
}

/** "em 10x", "10 vezes", "10 parcelas", "10x de 200". porParcela: o valor dito é de cada parcela. */
function acharParcelas(p: Pedaco[]): { n: number; usados: Set<number>; porParcela: boolean } | null {
  for (let i = 0; i < p.length; i++) {
    const t = p[i].norm
    let n = 0
    const usados = new Set([i])
    const colado = /^(\d{1,2})x$/.exec(t)
    if (colado) n = Number(colado[1])
    else if (/^\d{1,2}$/.test(t) && ['x', 'vezes', 'parcelas'].includes(p[i + 1]?.norm ?? '')) {
      n = Number(t)
      usados.add(i + 1)
    }
    if (n < 2 || n > 72) continue
    // "10x de 200": o 200 é o valor de cada parcela
    const fim = Math.max(...usados)
    const porParcela = p[fim + 1]?.norm === 'de' && RE_VALOR.test(p[fim + 2]?.norm ?? '')
    return { n, usados, porParcela }
  }
  return null
}

/** "todo mês", "mensal", "por mês", "todo dia 5". */
function acharMensal(p: Pedaco[]): { dia: number | null; usados: Set<number> } | null {
  for (let i = 0; i < p.length; i++) {
    const t = p[i].norm
    const prox = p[i + 1]?.norm ?? ''
    if (t === 'mensal' || t === 'mensalmente' || t === '/mes') return { dia: null, usados: new Set([i]) }
    if ((t === 'todo' || t === 'por' || t === 'ao' || t === 'cada') && prox === 'mes') return { dia: null, usados: new Set([i, i + 1]) }
    if ((t === 'todo' || t === 'toda') && prox === 'dia' && /^\d{1,2}$/.test(p[i + 2]?.norm ?? '')) {
      const dia = Number(p[i + 2].norm)
      if (dia >= 1 && dia <= 31) return { dia, usados: new Set([i, i + 1, i + 2]) }
    }
  }
  return null
}

/** Nome do cartão na frase ("no nubank"). Com um cartão só, "no crédito" ou "no cartão" também serve. */
function acharCartao(p: Pedaco[], cartoes: Cartao[]): { id: string; usados: Set<number> } | null {
  for (const c of cartoes) {
    const nome = normalizar(c.nome).split(/\s+/)
    const i = p.findIndex((_, j) => nome.every((w, k) => p[j + k]?.norm === w))
    if (i >= 0) return { id: c.id, usados: new Set(nome.map((_, k) => i + k)) }
  }
  if (cartoes.length === 1) {
    const i = p.findIndex((t) => t.norm === 'credito' || t.norm === 'cartao')
    if (i >= 0) return { id: cartoes[0].id, usados: new Set([i]) }
  }
  return null
}

function montar(a: number, m: number, d: number) {
  const dt = new Date(a, m - 1, d)
  if (dt.getMonth() !== m - 1 || dt.getDate() !== d) return null
  return `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Escolhe a categoria: primeiro o que o usuário ensinou, depois o nome, depois o dicionário. */
function acharCategoria(palavras: string[], categorias: Categoria[], aprendidas: Aprendidas, tipo: TipoLancamento | null) {
  const servem = (c: Categoria | undefined): c is Categoria => Boolean(c && (!tipo || c.tipo === tipo))

  for (const w of palavras) {
    const c = categorias.find((x) => x.id === aprendidas[w])
    if (servem(c)) return { cat: c, origem: 'aprendida' as Origem }
  }

  const porNome = categorias.filter(servem).find((c) => {
    const nome = normalizar(c.nome)
    return palavras.some((w) => w.length > 2 && (nome === w || nome === `${w}s` || nome.split(' ')[0] === w))
  })
  if (porNome) return { cat: porNome, origem: 'nome' as Origem }

  for (const w of palavras) {
    for (const grupo of DICIONARIO) {
      if (!grupo.palavras.includes(w)) continue
      for (const dica of grupo.dicas) {
        const c = categorias.find((x) => normalizar(x.nome) === dica)
        if (servem(c)) return { cat: c, origem: 'palavra' as Origem }
      }
    }
  }
  return null
}

/** Categoria de sobra quando nada bate: "Outros gastos" ou "Outras entradas". */
export function categoriaPadrao(categorias: Categoria[], tipo: TipoLancamento) {
  const doTipo = categorias.filter((c) => c.tipo === tipo)
  return doTipo.find((c) => normalizar(c.nome).startsWith('outr')) ?? doTipo[0]
}

function interpretarUm(
  texto: string,
  categorias: Categoria[],
  aprendidas: Aprendidas,
  hoje: string,
  herdado: { tipo: TipoLancamento | null; data: string } | undefined,
  cartoes: Cartao[],
): Interpretado | null {
  const p = quebrar(texto)
  const parc = acharParcelas(p)
  const mensal = parc ? null : acharMensal(p)
  const especiais = new Set([...(parc?.usados ?? []), ...(mensal?.usados ?? [])])
  const v = acharValor(p, especiais)
  if (!v) return null
  const d = acharData(p, hoje, especiais)
  const k = acharCartao(p, cartoes)
  for (const i of k?.usados ?? []) especiais.add(i)

  const normas = p.map((t) => t.norm)
  const ehEntrada = normas.some((w) => VERBOS_ENTRADA.has(w))
  const ehSaida = normas.some((w) => VERBOS_SAIDA.has(w))
  let tipo: TipoLancamento | null = ehEntrada && !ehSaida ? 'entrada' : ehSaida && !ehEntrada ? 'saida' : null
  if (!tipo && herdado?.tipo) tipo = herdado.tipo

  const sobra = p.filter(
    (t, i) => !v.usados.has(i) && !d?.usados.has(i) && !especiais.has(i) && !VAZIAS.has(t.norm) && !RE_VALOR.test(t.norm),
  )
  const palavras = sobra.map((t) => t.norm)

  const achou = acharCategoria(palavras, categorias, aprendidas, tipo)
  if (!tipo) tipo = achou?.cat.tipo ?? 'saida'
  const cat = achou?.cat ?? categoriaPadrao(categorias, tipo)
  if (!cat) return null

  // descrição: do primeiro ao último termo útil, mantendo "do", "da" no meio ("Loja do Zé")
  const uteis = new Set(sobra)
  const ini = p.findIndex((t) => uteis.has(t))
  let fim = p.length - 1
  while (fim > ini && !uteis.has(p[fim])) fim--
  const trecho = ini < 0 ? [] : p.slice(ini, fim + 1).filter((t, j) => {
    const i = ini + j
    return (
      !v.usados.has(i) && !d?.usados.has(i) && !especiais.has(i) && !VERBOS_ENTRADA.has(t.norm) && !VERBOS_SAIDA.has(t.norm)
    )
  })
  const descricao =
    trecho
      .map((t, i) => GRAFIAS[t.norm] ?? (i === 0 ? t.original.charAt(0).toUpperCase() + t.original.slice(1) : t.original))
      .join(' ') || cat.nome

  let data = d?.data ?? herdado?.data ?? hoje
  let repeticao: Repeticao = { tipo: 'unica' }
  let valor = v.valor
  if (parc) {
    repeticao = { tipo: 'parcelado', parcelas: parc.n }
    if (parc.porParcela) valor = Math.round(valor * parc.n * 100) / 100
  } else if (mensal) {
    if (mensal.dia) {
      // "todo dia 5": começa no próximo dia 5 (hoje conta)
      const este = dataNoMes(mesDe(hoje), mensal.dia)
      data = este >= hoje ? este : dataNoMes(somarMes(mesDe(hoje), 1), mensal.dia)
    }
    repeticao = { tipo: 'mensal', dia: mensal.dia ?? parseISO(data).getDate() }
  }

  return {
    valor,
    tipo,
    categoriaId: cat.id,
    data,
    descricao,
    origem: achou?.origem ?? 'padrao',
    palavras,
    repeticao,
    // entrada não vai para cartão
    cartaoId: tipo === 'saida' ? k?.id : undefined,
  }
}

/**
 * Aceita mais de um lançamento por mensagem: "gastei 35 no ifood e 20 de uber".
 * Devolve lista vazia quando não achou nenhum valor.
 */
export function interpretar(
  texto: string,
  categorias: Categoria[],
  aprendidas: Aprendidas,
  hoje: string,
  cartoes: Cartao[] = [],
): Interpretado[] {
  const partes = texto.split(/\s+e\s+|;|\n|,\s+(?=\D)/i).map((s) => s.trim()).filter(Boolean)
  const comValor = partes.filter((s) => acharValor(quebrar(s)))
  // só separa se cada parte tiver o seu valor; senão lê a frase inteira
  const pedacos = partes.length > 1 && comValor.length === partes.length ? partes : [texto]

  // uma data dita em qualquer parte vale para as partes que não têm a sua
  const dataGeral = acharData(quebrar(texto), hoje)?.data ?? hoje
  const saida: Interpretado[] = []
  let herdado: { tipo: TipoLancamento | null; data: string } | undefined
  for (const s of pedacos) {
    const r = interpretarUm(s, categorias, aprendidas, hoje, herdado ?? { tipo: null, data: dataGeral }, cartoes)
    if (r) {
      saida.push(r)
      herdado = { tipo: r.tipo, data: dataGeral }
    }
  }
  return saida
}

/** Guarda as palavras da descrição como pertencentes a essa categoria. */
export function aprender(aprendidas: Aprendidas, palavras: string[], categoriaId: string): Aprendidas {
  const novo = { ...aprendidas }
  for (const w of palavras) if (w.length >= 2 && !VAZIAS.has(w)) novo[w] = categoriaId
  return novo
}

/** Perguntas que o chat responde em vez de lançar. */
export function ehPergunta(texto: string): 'resumo' | 'ajuda' | 'orcamentos' | 'faturas' | null {
  const t = normalizar(texto).trim()
  if (/^(meus |como (estao|esta) (os |o |meu |meus )?)?(orcamentos?|limites?)\??$/.test(t)) return 'orcamentos'
  if (/^((minha|minhas|as|a|ver) )?(faturas?|cartao|cartoes)( do mes)?\??$/.test(t)) return 'faturas'
  if (/\b(ajuda|como funciona|exemplos?|o que (voce|vc) faz)\b/.test(t)) return 'ajuda'
  if (/\b(resumo|saldo|quanto (eu )?(gastei|sobrou|recebi|entrou|saiu|tenho))\b/.test(t)) return 'resumo'
  return null
}

/** Frases de exemplo mostradas no chat. */
export const EXEMPLOS = ['gastei 35 no ifood', 'recebi 2000 de salário', 'uber 18,50 ontem', 'resumo do mês']

/** Exemplos das funções novas, mostrados na ajuda. */
export const EXEMPLOS_MAIS = ['netflix 55 todo mês', 'tv 2000 em 10x', 'mercado 120 no crédito', 'orçamento mercado 800']

/**
 * "orçamento mercado 800", "limite lazer 300", "tirar orçamento de lazer".
 * valor null quer dizer tirar o orçamento.
 */
export function lerOrcamento(texto: string, categorias: Categoria[]): { categoria: Categoria; valor: number | null } | null {
  const t = normalizar(texto).trim()
  const m = /^(?:(tirar|remover|sem|apagar)\s+)?(?:o\s+)?(?:orcamento|limite|teto)\s+(?:de\s+|do\s+|da\s+|para\s+|pra\s+|pro\s+)?(.+)$/.exec(t)
  if (!m) return null
  const p = quebrar(m[2])
  const v = acharValor(p)
  const resto = p.filter((_, i) => !v?.usados.has(i)).map((x) => x.norm).filter((w) => !VAZIAS.has(w))
  const categoria = categorias
    .filter((c) => c.tipo === 'saida')
    .find((c) => {
      const nome = normalizar(c.nome)
      return resto.some((w) => w.length > 2 && (nome === w || nome === `${w}s` || nome.startsWith(w)))
    })
  if (!categoria) return null
  if (m[1] || ['nenhum', 'zero'].some((w) => resto.includes(w)) || v?.valor === 0) return { categoria, valor: null }
  if (!v) return null
  return { categoria, valor: v.valor }
}
