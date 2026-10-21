'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { buscarTodos } from '@/lib/buscarTodos'

export interface FinanceiroFiltros {
  /** YYYY-MM-DD (inclusive) */
  de: string
  /** YYYY-MM-DD (inclusive) */
  ate: string
  origem?: 'mercado_pago' | 'manual' | ''
  forma?: string
  vendedor?: string
  categoria?: string
}

export type StatusVenda = 'aprovado' | 'pendente' | 'reembolsado'

export interface VendaFinanceiro {
  id: string
  /** Data do pagamento (aprovado/reembolsado) ou da criação (pendente), YYYY-MM-DD no horário de Brasília */
  data: string
  status: StatusVenda
  origem: string
  forma: string
  produto: string
  categoria: string
  aluno: string
  vendedor: string | null
  valor_centavos: number
  aulas_carro: number
  aulas_moto: number
}

export interface LinhaAgrupada {
  chave: string
  vendas: number
  valor_centavos: number
}

export interface LinhaVendedor extends LinhaAgrupada {
  ticket_medio_centavos: number
}

export interface LinhaProduto extends LinhaAgrupada {
  categoria: string
}

export interface RepasseInstrutor {
  instructor_name: string
  categoria: string | null
  aulas: number
  bancas: number
  km_total: number
  valor_hora_aula: number | null
  valor_banca: number | null
  /** null = falta o valor de hora/aula ou de banca do instrutor */
  valor_a_pagar: number | null
}

export interface PontoSerie {
  /** YYYY-MM-DD (dia) ou YYYY-MM (mês) */
  chave: string
  receita_centavos: number
  repasse_centavos: number
  vendas: number
}

export interface ResumoPeriodo {
  receita_centavos: number
  vendas: number
  repasse_centavos: number
}

export interface FinanceiroData {
  filtros: FinanceiroFiltros
  anterior: { de: string; ate: string } & ResumoPeriodo
  // Receita
  receita_bruta_centavos: number
  reembolsos_centavos: number
  reembolsos_qtd: number
  receita_liquida_centavos: number
  pendente_centavos: number
  pendente_qtd: number
  vendas: number
  ticket_medio_centavos: number
  aulas_vendidas_carro: number
  aulas_vendidas_moto: number
  // Repasse
  repasse_centavos: number
  repasse_incompleto: boolean
  aulas_realizadas: number
  bancas_realizadas: number
  km_total: number
  saldo_centavos: number
  margem_pct: number | null
  // Quebras
  granularidade: 'dia' | 'mes'
  serie: PontoSerie[]
  por_forma: LinhaAgrupada[]
  por_origem: LinhaAgrupada[]
  por_categoria: LinhaAgrupada[]
  por_produto: LinhaProduto[]
  por_vendedor: LinhaVendedor[]
  repasse_instrutores: RepasseInstrutor[]
  // Lista
  transacoes: VendaFinanceiro[]
  transacoes_truncadas: boolean
  // Opções dos filtros
  vendedores: { id: string; nome: string }[]
  categorias: string[]
}

const FORMAS: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao: 'Cartão',
  outro: 'Outro',
  bank_transfer: 'Pix / transferência (Mercado Pago)',
  credit_card: 'Cartão de crédito (Mercado Pago)',
  debit_card: 'Cartão de débito (Mercado Pago)',
  account_money: 'Saldo Mercado Pago',
  ticket: 'Boleto (Mercado Pago)',
}

const LIMITE_TRANSACOES = 3000
const LIMITE_DIAS_SERIE_DIARIA = 92

function labelForma(f: string | null): string {
  if (!f) return 'Não informado'
  return FORMAS[f] ?? f
}

// ─── Datas (tudo em horário de Brasília, UTC-3) ───────────────────────────────

function somarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86_400_000) + 1
}

