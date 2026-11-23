import type { Cartao, Categoria, Lancamento, NovoLancamentoDados, Recorrencia, Repeticao } from '../data/types'
import { dinheiro, mesDe, parseISO, somarMes } from './format'

/** Dia do mês em "yyyy-mm", jogando para o último dia quando o mês é curto (31 em fevereiro vira 28). */
export function dataNoMes(mes: string, dia: number) {
  const [a, m] = mes.split('-').map(Number)
  const ultimo = new Date(a, m, 0).getDate()
  return `${mes}-${String(Math.min(dia, ultimo)).padStart(2, '0')}`
}

/** Soma meses a uma data mantendo o dia (com o mesmo ajuste de mês curto). */
export function somarMesesData(iso: string, n: number) {
  return dataNoMes(somarMes(mesDe(iso), n), parseISO(iso).getDate())
}

/**
 * Mês de vencimento da fatura em que uma compra cai.
 * Compra no dia do fechamento ou depois vai para a fatura seguinte.
 */
export function faturaDe(data: string, c: Pick<Cartao, 'fechamento' | 'vencimento'>) {
  const d = parseISO(data).getDate()
  const mesFecha = d >= c.fechamento ? somarMes(mesDe(data), 1) : mesDe(data)
  return c.vencimento > c.fechamento ? mesFecha : somarMes(mesFecha, 1)
}

/** Fatura que está aberta hoje, recebendo compras. */
export const faturaAberta = (c: Cartao, hoje: string) => faturaDe(hoje, c)

/** Divide um total em n parcelas; os centavos que sobram vão na primeira. */
export function dividir(total: number, n: number) {
  const centavos = Math.round(total * 100)
  const base = Math.floor(centavos / n)
  return Array.from({ length: n }, (_, i) => (i === 0 ? base + (centavos - base * n) : base) / 100)
}

const uuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
        const r = (Math.random() * 16) | 0
        return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16)
      })

/** Põe a fatura certa em lançamentos de cartão. */
export function comFatura(l: NovoLancamentoDados, cartoes: Cartao[]): NovoLancamentoDados {
  const c = l.cartaoId ? cartoes.find((x) => x.id === l.cartaoId) : undefined
  if (!c || l.tipo !== 'saida') return { ...l, cartaoId: undefined, fatura: undefined }
  return { ...l, fatura: faturaDe(l.data, c) }
}

/**
 * Transforma o que foi digitado nos lançamentos que vão para o banco.
 * Parcelado: uma parcela por mês, cada uma na fatura seguinte. Mensal: devolve a recorrência
 * e os lançamentos saem de gerarPendentes.
 */
export function montar(
  dados: NovoLancamentoDados,
  rep: Repeticao,
  cartoes: Cartao[],
): { lancamentos: NovoLancamentoDados[]; recorrencia?: Omit<Recorrencia, 'id'> } {
  const base = comFatura(dados, cartoes)
  if (rep.tipo === 'parcelado' && rep.parcelas > 1) {
    const grupo = uuid()
    const valores = dividir(dados.valor, rep.parcelas)
    return {
      lancamentos: valores.map((valor, k) => ({
        ...base,
        valor,
        data: somarMesesData(dados.data, k),
        grupo,
        parcela: k + 1,
        parcelas: rep.parcelas,
        fatura: base.fatura ? somarMes(base.fatura, k) : undefined,
      })),
    }
  }
  if (rep.tipo === 'mensal') {
    return {
      lancamentos: [],
      recorrencia: {
        descricao: dados.descricao,
        valor: dados.valor,
        tipo: dados.tipo,
        categoriaId: dados.categoriaId,
        cartaoId: base.cartaoId,
        dia: rep.dia,
        inicio: dados.data,
        geradoAte: null,
      },
    }
  }
  return { lancamentos: [base] }
}

/** Lançamentos de uma recorrência que já deviam existir até hoje e ainda não foram criados. */
export function gerarPendentes(r: Recorrencia, hoje: string, cartoes: Cartao[]) {
  const lancamentos: NovoLancamentoDados[] = []
  let geradoAte = r.geradoAte
  let mes = r.geradoAte ? somarMes(r.geradoAte, 1) : mesDe(r.inicio)
  while (mes <= mesDe(hoje)) {
    const data = dataNoMes(mes, r.dia)
    if (data > hoje) break
    if (data >= r.inicio) {
      lancamentos.push(
        comFatura(
          { descricao: r.descricao, valor: r.valor, tipo: r.tipo, categoriaId: r.categoriaId, data, recorrenciaId: r.id, cartaoId: r.cartaoId },
          cartoes,
        ),
      )
    }
    geradoAte = mes
    mes = somarMes(mes, 1)
  }
  return { lancamentos, geradoAte }
}

/** Próxima data em que a recorrência lança, a partir de hoje (inclusive). */
export function proximaData(r: Pick<Recorrencia, 'dia' | 'inicio' | 'geradoAte'>, hoje: string) {
  let mes = r.geradoAte ? somarMes(r.geradoAte, 1) : mesDe(r.inicio)
  for (let i = 0; i < 24; i++, mes = somarMes(mes, 1)) {
    const d = dataNoMes(mes, r.dia)
    if (d >= r.inicio && d >= hoje) return d
  }
  return dataNoMes(mes, r.dia)
}

export type NivelOrcamento = 'ok' | 'atencao' | 'estourou'

export function nivelOrcamento(gasto: number, limite: number): NivelOrcamento {
  if (gasto >= limite) return 'estourou'
  if (gasto >= limite * 0.8) return 'atencao'
  return 'ok'
}

export const somar = (ls: Lancamento[]) => ls.reduce((s, l) => s + l.valor, 0)

/** Variação em % de b para a; null quando não tem base para comparar. */
export const variacao = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : null)

/** CSV que abre certo no Excel em português: ponto e vírgula e vírgula decimal. */
export function paraCSV(ls: Lancamento[], categorias: Categoria[], cartoes: Cartao[]) {
  const esc = (s: string) => (/[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)
  const linhas = [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor', 'Cartão', 'Parcela', 'Conta'].join(';')]
  for (const l of [...ls].sort((a, b) => a.data.localeCompare(b.data))) {
    const [a, m, d] = l.data.split('-')
    linhas.push(
      [
        `${d}/${m}/${a}`,
        esc(l.descricao),
        esc(categorias.find((c) => c.id === l.categoriaId)?.nome ?? ''),
        l.tipo === 'entrada' ? 'Entrada' : 'Saída',
        (l.tipo === 'saida' ? -l.valor : l.valor).toFixed(2).replace('.', ','),
        esc(cartoes.find((c) => c.id === l.cartaoId)?.nome ?? ''),
        l.parcelas ? `${l.parcela}/${l.parcelas}` : '',
        esc(l.conta ?? ''),
      ].join(';'),
    )
  }
  return '﻿' + linhas.join('\r\n')
}

export function baixar(nome: string, conteudo: string, tipo = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** "R$ 820 de R$ 1.000" */
export const textoOrcamento = (gasto: number, limite: number) => `${dinheiro(gasto)} de ${dinheiro(limite)}`
