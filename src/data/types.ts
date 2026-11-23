export type TipoLancamento = 'entrada' | 'saida'

export interface Categoria {
  id: string
  nome: string
  tipo: TipoLancamento
  cor: string
  icone: string
  /** Orçamento mensal (só saídas). null quando não tem. */
  limite: number | null
}

export interface Lancamento {
  id: string
  descricao: string
  valor: number
  tipo: TipoLancamento
  categoriaId: string
  data: string // ISO yyyy-mm-dd
  conta?: string
  /** Veio de uma recorrência ("todo mês"). */
  recorrenciaId?: string
  /** Parcelas da mesma compra compartilham o grupo. */
  grupo?: string
  parcela?: number
  parcelas?: number
  /** Compra no cartão de crédito. */
  cartaoId?: string
  /** Mês de vencimento da fatura em que caiu, "yyyy-mm". */
  fatura?: string
}

export type NovoLancamentoDados = Omit<Lancamento, 'id'>
export type NovaCategoriaDados = Omit<Categoria, 'id' | 'limite'> & { limite?: number | null }

/** Como o lançamento se repete ao ser criado. */
export type Repeticao =
  | { tipo: 'unica' }
  | { tipo: 'mensal'; dia: number }
  | { tipo: 'parcelado'; parcelas: number }

export interface Recorrencia {
  id: string
  descricao: string
  valor: number
  tipo: TipoLancamento
  categoriaId: string
  cartaoId?: string
  /** Dia do mês em que lança (1 a 31; em mês curto cai no último dia). */
  dia: number
  inicio: string // yyyy-mm-dd
  /** Último mês já lançado, "yyyy-mm". */
  geradoAte: string | null
}

export interface Cartao {
  id: string
  nome: string
  limite: number
  /** Dia em que a fatura fecha. Compras nesse dia ou depois vão para a próxima. */
  fechamento: number
  vencimento: number
  cor: string
}
export type NovoCartaoDados = Omit<Cartao, 'id'>

/** Resultado de um lançamento criado, para o chat poder desfazer tudo junto. */
export interface Lancado {
  lancamentos: Lancamento[]
  recorrencia?: Recorrencia
}

/** Metas continuam mockadas até o passo 3. */
export interface Meta {
  id: string
  nome: string
  alvo: number
  guardado: number
  prazo: string // ISO yyyy-mm-dd
  cor: string
  icone: string
}