function dataBR(timestamp: string): string {
  return new Date(Date.parse(timestamp) - 3 * 3_600_000).toISOString().slice(0, 10)
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/

// ─── Pedidos ──────────────────────────────────────────────────────────────────

interface SnapshotProduto {
  nome?: string
  tipo?: string
  qtd_cat_a?: number
  qtd_cat_b?: number
}

interface PedidoRow {
  id: string
  status: string
  origem: string
  payment_method: string | null
  valor_centavos: number
  paid_at: string | null
  created_at: string
  produto_snapshot: SnapshotProduto | null
  vendedor_user_id: string | null
  vendedor: { full_name: string | null } | { full_name: string | null }[] | null
  aluno: { name: string | null } | { name: string | null }[] | null
}

function categoriaDoProduto(s: SnapshotProduto | null): string {
  if (!s) return 'Outros'
  if ((s.nome ?? '').toLowerCase().startsWith('ajuste de créditos')) return 'Ajuste de créditos'
  if (s.tipo === 'servico') return 'Serviços'
  const carro = (s.qtd_cat_b ?? 0) > 0
  const moto = (s.qtd_cat_a ?? 0) > 0
  if (carro && moto) return 'Carro + Moto'
  if (carro) return 'Aulas de carro'
  if (moto) return 'Aulas de moto'
  return 'Outros'
}

function um<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v
}

// ─── Repasse ──────────────────────────────────────────────────────────────────

interface AulaRepasse {
  date: string
  instructor_name: string
  tipo: string | null
  km_rodado: number | null
}

