/**
 * Janela em que o aluno pode usar o app para agendar (travamento da autoescola).
 * Sem janela (ou `ativo: false`) = sem restrição. Client-safe.
 *
 * `dias` usa o dia da semana do JS como chave ('0' domingo … '6' sábado); um dia
 * sem faixas é dia fechado. Várias faixas por dia permitem horários específicos
 * (ex.: sábado só 08–12) ou pausa de almoço. Horários em Brasília.
 */

export interface FaixaHorario {
  inicio: string // HH:MM
  fim: string // HH:MM (exclusivo)
}

export interface JanelaAgendamento {
  ativo: boolean
  dias: Record<string, FaixaHorario[]>
}

export const MSG_FORA_DO_HORARIO =
  'Fora do horário de realizar agendamentos. Em caso de dúvidas, entre em contato com a autoescola.'

/** Ordem de exibição: segunda a domingo. `id` é o getDay() do JS. */
export const DIAS_SEMANA = [
  { id: 1, label: 'Segunda-feira', curto: 'Seg' },
  { id: 2, label: 'Terça-feira', curto: 'Ter' },
  { id: 3, label: 'Quarta-feira', curto: 'Qua' },
  { id: 4, label: 'Quinta-feira', curto: 'Qui' },
  { id: 5, label: 'Sexta-feira', curto: 'Sex' },
  { id: 6, label: 'Sábado', curto: 'Sáb' },
  { id: 0, label: 'Domingo', curto: 'Dom' },
] as const

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/

function minutos(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function janelaVazia(): JanelaAgendamento {
  return { ativo: false, dias: {} }
}

/** Lê o jsonb do banco de forma defensiva; devolve null se não houver janela válida. */
export function normalizarJanela(raw: unknown): JanelaAgendamento | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as { ativo?: unknown; dias?: unknown }
  const dias: Record<string, FaixaHorario[]> = {}
  if (r.dias && typeof r.dias === 'object') {
    for (const [dia, faixas] of Object.entries(r.dias as Record<string, unknown>)) {
      if (!/^[0-6]$/.test(dia) || !Array.isArray(faixas)) continue
      dias[dia] = faixas
        .filter((f): f is FaixaHorario => !!f && typeof f.inicio === 'string' && typeof f.fim === 'string' && HHMM.test(f.inicio) && HHMM.test(f.fim))
        .map((f) => ({ inicio: f.inicio, fim: f.fim }))
    }
  }
  return { ativo: r.ativo === true, dias }
}

/** Mensagem de erro, ou null se a janela pode ser salva. */
export function validarJanela(j: JanelaAgendamento): string | null {
  if (!j.ativo) return null
  let temFaixa = false
  for (const { id, label } of DIAS_SEMANA) {
    const faixas = [...(j.dias[String(id)] ?? [])]
    for (const f of faixas) {
      if (!HHMM.test(f.inicio) || !HHMM.test(f.fim)) return `${label}: informe horários válidos.`
      if (minutos(f.inicio) >= minutos(f.fim)) return `${label}: o horário final deve ser depois do inicial.`
    }
    faixas.sort((a, b) => minutos(a.inicio) - minutos(b.inicio))
    for (let i = 1; i < faixas.length; i++) {
      if (minutos(faixas[i].inicio) < minutos(faixas[i - 1].fim)) return `${label}: as faixas de horário não podem se sobrepor.`
    }
    if (faixas.length > 0) temFaixa = true
  }
  return temFaixa ? null : 'Libere pelo menos um dia, ou desative o travamento.'
}

/** Dia da semana (0=domingo) e minutos desde 00:00 em Brasília. */
export function agoraBRT(now: Date = new Date()): { dia: number; minutos: number } {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now)
  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? ''
  const dia = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'))
  return { dia, minutos: Number(get('hour')) * 60 + Number(get('minute')) }
}

export function janelaAbertaAgora(j: JanelaAgendamento | null, now: Date = new Date()): boolean {
  if (!j || !j.ativo) return true
  const { dia, minutos: agora } = agoraBRT(now)
  return (j.dias[String(dia)] ?? []).some((f) => agora >= minutos(f.inicio) && agora < minutos(f.fim))
}

/** Resumo legível por dia, agrupando dias consecutivos iguais ("Seg–Sex 07:00–20:00"). */
export function resumoJanela(j: JanelaAgendamento): string[] {
  const texto = (id: number) => (j.dias[String(id)] ?? []).map((f) => `${f.inicio}–${f.fim}`).join(' e ')
  const linhas: { de: string; ate: string; t: string }[] = []
  for (const d of DIAS_SEMANA) {
    const t = texto(d.id)
    if (!t) continue
    const ultima = linhas[linhas.length - 1]
    const anterior = DIAS_SEMANA[DIAS_SEMANA.findIndex((x) => x.id === d.id) - 1]
    if (ultima && anterior && ultima.t === t && ultima.ate === anterior.curto) ultima.ate = d.curto
    else linhas.push({ de: d.curto, ate: d.curto, t })
  }
  return linhas.map((l) => `${l.de === l.ate ? l.de : `${l.de}–${l.ate}`}: ${l.t}`)
}
