import type { SupabaseClient } from '@supabase/supabase-js'
import type { Backend } from './store'
import type { Cartao, Categoria, Lancamento, NovoLancamentoDados, Recorrencia } from './types'

interface LinhaLancamento {
  id: string
  descricao: string
  valor: number | string
  tipo: Lancamento['tipo']
  categoria_id: string
  data: string
  conta: string | null
  recorrencia_id: string | null
  grupo: string | null
  parcela: number | null
  parcelas: number | null
  cartao_id: string | null
  fatura: string | null
}

const deLinha = (r: LinhaLancamento): Lancamento => ({
  id: r.id,
  descricao: r.descricao,
  valor: Number(r.valor),
  tipo: r.tipo,
  categoriaId: r.categoria_id,
  data: r.data,
  conta: r.conta ?? undefined,
  recorrenciaId: r.recorrencia_id ?? undefined,
  grupo: r.grupo ?? undefined,
  parcela: r.parcela ?? undefined,
  parcelas: r.parcelas ?? undefined,
  cartaoId: r.cartao_id ?? undefined,
  fatura: r.fatura ?? undefined,
})

const paraLinha = (l: NovoLancamentoDados) => ({
  descricao: l.descricao,
  valor: l.valor,
  tipo: l.tipo,
  categoria_id: l.categoriaId,
  data: l.data,
  conta: l.conta ?? null,
  recorrencia_id: l.recorrenciaId ?? null,
  grupo: l.grupo ?? null,
  parcela: l.parcela ?? null,
  parcelas: l.parcelas ?? null,
  cartao_id: l.cartaoId ?? null,
  fatura: l.fatura ?? null,
})

interface LinhaRecorrencia {
  id: string
  descricao: string
  valor: number | string
  tipo: Lancamento['tipo']
  categoria_id: string
  cartao_id: string | null
  dia: number
  inicio: string
  gerado_ate: string | null
}

const deRec = (r: LinhaRecorrencia): Recorrencia => ({
  id: r.id,
  descricao: r.descricao,
  valor: Number(r.valor),
  tipo: r.tipo,
  categoriaId: r.categoria_id,
  cartaoId: r.cartao_id ?? undefined,
  dia: r.dia,
  inicio: r.inicio,
  geradoAte: r.gerado_ate,
})

function paraRec(r: Partial<Omit<Recorrencia, 'id'>>) {
  const o: Record<string, unknown> = {}
  if (r.descricao !== undefined) o.descricao = r.descricao
  if (r.valor !== undefined) o.valor = r.valor
  if (r.tipo !== undefined) o.tipo = r.tipo
  if (r.categoriaId !== undefined) o.categoria_id = r.categoriaId
  if ('cartaoId' in r) o.cartao_id = r.cartaoId ?? null
  if (r.dia !== undefined) o.dia = r.dia
  if (r.inicio !== undefined) o.inicio = r.inicio
  if (r.geradoAte !== undefined) o.gerado_ate = r.geradoAte
  return o
}

const COLUNAS_L = 'id, descricao, valor, tipo, categoria_id, data, conta, recorrencia_id, grupo, parcela, parcelas, cartao_id, fatura'
const COLUNAS_C = 'id, nome, tipo, cor, icone, limite'
const COLUNAS_R = 'id, descricao, valor, tipo, categoria_id, cartao_id, dia, inicio, gerado_ate'
const COLUNAS_K = 'id, nome, limite, fechamento, vencimento, cor'

/** Erro do Supabase vira exceção com mensagem legível. */
function checar(error: { message: string; code?: string } | null) {
  if (!error) return
  if (error.code === '23503') throw new Error('Essa categoria tem lançamentos. Mude eles de categoria antes de apagar.')
  if (error.code === '23505') throw new Error('Já existe um item com esse nome.')
  throw new Error(error.message)
}

const deCat = (c: Categoria & { limite: number | string | null }): Categoria => ({ ...c, limite: c.limite == null ? null : Number(c.limite) })
const deCartao = (c: Cartao & { limite: number | string }): Cartao => ({ ...c, limite: Number(c.limite) })

/** O Supabase devolve no máximo 1000 linhas por vez, então pagina. */
async function paginar<T>(buscar: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const tudo: T[] = []
  for (let de = 0; ; de += 1000) {
    const { data, error } = await buscar(de, de + 999)
    checar(error)
    tudo.push(...(data ?? []))
    if (!data || data.length < 1000) return tudo
  }
}

