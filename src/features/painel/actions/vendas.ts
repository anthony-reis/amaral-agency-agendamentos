'use server'

import { bloqueioFeature } from '@/lib/features.server'
import { createServiceClient } from '@/lib/supabase/server'
import { bloqueioArea, bloqueioReembolso } from '@/lib/permissoes.server'
import { reconciliarPedidosPendentes, type ResumoReconciliacao } from '@/lib/reconciliarPedidos'
import { getCurrentUserId, getCurrentUsername, getPainelAutoescolaId } from './authPainel'
import { criarReembolso } from '@/lib/mercadopago'
import type { PedidoLoja, PedidoLojaStatus } from '@/lib/loja-types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buscarTodos } from '@/lib/buscarTodos'
import {
  ORIGEM_VENDA_IDS, PERIODO_VENDA_IDS, STATUS_VENDA_IDS, VENDAS_POR_PAGINA,
  type FiltroOrigemVenda, type FiltroPeriodoVenda, type FiltroStatusVenda, type FiltrosVendas,
} from '@/lib/vendas-filtros'
import type { ActionResult } from '@/features/admin/types'

export interface PedidoComAluno extends PedidoLoja {
  aluno: { name: string; document_id: string } | null
  vendedor: { full_name: string; username: string } | null
}

export interface ResumoVendas {
  aprovadoValor: number
  aprovadoQtd: number
  pendenteValor: number
  pendenteQtd: number
  reembolsadoQtd: number
}

export interface VendasPagina {
  vendas: PedidoComAluno[]
  total: number
  pagina: number
  totalPaginas: number
  contagem: Record<FiltroStatusVenda, number>
  resumo: ResumoVendas
}

export interface DetalheVenda {
  pedido: PedidoComAluno
  alunoContato: { email: string | null; phone: string | null } | null
  logs: Array<{ created_at: string; username: string | null; description: string }>
}

const SELECT_VENDA = '*, aluno:students(name, document_id), vendedor:users_painel(full_name, username)'

/** Mensagem de erro, ou null se a sessão pode ver as vendas desta escola. */
async function bloqueioVerVendas(autoescola_id: string): Promise<string | null> {
  const bloqueioPermissao = await bloqueioArea('vendas', 'ver')
  if (bloqueioPermissao) return bloqueioPermissao
  if ((await getPainelAutoescolaId()) !== autoescola_id) return 'Sessão inválida.'
  return bloqueioFeature(autoescola_id, 'vendas')
}

/** Início do período em UTC, com "hoje" e "mês" no fuso de Brasília (UTC-3, sem horário de verão). */
function inicioPeriodoISO(periodo: FiltroPeriodoVenda): string | null {
  if (periodo === 'tudo') return null
  const BRT = 3 * 3600000
  const brt = new Date(Date.now() - BRT)
  const y = brt.getUTCFullYear()
  const m = brt.getUTCMonth()
  let inicio = Date.UTC(y, m, brt.getUTCDate()) + BRT
  if (periodo === '7d') inicio -= 6 * 86400000
  if (periodo === '30d') inicio -= 29 * 86400000
  if (periodo === 'mes') inicio = Date.UTC(y, m, 1) + BRT
  return new Date(inicio).toISOString()
}

function filtrosSeguros(f: Partial<FiltrosVendas>): FiltrosVendas {
  return {
    status: STATUS_VENDA_IDS.includes(f.status as FiltroStatusVenda) ? (f.status as FiltroStatusVenda) : 'todas',
    periodo: PERIODO_VENDA_IDS.includes(f.periodo as FiltroPeriodoVenda) ? (f.periodo as FiltroPeriodoVenda) : 'tudo',
    origem: ORIGEM_VENDA_IDS.includes(f.origem as FiltroOrigemVenda) ? (f.origem as FiltroOrigemVenda) : 'todas',
    busca: typeof f.busca === 'string' ? f.busca.trim().slice(0, 80) : '',
    pagina: Number.isInteger(f.pagina) && (f.pagina as number) >= 1 ? (f.pagina as number) : 1,
  }
}

