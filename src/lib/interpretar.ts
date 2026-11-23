import type { Categoria, TipoLancamento } from '../data/types'
import { isoDeslocado, lerValor, parseISO } from './format'

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
}

const VERBOS_ENTRADA = new Set([
  'recebi', 'receber', 'recebido', 'recebimento', 'ganhei', 'ganho', 'entrou', 'entrada', 'caiu',
  'vendi', 'venda', 'rendeu', 'rendimento', 'reembolso', 'reembolsaram', 'devolveram', 'pagaram', 'mesada',
])
const VERBOS_SAIDA = new Set([
  'gastei', 'gasto', 'gastar', 'paguei', 'pagar', 'pago', 'comprei', 'compra', 'saiu', 'saida',
  'torrei', 'transferi', 'mandei', 'doei', 'assinei', 'abasteci',
])

const VAZIAS = new Set([
  'no', 'na', 'nos', 'nas', 'de', 'do', 'da', 'dos', 'das', 'em', 'pro', 'pra', 'para', 'por', 'com', 'o', 'a',
  'os', 'as', 'um', 'uma', 'e', 'meu', 'minha', 'meus', 'minhas', 'mais', 'foi', 'foram', 'eu', 'me', 'hj', 'hoje',
  'ontem', 'anteontem', 'dia', 'reais', 'real', 'r$', 'conto', 'contos', 'pila', 'mil', 'k', 'passada', 'passado',
  'que', 'ai', 'la', 'so', 'tipo', 'num', 'numa', 'valor', 'agora', 'pix', 'via', 'cartao', 'credito', 'debito',
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
  psn: 'PSN', chatgpt: 'ChatGPT', youtube: 'YouTube', icloud: 'iCloud', iptu: 'IPTU', brt: 'BRT', '13o': '13º',
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

function acharValor(p: Pedaco[]): { valor: number; usados: Set<number> } | null {
  const opcoes: { valor: number; usados: number[]; forte: boolean }[] = []
  p.forEach((t, i) => {
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

function acharData(p: Pedaco[], hoje: string): { data: string; usados: Set<number> } | null {
  for (let i = 0; i < p.length; i++) {
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
  herdado?: { tipo: TipoLancamento | null; data: string },
): Interpretado | null {
  const p = quebrar(texto)
  const v = acharValor(p)
  if (!v) return null
  const d = acharData(p, hoje)

  const normas = p.map((t) => t.norm)
  const ehEntrada = normas.some((w) => VERBOS_ENTRADA.has(w))
  const ehSaida = normas.some((w) => VERBOS_SAIDA.has(w))
  let tipo: TipoLancamento | null = ehEntrada && !ehSaida ? 'entrada' : ehSaida && !ehEntrada ? 'saida' : null
  if (!tipo && herdado?.tipo) tipo = herdado.tipo

  const sobra = p.filter((t, i) => !v.usados.has(i) && !d?.usados.has(i) && !VAZIAS.has(t.norm) && !RE_VALOR.test(t.norm))
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
    return !v.usados.has(i) && !d?.usados.has(i) && !VERBOS_ENTRADA.has(t.norm) && !VERBOS_SAIDA.has(t.norm)
  })
  const descricao =
    trecho
      .map((t, i) => GRAFIAS[t.norm] ?? (i === 0 ? t.original.charAt(0).toUpperCase() + t.original.slice(1) : t.original))
      .join(' ') || cat.nome

  return {
    valor: v.valor,
    tipo,
    categoriaId: cat.id,
    data: d?.data ?? herdado?.data ?? hoje,
    descricao,
    origem: achou?.origem ?? 'padrao',
    palavras,
  }
}

/**
 * Aceita mais de um lançamento por mensagem: "gastei 35 no ifood e 20 de uber".
 * Devolve lista vazia quando não achou nenhum valor.
 */
export function interpretar(texto: string, categorias: Categoria[], aprendidas: Aprendidas, hoje: string): Interpretado[] {
  const partes = texto.split(/\s+e\s+|;|\n|,\s+(?=\D)/i).map((s) => s.trim()).filter(Boolean)
  const comValor = partes.filter((s) => acharValor(quebrar(s)))
  // só separa se cada parte tiver o seu valor; senão lê a frase inteira
  const pedacos = partes.length > 1 && comValor.length === partes.length ? partes : [texto]

  // uma data dita em qualquer parte vale para as partes que não têm a sua
  const dataGeral = acharData(quebrar(texto), hoje)?.data ?? hoje
  const saida: Interpretado[] = []
  let herdado: { tipo: TipoLancamento | null; data: string } | undefined
  for (const s of pedacos) {
    const r = interpretarUm(s, categorias, aprendidas, hoje, herdado ?? { tipo: null, data: dataGeral })
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
export function ehPergunta(texto: string): 'resumo' | 'ajuda' | null {
  const t = normalizar(texto)
  if (/\b(ajuda|como funciona|exemplos?|o que (voce|vc) faz)\b/.test(t)) return 'ajuda'
  if (/\b(resumo|saldo|quanto (eu )?(gastei|sobrou|recebi|entrou|saiu|tenho))\b/.test(t)) return 'resumo'
  return null
}

/** Frases de exemplo mostradas no chat. */
export const EXEMPLOS = ['gastei 35 no ifood', 'recebi 2000 de salário', 'uber 18,50 ontem', 'resumo do mês']