export function criarBackendSupabase(db: SupabaseClient): Backend {
  return {
    async categorias() {
      const { data, error } = await db.from('categorias').select(COLUNAS_C).order('nome')
      checar(error)
      return (data ?? []).map(deCat)
    },
    async criarCategoria(c) {
      const { data, error } = await db.from('categorias').insert(c).select(COLUNAS_C).single()
      checar(error)
      return deCat(data!)
    },
    async removerCategoria(id) {
      const { error } = await db.from('categorias').delete().eq('id', id)
      checar(error)
    },
    async definirLimite(id, limite) {
      const { error } = await db.from('categorias').update({ limite }).eq('id', id)
      checar(error)
    },

    async lancamentosEntre(inicio, fim) {
      const linhas = await paginar<LinhaLancamento>((de, ate) =>
        db.from('lancamentos').select(COLUNAS_L).gte('data', inicio).lt('data', fim).order('data', { ascending: false }).order('id').range(de, ate),
      )
      return linhas.map(deLinha)
    },
    async lancamentosDeCartao(desde) {
      const linhas = await paginar<LinhaLancamento>((de, ate) =>
        db.from('lancamentos').select(COLUNAS_L).not('cartao_id', 'is', null).gte('fatura', desde).order('id').range(de, ate),
      )
      return linhas.map(deLinha)
    },
    async inserir(ls) {
      const { data, error } = await db.from('lancamentos').insert(ls.map(paraLinha)).select(COLUNAS_L)
      checar(error)
      return (data as LinhaLancamento[]).map(deLinha)
    },
    async inserirGerados(ls) {
      const { data, error } = await db
        .from('lancamentos')
        .upsert(ls.map(paraLinha), { onConflict: 'recorrencia_id,data', ignoreDuplicates: true })
        .select(COLUNAS_L)
      checar(error)
      return ((data ?? []) as LinhaLancamento[]).map(deLinha)
    },
    async atualizar(id, l) {
      const { data, error } = await db.from('lancamentos').update(paraLinha(l)).eq('id', id).select(COLUNAS_L).single()
      checar(error)
      return deLinha(data as LinhaLancamento)
    },
    async recategorizar(ids, categoriaId, tipo) {
      const { error } = await db.from('lancamentos').update({ categoria_id: categoriaId, tipo }).in('id', ids)
      checar(error)
    },
    async remover(ids) {
      const { error } = await db.from('lancamentos').delete().in('id', ids)
      checar(error)
    },
    async removerGrupo(grupo) {
      const { error } = await db.from('lancamentos').delete().eq('grupo', grupo)
      checar(error)
    },

    async recorrencias() {
      const { data, error } = await db.from('recorrencias').select(COLUNAS_R).order('dia')
      checar(error)
      return ((data ?? []) as LinhaRecorrencia[]).map(deRec)
    },
    async criarRecorrencia(r) {
      const { data, error } = await db.from('recorrencias').insert(paraRec(r)).select(COLUNAS_R).single()
      checar(error)
      return deRec(data as LinhaRecorrencia)
    },
    async atualizarRecorrencia(id, campos) {
      const { error } = await db.from('recorrencias').update(paraRec(campos)).eq('id', id)
      checar(error)
    },
    async removerRecorrencia(id) {
      const { error } = await db.from('recorrencias').delete().eq('id', id)
      checar(error)
    },

    async cartoes() {
      const { data, error } = await db.from('cartoes').select(COLUNAS_K).order('nome')
      checar(error)
      return (data ?? []).map(deCartao)
    },
    async salvarCartao(c, id) {
      const q = id ? db.from('cartoes').update(c).eq('id', id) : db.from('cartoes').insert(c)
      const { data, error } = await q.select(COLUNAS_K).single()
      checar(error)
      return deCartao(data!)
    },
    async removerCartao(id) {
      const { error } = await db.from('cartoes').delete().eq('id', id)
      checar(error)
    },
    async faturasPagas() {
      const { data, error } = await db.from('faturas_pagas').select('cartao_id, mes')
      checar(error)
      return (data ?? []).map((f) => `${f.cartao_id}:${f.mes}`)
    },
    async marcarFatura(cartaoId, mes, paga) {
      const { error } = paga
        ? await db.from('faturas_pagas').upsert({ cartao_id: cartaoId, mes }, { onConflict: 'cartao_id,mes', ignoreDuplicates: true })
        : await db.from('faturas_pagas').delete().eq('cartao_id', cartaoId).eq('mes', mes)
      checar(error)
    },
  }
}
