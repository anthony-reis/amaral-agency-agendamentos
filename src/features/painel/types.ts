// ─── Instrutor ────────────────────────────────────────────────────────────────

export interface Instrutor {
  id: string
  name: string
  category: string // e.g. 'CARRO', 'MOTO', 'AMBOS'
  password: string | null
  autoescola_id: string
  created_at: string
}

export type NovoInstrutorInput = {
  name: string
  category: string
  autoescola_id: string
}

// ─── Horário ──────────────────────────────────────────────────────────────────

export interface HorarioDisponivel {
  id: string
  horario: string
  ordem: number
  ativo: boolean
  instrutor: string | null
  autoescola_id: string
  created_at: string
}

// ─── Agendamento ──────────────────────────────────────────────────────────────

export type AgendamentoStatus = 'scheduled' | 'confirmed' | 'completed' | 'absent' | 'cancelled'

export interface Agendamento {
  id: string
  date: string
  time_slot: string
  instructor_name: string | null
  instructorCategory: string | null
  student_name: string
  student_document: string | null
  cpf_cnh: string | null
  status: AgendamentoStatus
  notes: string | null
  created_at: string
  autoescola_id: string
}

export interface AgendamentoStats {
  total: number
  agendadas: number
  confirmadas: number
  concluidas: number
  desmarcadas: number
  faltas: number
}

export interface InstrutorDesempenho {
  instructor_name: string
  categoria: string
  concluidas: number
  agendadas: number
  canceladas: number
  taxa: number // 0–100
}

// ─── Bloqueio ─────────────────────────────────────────────────────────────────

export interface BloqueioTimeSlot {
  id: string
  date: string
  time_slot: string
  vehicle_type: string
  instructor: string | null
  reason: string | null
  weekdays: string[] | Record<string, boolean> | null
  status: string
  autoescola_id: string
  created_at: string
}

export type NovoBloqueioInput = {
  tipo: 'dia' | 'horario' | 'intervalo'
  date?: string
  date_start?: string
  date_end?: string
  time_slot?: string
  vehicle_type: string
  instructor: string | null
  reason: string
  autoescola_id: string
}

// ─── Conflito ─────────────────────────────────────────────────────────────────

export interface Conflito {
  type: 'instrutor' | 'aluno'
  instructor_name?: string
  student_name?: string
  date: string
  time_slot: string
  total: number
  ids: string[]
  alunos?: string[]
}

// ─── Auth Painel ──────────────────────────────────────────────────────────────

export interface PainelUser {
  id: string
  username: string
  full_name: string
  role: string
  is_active: boolean
  autoescola_id: string
}

export interface PainelSession {
  userId: string
  username: string
  full_name: string
  role: string
  autoescola_id: string
  autoescola_slug: string
}

// ─── Aluno ────────────────────────────────────────────────────────────────────

export interface Aluno {
  id: string
  name: string
  email: string | null
  phone: string | null
  document_id: string
  registration_number: string | null
  created_at: string
  autoescola_id: string
}

export interface AlunoCreditos {
  id: string
  student_id: string
  aulas_cat_a: number
  aulas_cat_b: number
  aulas_cat_c: number
  aulas_cat_d: number
  aulas_cat_e: number
  aulas_disponiveis: number
  autoescola_id: string
}

export interface AlunoComCreditos extends Aluno {
  creditos: AlunoCreditos | null
}

export type NovoAlunoInput = {
  name: string
  document_id: string
  phone?: string
  email?: string
  autoescola_id: string
}

// ─── Auditoria ────────────────────────────────────────────────────────────────

export interface LogAtividade {
  id: string
  user_id: string | null
  username: string
  action_type: string
  description: string
  metadata: Record<string, unknown> | null
  created_at: string
  autoescola_id: string
}

export interface LogStats {
  total: number
  logins: number
  usuarios: number
  agendamentos: number
  creditos: number
  alunos: number
  bloqueios: number
}

// ─── Instrutor Session ────────────────────────────────────────────────────────

export interface InstructorSession {
  instructorId: string
  name: string
  category: string
  autoescola_id: string
  autoescola_slug: string
}

// ─── Generic ──────────────────────────────────────────────────────────────────

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }
