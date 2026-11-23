import type { Categoria, Lancamento, Meta } from './types'

export const categorias: Categoria[] = [
  { id: 'salario', nome: 'Salário', tipo: 'entrada', cor: '#3F7D58', icone: 'briefcase' },
  { id: 'freela', nome: 'Freela', tipo: 'entrada', cor: '#6B8F3A', icone: 'laptop' },
  { id: 'moradia', nome: 'Moradia', tipo: 'saida', cor: '#C2553A', icone: 'home' },
  { id: 'mercado', nome: 'Mercado', tipo: 'saida', cor: '#D08A2E', icone: 'cart' },
  { id: 'transporte', nome: 'Transporte', tipo: 'saida', cor: '#4E6E8E', icone: 'bus' },
  { id: 'lazer', nome: 'Lazer', tipo: 'saida', cor: '#8C5A9E', icone: 'ticket' },
  { id: 'saude', nome: 'Saúde', tipo: 'saida', cor: '#3E8E8A', icone: 'heart' },
  { id: 'assinaturas', nome: 'Assinaturas', tipo: 'saida', cor: '#9A6B4F', icone: 'repeat' },
  { id: 'estudos', nome: 'Estudos', tipo: 'saida', cor: '#5A6BB0', icone: 'book' },
]

export const lancamentos: Lancamento[] = [
  { id: '1', descricao: 'Salário', valor: 3800, tipo: 'entrada', categoriaId: 'salario', data: '2026-11-05', conta: 'Nubank' },
  { id: '2', descricao: 'Aluguel', valor: 1150, tipo: 'saida', categoriaId: 'moradia', data: '2026-11-06', conta: 'Nubank' },
  { id: '3', descricao: 'Conta de luz', valor: 138.4, tipo: 'saida', categoriaId: 'moradia', data: '2026-11-08', conta: 'Nubank' },
  { id: '4', descricao: 'Atacadão', valor: 412.87, tipo: 'saida', categoriaId: 'mercado', data: '2026-11-09', conta: 'Crédito' },
  { id: '5', descricao: 'Mensalidade faculdade', valor: 389, tipo: 'saida', categoriaId: 'estudos', data: '2026-11-10', conta: 'Boleto' },
  { id: '6', descricao: 'Uber', valor: 23.5, tipo: 'saida', categoriaId: 'transporte', data: '2026-11-12', conta: 'Crédito' },
  { id: '7', descricao: 'Site pra cliente', valor: 650, tipo: 'entrada', categoriaId: 'freela', data: '2026-11-14', conta: 'Pix' },
  { id: '8', descricao: 'Spotify', valor: 21.9, tipo: 'saida', categoriaId: 'assinaturas', data: '2026-11-15', conta: 'Crédito' },
  { id: '9', descricao: 'Farmácia', valor: 64.3, tipo: 'saida', categoriaId: 'saude', data: '2026-11-17', conta: 'Débito' },
  { id: '10', descricao: 'Cinema', valor: 56, tipo: 'saida', categoriaId: 'lazer', data: '2026-11-19', conta: 'Crédito' },
  { id: '11', descricao: 'Feira', valor: 87.2, tipo: 'saida', categoriaId: 'mercado', data: '2026-11-21', conta: 'Pix' },
  { id: '12', descricao: 'Recarga do bilhete', valor: 100, tipo: 'saida', categoriaId: 'transporte', data: '2026-11-22', conta: 'Pix' },
  { id: '13', descricao: 'Pizza com a galera', valor: 48.9, tipo: 'saida', categoriaId: 'lazer', data: '2026-11-22', conta: 'Pix' },
  { id: '14', descricao: 'Padaria', valor: 18.6, tipo: 'saida', categoriaId: 'mercado', data: '2026-11-23', conta: 'Débito' },
]

export const metas: Meta[] = [
  { id: 'm1', nome: 'Reserva de emergência', alvo: 10000, guardado: 4350, prazo: '2027-12-31', cor: '#3F7D58', icone: 'shield' },
  { id: 'm2', nome: 'Notebook novo', alvo: 5200, guardado: 3120, prazo: '2027-03-31', cor: '#4E6E8E', icone: 'laptop' },
  { id: 'm3', nome: 'Viagem de formatura', alvo: 3500, guardado: 780, prazo: '2027-12-15', cor: '#C2553A', icone: 'plane' },
  { id: 'm4', nome: 'Curso de inglês', alvo: 1200, guardado: 1200, prazo: '2026-10-30', cor: '#C99A2E', icone: 'book' },
]

export const hoje = '2026-11-23'
