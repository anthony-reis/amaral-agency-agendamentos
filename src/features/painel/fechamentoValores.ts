import type { FechamentoMensalData } from './actions/fechamento'

/**
 * Remove os valores a pagar (hora/aula, banca, totais) do fechamento para quem
 * não tem acesso ao Financeiro — no servidor, para não chegarem ao navegador.
 */
export function fechamentoSemValores(data: FechamentoMensalData): FechamentoMensalData {
  return {
    ...data,
    valor_total_pagar_geral: 0,
    instrutores: data.instrutores.map((i) => ({
      ...i,
      valor_hora_aula: null,
      valor_banca: null,
      valor_total_pagar: null,
    })),
  }
}
