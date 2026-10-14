// Regra única de "quais horários valem para o instrutor neste dia" — usada pela
// disponibilidade do aluno, agendamento em massa e calendário do painel.

export interface HorarioLinha {
  horario: string
  instrutor: string | null
  dias_semana?: number[] | null
  /** YYYY-MM-DD: horário pontual (vale só nesse dia). Vazio = recorrente. */
  data?: string | null
}

/** ISO (1=Seg…7=Dom) a partir de YYYY-MM-DD. */
export function isoWeekday(date: string): number {
  const d = new Date(date + 'T12:00:00').getDay()
  return d === 0 ? 7 : d
}

function vale(l: HorarioLinha, dia: number): boolean {
  return !l.dias_semana || l.dias_semana.length === 0 || l.dias_semana.includes(dia)
}

/**
 * Horários do instrutor no dia. Parte dos recorrentes: se o instrutor tem linhas próprias (em qualquer dia),
 * os globais são ignorados — assim um instrutor só com horário de quarta não herda o global nos outros dias.
 * Linhas sem dias_semana valem todos os dias. Com `data` (YYYY-MM-DD), somam-se os horários pontuais daquela
 * data (do instrutor, ou do global quando ele usa o global).
 */
export function horariosDoInstrutorNoDia(linhas: HorarioLinha[], instrutor: string, dia: number, data?: string): string[] {
  const recorrentes = linhas.filter((l) => !l.data)
  const proprias = recorrentes.filter((l) => l.instrutor === instrutor)
  const usaGlobal = proprias.length === 0
  const base = usaGlobal ? recorrentes.filter((l) => !l.instrutor) : proprias
  const pontuais = data ? linhas.filter((l) => l.data === data && (l.instrutor === instrutor || (usaGlobal && !l.instrutor))) : []
  return [...new Set([...base.filter((l) => vale(l, dia)), ...pontuais].map((l) => l.horario))]
}

/**
 * O campo `instructor` de um bloqueio vale para todos quando vazio ou quando vem o texto "TODOS"
 * (registros antigos gravaram assim). Senão vale só para o instrutor citado.
 */
export function bloqueioAplicaAoInstrutor(instructor: string | null | undefined, nome: string | null): boolean {
  if (!instructor || instructor.trim().toUpperCase() === 'TODOS') return true
  return instructor === nome
}

// ─── Horário × bloqueio semanal ───────────────────────────────────────────────

export interface BloqueioSemanalLinha {
  instructor: string | null
  vehicle_type: string
  time_slot: string
  weekdays: number[]
  reason?: string | null
}

/** Aceita weekdays como array ou string JSON ("[1,2]") e devolve ISO 1–7. */
export function parseWeekdaysIso(w: unknown): number[] {
  let arr: unknown = w
  if (typeof arr === 'string') { try { arr = JSON.parse(arr) } catch { return [] } }
  return Array.isArray(arr) ? arr.map(Number).filter((n) => n >= 1 && n <= 7) : []
}

function veiculo(vt: string): 'CARRO' | 'MOTO' | 'TODOS' {
  const u = (vt ?? '').toUpperCase()
  if (u === 'CAR' || u === 'CARRO') return 'CARRO'
  if (u === 'MOTO' || u === 'MOTORCYCLE') return 'MOTO'
  return 'TODOS'
}

function cobre(b: BloqueioSemanalLinha, horario: string): boolean {
  if (b.time_slot === 'TODOS' || b.time_slot === 'DIA_INTEIRO') return true
  if (b.time_slot.startsWith('APOS_')) return horario >= b.time_slot.slice(5)
  // Horário exato: bloqueia quem ocupa o mesmo intervalo de 50 min
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(b.time_slot) && Math.abs(Number(b.time_slot.slice(0, 2)) * 60 + Number(b.time_slot.slice(3)) - (Number(horario.slice(0, 2)) * 60 + Number(horario.slice(3)))) < 50
}

/**
 * Primeiro bloqueio semanal que "come" o horário num dos dias. Para instrutor AMBOS ou para o global,
 * só conta como conflito se TODAS as categorias atendidas estiverem bloqueadas (senão ainda dá aula).
 */
export function conflitoComBloqueio(
  horario: string,
  dias: number[] | null,
  instrutor: string | null,
  categoria: string,
  bloqueios: BloqueioSemanalLinha[]
): { dia: number; bloqueio: BloqueioSemanalLinha } | null {
  const servidas: Array<'CARRO' | 'MOTO'> = categoria === 'CARRO' ? ['CARRO'] : categoria === 'MOTO' ? ['MOTO'] : ['CARRO', 'MOTO']
  const alvo = dias && dias.length > 0 ? dias : [1, 2, 3, 4, 5, 6, 7]
  for (const dia of alvo) {
    const aplicaveis = bloqueios.filter(
      (b) => bloqueioAplicaAoInstrutor(b.instructor, instrutor) && b.weekdays.includes(dia) && cobre(b, horario)
    )
    if (aplicaveis.length === 0) continue
    const todasBloqueadas = servidas.every((c) => aplicaveis.some((b) => veiculo(b.vehicle_type) === 'TODOS' || veiculo(b.vehicle_type) === c))
    if (todasBloqueadas) {
      const b = aplicaveis.find((x) => veiculo(x.vehicle_type) === 'TODOS') ?? aplicaveis[0]
      return { dia, bloqueio: b }
    }
  }
  return null
}

