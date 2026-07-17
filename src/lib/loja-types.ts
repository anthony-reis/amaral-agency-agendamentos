// Tipos e helpers isomórficos (server + client) da feature Loja/Vendas.

export type CategoriaCredito = 'a' | 'b' | 'c' | 'd' | 'e'
export const CATEGORIAS_CREDITO: CategoriaCredito[] = ['a', 'b', 'c', 'd', 'e']

export type ProdutoTipo = 'pacote' | 'avulsa' | 'servico'

export interface Produto {
  id: string
  autoescola_id: string
  nome: string
  descricao: string | null
  tipo: ProdutoTipo
  automatico: boolean
  preco_centavos: number
  qtd_cat_a: number
  qtd_cat_b: number
  qtd_cat_c: number
  qtd_cat_d: number
  qtd_cat_e: number
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface NovoProdutoInput {
  nome: string
  descricao?: string
  tipo: ProdutoTipo
  automatico: boolean
  preco_centavos: number
  qtd_cat_a: number
  qtd_cat_b: number
  qtd_cat_c: number
  qtd_cat_d: number
  qtd_cat_e: number
  ativo: boolean
}

export interface ProdutoSnapshot {
  nome: string
  tipo: ProdutoTipo
  automatico: boolean
  preco_centavos: number
  qtd_cat_a: number
  qtd_cat_b: number
  qtd_cat_c: number
  qtd_cat_d: number
  qtd_cat_e: number
}

export type PedidoLojaStatus =
  | 'pendente'
  | 'aprovado'
  | 'rejeitado'
  | 'cancelado'
  | 'expirado'
  | 'reembolsado'

export interface PedidoLoja {
  id: string
  autoescola_id: string
  student_id: string
  produto_id: string | null
  produto_snapshot: ProdutoSnapshot
  valor_centavos: number
  status: PedidoLojaStatus
  mp_preference_id: string | null
  mp_payment_id: string | null
  payment_method: string | null
  creditos_liberados: boolean
  paid_at: string | null
  created_at: string
  updated_at: string
}

export function formatarPrecoCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function somaCreditos(p: {
  qtd_cat_a: number
  qtd_cat_b: number
  qtd_cat_c: number
  qtd_cat_d: number
  qtd_cat_e: number
}): number {
  return p.qtd_cat_a + p.qtd_cat_b + p.qtd_cat_c + p.qtd_cat_d + p.qtd_cat_e
}