export async function getFinanceiro(
  autoescola_id: string,
  filtrosIn: FinanceiroFiltros
): Promise<FinanceiroData> {
  const supabase = createServiceClient()

  // Sanitiza o período (cliente pode mandar qualquer coisa)
  const hoje = dataBR(new Date().toISOString())
  let { de, ate } = filtrosIn
  if (!ISO_RE.test(de ?? '') || !ISO_RE.test(ate ?? '')) {
    de = `${hoje.slice(0, 8)}01`
    ate = hoje
  }
  if (de > ate) [de, ate] = [ate, de]
  if (diasEntre(de, ate) > 800) de = somarDias(ate, -799)
  const filtros: FinanceiroFiltros = {
    de,
    ate,
    origem: filtrosIn.origem === 'manual' || filtrosIn.origem === 'mercado_pago' ? filtrosIn.origem : '',
    forma: filtrosIn.forma || '',
    vendedor: filtrosIn.vendedor || '',
    categoria: filtrosIn.categoria || '',
  }

  const nDias = diasEntre(de, ate)
  const antAte = somarDias(de, -1)
  const antDe = somarDias(antAte, -(nDias - 1))

  const inicio = (d: string) => `${d}T00:00:00-03:00`
  const fimExclusivo = (d: string) => `${somarDias(d, 1)}T00:00:00-03:00`

  const SELECT_PEDIDO =
    'id, status, origem, payment_method, valor_centavos, paid_at, created_at, produto_snapshot, vendedor_user_id, vendedor:users_painel(full_name), aluno:students(name)'

  // O tipo do query builder do Supabase é profundo demais para o tsc ao encadear filtros dinâmicos
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function aplicarFiltrosDb(q: any): any {
    if (filtros.origem) q = q.eq('origem', filtros.origem)
    if (filtros.forma) q = q.eq('payment_method', filtros.forma)
    if (filtros.vendedor) q = q.eq('vendedor_user_id', filtros.vendedor)
    return q
  }

  const [pagos, pendentes, pagosAnteriores, aulas, instrutores, usuarios, aulasAnteriores] = await Promise.all([
    buscarTodos<PedidoRow>((from, to) =>
      aplicarFiltrosDb(
        supabase
          .from('pedidos_loja')
          .select(SELECT_PEDIDO)
          .eq('autoescola_id', autoescola_id)
          .in('status', ['aprovado', 'reembolsado'])
          .gte('paid_at', inicio(de))
          .lt('paid_at', fimExclusivo(ate))
      )
        .order('paid_at', { ascending: false })
        .order('id', { ascending: true })
        .range(from, to) as unknown as PromiseLike<{ data: PedidoRow[] | null; error: unknown }>
    ),
    buscarTodos<PedidoRow>((from, to) =>
      aplicarFiltrosDb(
        supabase
          .from('pedidos_loja')
          .select(SELECT_PEDIDO)
          .eq('autoescola_id', autoescola_id)
          .eq('status', 'pendente')
          .gte('created_at', inicio(de))
          .lt('created_at', fimExclusivo(ate))
      )
        .order('created_at', { ascending: false })
        .order('id', { ascending: true })
        .range(from, to) as unknown as PromiseLike<{ data: PedidoRow[] | null; error: unknown }>
    ),
    buscarTodos<PedidoRow>((from, to) =>
      aplicarFiltrosDb(
        supabase
          .from('pedidos_loja')
          .select(SELECT_PEDIDO)
          .eq('autoescola_id', autoescola_id)
          .eq('status', 'aprovado')
          .gte('paid_at', inicio(antDe))
          .lt('paid_at', fimExclusivo(antAte))
      )
        .order('id', { ascending: true })
        .range(from, to) as unknown as PromiseLike<{ data: PedidoRow[] | null; error: unknown }>
    ),
    buscarTodos<AulaRepasse>((from, to) =>
      supabase
        .from('agendamentos')
        .select('date, instructor_name, tipo, km_rodado')
        .eq('autoescola_id', autoescola_id)
        .eq('status', 'completed')
        .not('instructor_name', 'is', null)
        .gte('date', de)
        .lte('date', ate)
        .order('id', { ascending: true })
        .range(from, to)
    ),
    supabase
      .from('instructors')
      .select('name, category, valor_hora_aula, valor_banca')
      .eq('autoescola_id', autoescola_id)
      .then((r) => r.data ?? []),
    supabase
      .from('users_painel')
      .select('id, full_name')
      .eq('autoescola_id', autoescola_id)
      .order('full_name')
      .then((r) => r.data ?? []),
    buscarTodos<AulaRepasse>((from, to) =>
      supabase
        .from('agendamentos')
        .select('date, instructor_name, tipo, km_rodado')
        .eq('autoescola_id', autoescola_id)
        .eq('status', 'completed')
        .not('instructor_name', 'is', null)
        .gte('date', antDe)
        .lte('date', antAte)
        .order('id', { ascending: true })
        .range(from, to)
    ),
  ])

  // ── Valores dos instrutores ──
  const valorAula = new Map<string, number | null>()
  const valorBanca = new Map<string, number | null>()
  const catInstrutor = new Map<string, string>()
  for (const i of instrutores) {
    valorAula.set(i.name, i.valor_hora_aula != null ? Number(i.valor_hora_aula) : null)
    valorBanca.set(i.name, i.valor_banca != null ? Number(i.valor_banca) : null)
    catInstrutor.set(i.name, i.category)
  }

  function custoAula(a: AulaRepasse): number {
    const v = a.tipo === 'banca' ? valorBanca.get(a.instructor_name) : valorAula.get(a.instructor_name)
    return v ?? 0
  }

  // ── Normaliza vendas ──
  function paraVenda(p: PedidoRow): VendaFinanceiro {
    const snap = p.produto_snapshot
    return {
      id: p.id,
      data: dataBR(p.status === 'pendente' ? p.created_at : p.paid_at ?? p.created_at),
      status: p.status as StatusVenda,
      origem: p.origem,
      forma: labelForma(p.payment_method),
      produto: snap?.nome ?? 'Produto removido',
      categoria: categoriaDoProduto(snap),
      aluno: um(p.aluno)?.name ?? '—',
      vendedor: p.vendedor_user_id ? um(p.vendedor)?.full_name ?? 'Desconhecido' : null,
      valor_centavos: p.valor_centavos,
      aulas_carro: snap?.qtd_cat_b ?? 0,
      aulas_moto: snap?.qtd_cat_a ?? 0,
    }
  }

  const passaCategoria = (v: VendaFinanceiro) => !filtros.categoria || v.categoria === filtros.categoria
  const todasVendas = [...pagos, ...pendentes].map(paraVenda)
  const vendasFiltradas = todasVendas.filter(passaCategoria)
  const aprovadas = vendasFiltradas.filter((v) => v.status === 'aprovado')
  const reembolsadas = vendasFiltradas.filter((v) => v.status === 'reembolsado')
  const pendentesF = vendasFiltradas.filter((v) => v.status === 'pendente')

  const soma = (l: VendaFinanceiro[]) => l.reduce((acc, v) => acc + v.valor_centavos, 0)

  const receita_liquida_centavos = soma(aprovadas)
  const reembolsos_centavos = soma(reembolsadas)
  const vendasQtd = aprovadas.length

  // ── Repasse (não depende dos filtros de venda) ──
  const porInstrutor = new Map<string, RepasseInstrutor>()
  for (const a of aulas) {
    const nome = a.instructor_name
    let r = porInstrutor.get(nome)
    if (!r) {
      r = {
        instructor_name: nome,
        categoria: catInstrutor.get(nome) ?? null,
        aulas: 0,
        bancas: 0,
        km_total: 0,
        valor_hora_aula: valorAula.get(nome) ?? null,
        valor_banca: valorBanca.get(nome) ?? null,
        valor_a_pagar: 0,
      }
      porInstrutor.set(nome, r)
    }
    if (a.tipo === 'banca') r.bancas++
    else r.aulas++
    r.km_total += a.km_rodado ?? 0
  }
  const repasse_instrutores = Array.from(porInstrutor.values())
    .map((r) => {
      const semAula = r.aulas > 0 && r.valor_hora_aula == null
      const semBanca = r.bancas > 0 && r.valor_banca == null
      return {
        ...r,
        valor_a_pagar:
          semAula || semBanca ? null : (r.valor_hora_aula ?? 0) * r.aulas + (r.valor_banca ?? 0) * r.bancas,
      }
    })
    .sort((a, b) => b.aulas + b.bancas - (a.aulas + a.bancas))
  const repasse_centavos = Math.round(
    repasse_instrutores.reduce((acc, r) => acc + (r.valor_a_pagar ?? 0), 0) * 100
  )
  const repasse_incompleto = repasse_instrutores.some((r) => r.valor_a_pagar == null)

  const repasseAnterior = Math.round(aulasAnteriores.reduce((acc, a) => acc + custoAula(a), 0) * 100)
  const receitaAnterior = pagosAnteriores
    .map(paraVenda)
    .filter(passaCategoria)
    .reduce((acc, v) => acc + v.valor_centavos, 0)
  const vendasAnterior = pagosAnteriores.map(paraVenda).filter(passaCategoria).length

  // ── Série temporal ──
  const granularidade: 'dia' | 'mes' = nDias <= LIMITE_DIAS_SERIE_DIARIA ? 'dia' : 'mes'
  const chaveDe = (data: string) => (granularidade === 'dia' ? data : data.slice(0, 7))
  const serieMap = new Map<string, PontoSerie>()
  if (granularidade === 'dia') {
    for (let d = de; d <= ate; d = somarDias(d, 1)) {
      serieMap.set(d, { chave: d, receita_centavos: 0, repasse_centavos: 0, vendas: 0 })
    }
  } else {
    let [ano, mes] = de.split('-').map(Number)
    const [anoFim, mesFim] = ate.split('-').map(Number)
    while (ano < anoFim || (ano === anoFim && mes <= mesFim)) {
      const chave = `${ano}-${String(mes).padStart(2, '0')}`
      serieMap.set(chave, { chave, receita_centavos: 0, repasse_centavos: 0, vendas: 0 })
      if (++mes > 12) { mes = 1; ano++ }
    }
  }
  for (const v of aprovadas) {
    const p = serieMap.get(chaveDe(v.data))
    if (p) {
      p.receita_centavos += v.valor_centavos
      p.vendas++
    }
  }
  for (const a of aulas) {
    const p = serieMap.get(chaveDe(a.date))
    if (p) p.repasse_centavos += Math.round(custoAula(a) * 100)
  }
  const serie = Array.from(serieMap.values())

  // ── Quebras ──
  function agrupar(lista: VendaFinanceiro[], chave: (v: VendaFinanceiro) => string): LinhaAgrupada[] {
    const m = new Map<string, LinhaAgrupada>()
    for (const v of lista) {
      const k = chave(v)
      const l = m.get(k) ?? { chave: k, vendas: 0, valor_centavos: 0 }
      l.vendas++
      l.valor_centavos += v.valor_centavos
      m.set(k, l)
    }
    return Array.from(m.values()).sort((a, b) => b.valor_centavos - a.valor_centavos)
  }

  const por_produto: LinhaProduto[] = agrupar(aprovadas, (v) => v.produto).map((l) => ({
    ...l,
    categoria: aprovadas.find((v) => v.produto === l.chave)?.categoria ?? 'Outros',
  }))
  const por_vendedor: LinhaVendedor[] = agrupar(aprovadas, (v) => v.vendedor ?? 'Loja online (sem vendedor)').map(
    (l) => ({ ...l, ticket_medio_centavos: l.vendas > 0 ? Math.round(l.valor_centavos / l.vendas) : 0 })
  )

  const transacoesOrdenadas = vendasFiltradas.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0))
  const transacoes_truncadas = transacoesOrdenadas.length > LIMITE_TRANSACOES

  const saldo_centavos = receita_liquida_centavos - repasse_centavos

  return {
    filtros,
    anterior: { de: antDe, ate: antAte, receita_centavos: receitaAnterior, vendas: vendasAnterior, repasse_centavos: repasseAnterior },
    receita_bruta_centavos: receita_liquida_centavos + reembolsos_centavos,
    reembolsos_centavos,
    reembolsos_qtd: reembolsadas.length,
    receita_liquida_centavos,
    pendente_centavos: soma(pendentesF),
    pendente_qtd: pendentesF.length,
    vendas: vendasQtd,
    ticket_medio_centavos: vendasQtd > 0 ? Math.round(receita_liquida_centavos / vendasQtd) : 0,
    aulas_vendidas_carro: aprovadas.reduce((acc, v) => acc + v.aulas_carro, 0),
    aulas_vendidas_moto: aprovadas.reduce((acc, v) => acc + v.aulas_moto, 0),
    repasse_centavos,
    repasse_incompleto,
    aulas_realizadas: aulas.filter((a) => a.tipo !== 'banca').length,
    bancas_realizadas: aulas.filter((a) => a.tipo === 'banca').length,
    km_total: aulas.reduce((acc, a) => acc + (a.km_rodado ?? 0), 0),
    saldo_centavos,
    margem_pct: receita_liquida_centavos > 0 ? (saldo_centavos / receita_liquida_centavos) * 100 : null,
    granularidade,
    serie,
    por_forma: agrupar(aprovadas, (v) => v.forma),
    por_origem: agrupar(aprovadas, (v) => (v.origem === 'manual' ? 'Vendas no painel' : 'Loja online (Mercado Pago)')),
    por_categoria: agrupar(aprovadas, (v) => v.categoria),
    por_produto,
    por_vendedor,
    repasse_instrutores,
    transacoes: transacoesOrdenadas.slice(0, LIMITE_TRANSACOES),
    transacoes_truncadas,
    vendedores: usuarios.map((u) => ({ id: u.id, nome: u.full_name ?? 'Sem nome' })),
    categorias: Array.from(new Set(todasVendas.map((v) => v.categoria))).sort(),
  }
}
