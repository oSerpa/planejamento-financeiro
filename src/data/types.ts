export type TipoLancamento = 'entrada' | 'saida'

export interface Categoria {
  id: string
  nome: string
  tipo: TipoLancamento
  cor: string
  icone: string
}

export interface Lancamento {
  id: string
  descricao: string
  valor: number
  tipo: TipoLancamento
  categoriaId: string
  data: string // ISO yyyy-mm-dd
  conta?: string
}

export interface Meta {
  id: string
  nome: string
  alvo: number
  guardado: number
  prazo: string // ISO yyyy-mm-dd
  cor: string
  icone: string
}
