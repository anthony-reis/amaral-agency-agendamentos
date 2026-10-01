'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getFechamentoMensal, type FechamentoMensalData } from './fechamento'

export interface VendaPorVendedor {
  vendedor_user_id: string
  nome: string
  total_vendas: number
  valor_total_centavos: number
}

export interface FinanceiroMensalData {
  mes: number
  ano: number
  receita_total_centavos: number
  receita_mercado_pago_centavos: number
  receita_manual_centavos: number
  despesa_instrutores: FechamentoMensalData
  despesa_instrutores_centavos: number
  saldo_centavos: number
  vendas_por_vendedor: VendaPorVendedor[]
}

export async function getFinanceiroMensal(
  autoescola_id: string,
  mes: number,
  ano: number
): Promise<FinanceiroMensalData> {
  const supabase = createServiceClient()

  const dateStart = `${ano}-${String(mes).padStart(2, '0')}-01`
  const nextMonth = mes === 12 ? 1 : mes + 1
  const nextYear = mes === 12 ? ano + 1 : ano
  const dateEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

  const [{ data: pedidosRaw }, despesa] = await Promise.all([
    supabase
      .from('pedidos_loja')
      .select('valor_centavos, origem, vendedor_user_id, vendedor:users_painel(full_name)')
      .eq('autoescola_id', autoescola_id)
      .eq('status', 'aprovado')
      .gte('paid_at', dateStart)
      .lt('paid_at', dateEnd),
    getFechamentoMensal(autoescola_id, mes, ano),
  ])

  const pedidos = pedidosRaw ?? []

  let receita_mercado_pago_centavos = 0
  let receita_manual_centavos = 0
  const vendedorMap = new Map<string, VendaPorVendedor>()

  for (const row of pedidos) {
    if (row.origem === 'manual') {
      receita_manual_centavos += row.valor_centavos
      if (row.vendedor_user_id) {
        const vendedorInfo = Array.isArray(row.vendedor) ? row.vendedor[0] : row.vendedor
        const nome = vendedorInfo?.full_name ?? 'Desconhecido'
        const existing = vendedorMap.get(row.vendedor_user_id)
        if (existing) {
          existing.total_vendas++
          existing.valor_total_centavos += row.valor_centavos
        } else {
          vendedorMap.set(row.vendedor_user_id, {
            vendedor_user_id: row.vendedor_user_id,
            nome,
            total_vendas: 1,
            valor_total_centavos: row.valor_centavos,
          })
        }
      }
    } else {
      receita_mercado_pago_centavos += row.valor_centavos
    }
  }

  const receita_total_centavos = receita_mercado_pago_centavos + receita_manual_centavos
  const despesa_instrutores_centavos = Math.round(despesa.valor_total_pagar_geral * 100)
  const vendas_por_vendedor = Array.from(vendedorMap.values())
    .sort((a, b) => b.valor_total_centavos - a.valor_total_centavos)

  return {
    mes,
    ano,
    receita_total_centavos,
    receita_mercado_pago_centavos,
    receita_manual_centavos,
    despesa_instrutores: despesa,
    despesa_instrutores_centavos,
    saldo_centavos: receita_total_centavos - despesa_instrutores_centavos,
    vendas_por_vendedor,
  }
}