// Remove o que tem sentido na sintaxe de filtro do PostgREST (vírgula, parênteses,
// curingas, aspas) para o termo digitado nunca virar parte do filtro.
function termoSeguro(t: string): string {
  return t.replace(/[,()%_*\\"'\u0000]/g, ' ').replace(/\s+/g, ' ').trim()
}

// "123456" casa com "123.456.789-00": intercala curinga entre os dígitos.
function padraoDocumento(digitos: string): string {
  return digitos.split('').join('*')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Qb = any

interface FiltrosPreparados {
  autoescola_id: string
  desde: string | null
  origem: FiltroOrigemVenda
  /** Condições OR da busca por texto (já resolvidas), ou null sem busca. */
  condicoesBusca: string | null
}

/**
 * Resolve o que precisa de consulta (ids dos alunos da busca) ANTES de montar a
 * query. Não devolve o builder do Supabase: ele é "thenable" e um `await` em
 * cima dele executaria a consulta na hora.
 */
async function prepararFiltros(supabase: SupabaseClient, autoescola_id: string, f: FiltrosVendas): Promise<FiltrosPreparados> {
  const preparados: FiltrosPreparados = {
    autoescola_id,
    desde: inicioPeriodoISO(f.periodo),
    origem: f.origem,
    condicoesBusca: null,
  }

  const termo = termoSeguro(f.busca)
  if (termo) {
    const digitos = f.busca.replace(/\D/g, '')
    const condAluno = [`name.ilike.*${termo}*`]
    if (digitos.length >= 3) condAluno.push(`document_id.ilike.*${padraoDocumento(digitos)}*`)
    const { data: alunos } = await supabase
      .from('students')
      .select('id')
      .eq('autoescola_id', autoescola_id)
      .or(condAluno.join(','))
      .limit(300)
    const ids = (alunos ?? []).map((a: { id: string }) => a.id)

    const conds = [`produto_snapshot->>nome.ilike.*${termo}*`]
    if (ids.length > 0) conds.push(`student_id.in.(${ids.join(',')})`)
    preparados.condicoesBusca = conds.join(',')
  }
  return preparados
}

/** Filtros de período, origem e busca (tudo, menos o status). Síncrono: devolve o próprio builder. */
function aplicarFiltrosBase(q: Qb, p: FiltrosPreparados): Qb {
  q = q.eq('autoescola_id', p.autoescola_id)
  if (p.desde) q = q.gte('created_at', p.desde)
  if (p.origem !== 'todas') q = q.eq('origem', p.origem)
  if (p.condicoesBusca) q = q.or(p.condicoesBusca)
  return q
}

function aplicarStatus(q: Qb, status: FiltroStatusVenda): Qb {
  switch (status) {
    case 'todas': return q.not('status', 'in', '(expirado,cancelado)')
    case 'abandonados': return q.in('status', ['expirado', 'cancelado'])
    default: return q.eq('status', status)
  }
}

function achatar(row: Record<string, unknown>): PedidoComAluno {
  const aluno = row.aluno as unknown
  const vendedor = row.vendedor as unknown
  return {
    ...row,
    aluno: Array.isArray(aluno) ? aluno[0] ?? null : aluno ?? null,
    vendedor: Array.isArray(vendedor) ? vendedor[0] ?? null : vendedor ?? null,
  } as PedidoComAluno
}

/**
 * Lista paginada no servidor. Uma consulta leve (status + valor) sobre todo o
 * conjunto filtrado alimenta contadores e resumo; outra traz só a página.
 */
export async function listarVendasPaginado(
  autoescola_id: string,
  filtrosEntrada: Partial<FiltrosVendas> = {}
): Promise<ActionResult<VendasPagina>> {
  const erro = await bloqueioVerVendas(autoescola_id)
  if (erro) return { success: false, error: erro }

  const f = filtrosSeguros(filtrosEntrada)
  const supabase = createServiceClient()

  try {
    const prep = await prepararFiltros(supabase, autoescola_id, f)
    const leves = await buscarTodos<{ status: PedidoLojaStatus; valor_centavos: number }>(async (from, to) => {
      const q = aplicarFiltrosBase(supabase.from('pedidos_loja').select('status, valor_centavos'), prep)
      return q.order('created_at', { ascending: false }).order('id').range(from, to)
    })

    const contagem: Record<FiltroStatusVenda, number> = {
      todas: 0, aprovado: 0, pendente: 0, rejeitado: 0, reembolsado: 0, abandonados: 0,
    }
    const resumo: ResumoVendas = { aprovadoValor: 0, aprovadoQtd: 0, pendenteValor: 0, pendenteQtd: 0, reembolsadoQtd: 0 }
    for (const p of leves) {
      if (p.status === 'expirado' || p.status === 'cancelado') contagem.abandonados++
      else contagem.todas++
      if (p.status === 'aprovado') { contagem.aprovado++; resumo.aprovadoQtd++; resumo.aprovadoValor += p.valor_centavos }
      if (p.status === 'pendente') { contagem.pendente++; resumo.pendenteQtd++; resumo.pendenteValor += p.valor_centavos }
      if (p.status === 'rejeitado') contagem.rejeitado++
      if (p.status === 'reembolsado') { contagem.reembolsado++; resumo.reembolsadoQtd++ }
    }

    const total = contagem[f.status]
    const totalPaginas = Math.max(1, Math.ceil(total / VENDAS_POR_PAGINA))
    const pagina = Math.min(f.pagina, totalPaginas)
    const de = (pagina - 1) * VENDAS_POR_PAGINA

    let qPagina = aplicarFiltrosBase(supabase.from('pedidos_loja').select(SELECT_VENDA), prep)
    qPagina = aplicarStatus(qPagina, f.status)
    const { data, error } = await qPagina
      .order('created_at', { ascending: false })
      .order('id')
      .range(de, de + VENDAS_POR_PAGINA - 1)
    if (error) throw new Error(error.message)

    return {
      success: true,
      data: { vendas: (data ?? []).map(achatar), total, pagina, totalPaginas, contagem, resumo },
    }
  } catch (e) {
    console.error('[vendas] Erro ao listar vendas:', e)
    return { success: false, error: 'Não foi possível carregar as vendas. Tente novamente.' }
  }
}

const METODO_CSV: Record<string, string> = {
  credit_card: 'Cartão de crédito', debit_card: 'Cartão de débito', bank_transfer: 'Pix', ticket: 'Boleto', account_money: 'Saldo MP',
}
const STATUS_CSV: Record<PedidoLojaStatus, string> = {
  pendente: 'Pendente', aprovado: 'Aprovado', rejeitado: 'Rejeitado', cancelado: 'Cancelado', expirado: 'Expirado', reembolsado: 'Reembolsado',
}

// Aspas duplas + neutraliza fórmulas (=, +, -, @) abertas no Excel a partir de texto do aluno.
function celulaCsv(valor: string): string {
  const seguro = /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor
  return `"${seguro.replace(/"/g, '""')}"`
}

/** CSV (separador `;`, UTF-8 com BOM, abre direto no Excel pt-BR) com TODAS as vendas do filtro atual. */
export async function exportarVendasCsv(
  autoescola_id: string,
  filtrosEntrada: Partial<FiltrosVendas> = {}
): Promise<ActionResult<{ csv: string; linhas: number }>> {
  const erro = await bloqueioVerVendas(autoescola_id)
  if (erro) return { success: false, error: erro }

  const f = filtrosSeguros(filtrosEntrada)
  const supabase = createServiceClient()

  try {
    const prep = await prepararFiltros(supabase, autoescola_id, f)
    const pedidos = await buscarTodos<Record<string, unknown>>(async (from, to) => {
      let q = aplicarFiltrosBase(supabase.from('pedidos_loja').select(SELECT_VENDA), prep)
      q = aplicarStatus(q, f.status)
      return q.order('created_at', { ascending: false }).order('id').range(from, to)
    })

    const fmtData = (iso: string | null) =>
      iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : ''

    const cabecalho = ['Data', 'Aluno', 'CPF/CNH', 'Produto', 'Origem', 'Vendedor', 'Valor (R$)', 'Método', 'Status', 'Pago em', 'ID do pedido', 'ID do pagamento MP']
    const linhas = pedidos.map(achatar).map((v) => [
      fmtData(v.created_at),
      v.aluno?.name ?? '',
      v.aluno?.document_id ?? '',
      v.produto_snapshot?.nome ?? '',
      v.origem === 'manual' ? 'Manual' : 'Mercado Pago',
      v.vendedor?.full_name ?? '',
      (v.valor_centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      v.payment_method ? METODO_CSV[v.payment_method] ?? v.payment_method : '',
      STATUS_CSV[v.status] ?? v.status,
      fmtData(v.paid_at),
      v.id,
      v.mp_payment_id ?? '',
    ].map((c) => celulaCsv(String(c))).join(';'))

    // Exportar dados pessoais (CPF) fica registrado na auditoria
    await supabase.from('activity_logs_painel').insert({
      user_id: await getCurrentUserId(),
      username: await getCurrentUsername(),
      action_type: 'venda',
      description: `Exportou vendas em CSV (${linhas.length} linha${linhas.length !== 1 ? 's' : ''}).`,
      metadata: { ...f, linhas: linhas.length },
      autoescola_id,
    })

    return {
      success: true,
      data: { csv: '﻿' + [cabecalho.map((c) => celulaCsv(c)).join(';'), ...linhas].join('\r\n'), linhas: linhas.length },
    }
  } catch (e) {
    console.error('[vendas] Erro ao exportar CSV:', e)
    return { success: false, error: 'Não foi possível exportar. Tente novamente.' }
  }
}

/** Dados completos de uma venda para o painel lateral de detalhe. */
export async function getDetalheVenda(autoescola_id: string, pedido_id: string): Promise<ActionResult<DetalheVenda>> {
  const erro = await bloqueioVerVendas(autoescola_id)
  if (erro) return { success: false, error: erro }

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('pedidos_loja')
    .select(SELECT_VENDA)
    .eq('id', pedido_id)
    .eq('autoescola_id', autoescola_id)
    .single()
  if (!data) return { success: false, error: 'Venda não encontrada.' }
  const pedido = achatar(data)

  const [{ data: contato }, { data: logs }] = await Promise.all([
    pedido.student_id
      ? supabase.from('students').select('email, phone').eq('id', pedido.student_id).eq('autoescola_id', autoescola_id).maybeSingle()
      : Promise.resolve({ data: null }),
    // Os logs citam o pedido pelos 8 primeiros caracteres do id
    supabase
      .from('activity_logs_painel')
      .select('created_at, username, description')
      .eq('autoescola_id', autoescola_id)
      .ilike('description', `%pedido ${pedido.id.slice(0, 8)}%`)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  return { success: true, data: { pedido, alunoContato: contato ?? null, logs: logs ?? [] } }
}

/** Consulta o Mercado Pago para UM pedido pendente e libera os créditos se já foi pago. */
export async function verificarPedido(
  autoescola_id: string,
  pedido_id: string
): Promise<ActionResult<{ status: PedidoLojaStatus; creditado: boolean }>> {
  const bloqueioPermissao = await bloqueioArea('vendas', 'editar')
  if (bloqueioPermissao) return { success: false, error: bloqueioPermissao }
  if ((await getPainelAutoescolaId()) !== autoescola_id) return { success: false, error: 'Sessão inválida.' }
  const bloqueio = await bloqueioFeature(autoescola_id, 'vendas')
  if (bloqueio) return { success: false, error: bloqueio }

  const supabase = createServiceClient()
  const resumo = await reconciliarPedidosPendentes(supabase, { autoescolaId: autoescola_id, pedidoId: pedido_id })
  if (resumo.erros > 0) return { success: false, error: 'Não foi possível consultar o Mercado Pago. Tente de novo.' }

  const { data } = await supabase
    .from('pedidos_loja')
    .select('status')
    .eq('id', pedido_id)
    .eq('autoescola_id', autoescola_id)
    .single()
  if (!data) return { success: false, error: 'Venda não encontrada.' }

  if (resumo.aprovados > 0) {
    await supabase.from('activity_logs_painel').insert({
      user_id: await getCurrentUserId(),
      username: await getCurrentUsername(),
      action_type: 'venda',
      description: `Verificação de pagamento: pedido ${pedido_id.slice(0, 8)} aprovado no Mercado Pago, créditos liberados.`,
      metadata: { pedido_id },
      autoescola_id,
    })
  }
  return { success: true, data: { status: data.status as PedidoLojaStatus, creditado: resumo.aprovados > 0 } }
}

/**
 * "Verificar pagamentos": consulta o Mercado Pago para os pedidos pendentes da
 * escola e libera os créditos dos que já foram pagos (ex.: Pix pago no app do
 * banco sem o webhook ter chegado).
 */
export async function verificarPagamentosPendentes(
  autoescola_id: string
): Promise<ActionResult<ResumoReconciliacao>> {
  const bloqueioPermissao = await bloqueioArea('vendas', 'editar')
  if (bloqueioPermissao) return { success: false, error: bloqueioPermissao }
  if ((await getPainelAutoescolaId()) !== autoescola_id) return { success: false, error: 'Sessão inválida.' }

  const bloqueio = await bloqueioFeature(autoescola_id, 'vendas')
  if (bloqueio) return { success: false, error: bloqueio }

  const supabase = createServiceClient()
  const resumo = await reconciliarPedidosPendentes(supabase, { autoescolaId: autoescola_id })

  if (resumo.aprovados > 0) {
    await supabase.from('activity_logs_painel').insert({
      user_id: await getCurrentUserId(),
      username: await getCurrentUsername(),
      action_type: 'venda',
      description: `Verificação de pagamentos: ${resumo.aprovados} pedido(s) aprovado(s) no Mercado Pago tiveram os créditos liberados.`,
      metadata: { ...resumo },
      autoescola_id,
    })
  }

  return { success: true, data: resumo }
}

/**
 * Reembolso no Mercado Pago. Permissão individual (users_painel.pode_reembolsar,
 * concedida só no /admin) — ter "Editar" em Vendas não basta.
 */
export async function reembolsarPedido(autoescola_id: string, pedido_id: string): Promise<ActionResult<null>> {
  const bloqueioPermissao = await bloqueioReembolso()
  if (bloqueioPermissao) return { success: false, error: bloqueioPermissao }
  if ((await getPainelAutoescolaId()) !== autoescola_id) return { success: false, error: 'Sessão inválida.' }

  const bloqueio = await bloqueioFeature(autoescola_id, 'vendas')
  if (bloqueio) return { success: false, error: bloqueio }

  const supabase = createServiceClient()

  const { data: pedido } = await supabase
    .from('pedidos_loja')
    .select('*')
    .eq('id', pedido_id)
    .eq('autoescola_id', autoescola_id)
    .single()
  if (!pedido) return { success: false, error: 'Pedido não encontrado.' }
  if (pedido.status !== 'aprovado') return { success: false, error: 'Só é possível reembolsar pedidos aprovados.' }
  if (!pedido.mp_payment_id) return { success: false, error: 'Pedido sem payment_id do Mercado Pago.' }

  const { data: credenciaisRow } = await supabase
    .from('autoescola_pagamentos')
    .select('mp_access_token_secret_id')
    .eq('autoescola_id', autoescola_id)
    .maybeSingle()
  if (!credenciaisRow?.mp_access_token_secret_id) {
    return { success: false, error: 'Credenciais do Mercado Pago não configuradas.' }
  }

  const { data: accessToken } = await supabase.rpc('vault_read_secret', {
    p_secret_id: credenciaisRow.mp_access_token_secret_id,
  })
  if (!accessToken) return { success: false, error: 'Credenciais do Mercado Pago não configuradas.' }

  try {
    await criarReembolso(pedido.mp_payment_id, accessToken, `refund-${pedido.id}`)
  } catch (e) {
    console.error('[vendas] Erro ao reembolsar pedido:', e)
    return { success: false, error: 'Erro ao solicitar reembolso no Mercado Pago. Tente novamente.' }
  }

  await supabase
    .from('pedidos_loja')
    .update({ status: 'reembolsado', updated_at: new Date().toISOString() })
    .eq('id', pedido.id)

  await supabase.from('activity_logs_painel').insert({
    user_id: await getCurrentUserId(),
    username: await getCurrentUsername(),
    action_type: 'reembolso',
    description: `Reembolso solicitado pelo painel — pedido ${pedido.id.slice(0, 8)} (${pedido.produto_snapshot.nome}), ${(pedido.valor_centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. Créditos NÃO foram removidos automaticamente — ajuste manualmente se necessário.`,
    metadata: {
      pedido_id: pedido.id,
      mp_payment_id: pedido.mp_payment_id,
      valor_centavos: pedido.valor_centavos,
      student_id: pedido.student_id ?? null,
    },
    autoescola_id,
  })

  return { success: true, data: null }
}