const NOMES = ['', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo']
export function mensagemConflito(horario: string, c: { dia: number; bloqueio: BloqueioSemanalLinha }): string {
  const t = c.bloqueio.time_slot
  const o = t === 'TODOS' || t === 'DIA_INTEIRO' ? 'o dia inteiro está bloqueado' : t.startsWith('APOS_') ? `há bloqueio a partir das ${t.slice(5)}` : 'esse horário está bloqueado'
  return `${horario} cai num bloqueio na ${NOMES[c.dia]} (${o}${c.bloqueio.reason ? `: ${c.bloqueio.reason}` : ''}). Remova o bloqueio antes ou escolha outro horário.`
}

// ─── Sobreposição (horário × horário, bloqueio × bloqueio) ────────────────────

/** Duração visual de cada aula; dois horários a menos que isso de distância se sobrepõem. */
export const DURACAO_AULA_MIN = 50

const minutos = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3))
const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const DIAS_TODOS = [1, 2, 3, 4, 5, 6, 7]
const diasDe = (d: number[] | null | undefined) => (d && d.length > 0 ? d : DIAS_TODOS)

/** Primeiro horário do mesmo instrutor (mesmo escopo) que ocupa o intervalo do novo num dia em comum. */
export function conflitoComHorario(
  horario: string,
  dias: number[] | null,
  existentes: Array<{ id?: string; horario: string; dias_semana: number[] | null; data?: string | null }>,
  ignorarId?: string,
  data?: string | null
): { dia: number; horario: string } | null {
  if (!HHMM_RE.test(horario)) return null
  // Horário pontual: vale o dia da semana daquela data; compara com os recorrentes desse dia e com os da mesma data.
  // Horário recorrente: compara só com recorrentes (os pontuais são exceções de datas específicas).
  const alvo = data ? [isoWeekday(data)] : diasDe(dias)
  for (const e of existentes) {
    if (e.id && e.id === ignorarId) continue
    if (!HHMM_RE.test(e.horario) || Math.abs(minutos(e.horario) - minutos(horario)) >= DURACAO_AULA_MIN) continue
    if (e.data) {
      if (data && e.data === data) return { dia: alvo[0], horario: e.horario }
      continue
    }
    const dia = diasDe(e.dias_semana).find((d) => alvo.includes(d))
    if (dia) return { dia, horario: e.horario }
  }
  return null
}

export function mensagemConflitoHorario(horario: string, c: { dia: number; horario: string }): string {
  return c.horario === horario
    ? `Já existe o horário ${horario} na ${NOMES[c.dia]}.`
    : `${horario} se sobrepõe ao horário ${c.horario} (${NOMES[c.dia]}): cada aula ocupa ${DURACAO_AULA_MIN} minutos. Escolha outro horário ou ajuste o existente.`
}

type Faixa = { ini: number; fim: number }
function faixaDoBloqueio(time_slot: string): Faixa | null {
  if (time_slot === 'TODOS' || time_slot === 'DIA_INTEIRO') return { ini: 0, fim: 24 * 60 }
  if (time_slot.startsWith('APOS_')) return HHMM_RE.test(time_slot.slice(5)) ? { ini: minutos(time_slot.slice(5)), fim: 24 * 60 } : null
  return HHMM_RE.test(time_slot) ? { ini: minutos(time_slot), fim: minutos(time_slot) + DURACAO_AULA_MIN } : null
}

/** Bloqueio semanal que já cobre (parcial ou totalmente) o mesmo instrutor/veículo/dia/horário do novo. */
export function conflitoEntreBloqueios(
  novo: { instructor: string | null; vehicle_type: string; time_slot: string; weekdays: number[] },
  existentes: Array<BloqueioSemanalLinha & { id?: string }>,
  ignorarId?: string
): { dia: number; bloqueio: BloqueioSemanalLinha } | null {
  const fn = faixaDoBloqueio(novo.time_slot)
  if (!fn) return null
  const nInstr = bloqueioAplicaAoInstrutor(novo.instructor, null) // vazio/"TODOS" = vale para todos
  for (const e of existentes) {
    if (e.id && e.id === ignorarId) continue
    const eTodos = bloqueioAplicaAoInstrutor(e.instructor, null)
    if (!nInstr && !eTodos && e.instructor !== novo.instructor) continue
    const vn = veiculo(novo.vehicle_type)
    const ve = veiculo(e.vehicle_type)
    if (vn !== 'TODOS' && ve !== 'TODOS' && vn !== ve) continue
    const fe = faixaDoBloqueio(e.time_slot)
    if (!fe || fn.ini >= fe.fim || fe.ini >= fn.fim) continue
    const dia = novo.weekdays.find((d) => e.weekdays.includes(d))
    if (dia) return { dia, bloqueio: e }
  }
  return null
}

export function mensagemConflitoBloqueio(c: { dia: number; bloqueio: BloqueioSemanalLinha }): string {
  const t = c.bloqueio.time_slot
  const quando = t === 'TODOS' || t === 'DIA_INTEIRO' ? 'o dia inteiro' : t.startsWith('APOS_') ? `a partir das ${t.slice(5)}` : `às ${t}`
  const quem = !c.bloqueio.instructor || c.bloqueio.instructor.trim().toUpperCase() === 'TODOS' ? 'todos os instrutores' : c.bloqueio.instructor.split(' - ')[0]
  return `Já existe um bloqueio na ${NOMES[c.dia]} ${quando} para ${quem}${c.bloqueio.reason ? ` (${c.bloqueio.reason})` : ''}. Edite ou exclua esse bloqueio em vez de criar outro por cima.`
}

/** Bloqueios que valem numa data: os semanais do dia da semana + os pontuais daquela data (como se fossem semanais de 1 dia). */
export function bloqueiosParaData<T extends BloqueioSemanalLinha & { date?: string | null }>(data: string, bloqueios: T[]): BloqueioSemanalLinha[] {
  const iso = isoWeekday(data)
  return bloqueios
    .filter((b) => (b.date ? b.date === data : b.weekdays.includes(iso)))
    .map((b) => ({ ...b, weekdays: [iso] }))
}
