// Tipos e constantes isomórficos (server + client) dos filtros da tela de Vendas.

// "todas" esconde pedidos abandonados (expirado/cancelado).
export type FiltroStatusVenda = 'todas' | 'aprovado' | 'pendente' | 'rejeitado' | 'reembolsado' | 'abandonados'
export type FiltroPeriodoVenda = 'tudo' | 'hoje' | '7d' | '30d' | 'mes'
export type FiltroOrigemVenda = 'todas' | 'mercado_pago' | 'manual'

export interface FiltrosVendas {
  status: FiltroStatusVenda
  periodo: FiltroPeriodoVenda
  origem: FiltroOrigemVenda
  busca: string
  pagina: number
}

export const FILTROS_VENDAS_PADRAO: FiltrosVendas = {
  status: 'todas',
  periodo: 'tudo',
  origem: 'todas',
  busca: '',
  pagina: 1,
}

export const VENDAS_POR_PAGINA = 25

export const STATUS_VENDA_IDS: FiltroStatusVenda[] = ['todas', 'aprovado', 'pendente', 'rejeitado', 'reembolsado', 'abandonados']
export const PERIODO_VENDA_IDS: FiltroPeriodoVenda[] = ['tudo', 'hoje', '7d', '30d', 'mes']
export const ORIGEM_VENDA_IDS: FiltroOrigemVenda[] = ['todas', 'mercado_pago', 'manual']
