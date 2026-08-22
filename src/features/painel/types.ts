// ─── Instrutor ────────────────────────────────────────────────────────────────

export interface Instrutor {
  id: string
  name: string
  category: string // e.g. 'CARRO', 'MOTO', 'AMBOS'
  password: string | null
  autoescola_id: string
  created_at: string
  valor_hora_aula: number | null
  valor_banca: number | null
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

export type AgendamentoStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'absent' | 'cancelled'
export type AgendamentoTipo = 'aula' | 'banca'

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
  tipo: AgendamentoTipo
  notes: string | null
  cancel_reason: string | null
  is_blocked_on_cancel: boolean | null
  created_at: string
  autoescola_id: string
  photo_url: string | null
  signature_url: string | null
  km_inicial: number | null
  km_final: number | null
  km_rodado: number | null
  iniciado_at: string | null
}

export interface InstrutorKmStats {
  instructor_name: string
  categoria: string | null
  km_total: number
  km_medio: number
  total_aulas: number
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

export type GrupoBloqueioSemanal = {
  instrutores: string[]  // vazio = todos
  tipo: 'dia_inteiro' | 'apos_horario'
  horario_corte?: string
}

export type NovoBloqueioSemanalInput = {
  dia_semana: number  // 0=Dom … 6=Sáb (JS getDay())
  grupos: GrupoBloqueioSemanal[]
  vehicle_type: string
  reason: string
  autoescola_id: string
}

// ─── Conflito ─────────────────────────────────────────────────────────────────

export interface Conflito {
  type: 'instrutor' | 'aluno' | 'aluno_dia'
  instructor_name?: string
  student_name?: string
  date: string
  time_slot: string
  total: number
  ids: string[]
  alunos?: string[]           // student names (for instrutor conflicts)
  studentDocs?: string[]      // student documents (for credit refund)
  categories?: string[]       // instructorCategory per agendamento
  instructorNames?: string[]  // instructor names (for aluno conflicts)
  timeSlots?: string[]        // individual time slots per agendamento (for aluno_dia)
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
  cancelamentos: number
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

// ─── Comunicado ───────────────────────────────────────────────────────────────

export interface Comunicado {
  id: string
  autoescola_id: string
  titulo: string
  descricao: string
  created_by: string
  created_at: string
}

export interface ComunicadoComLidos extends Comunicado {
  total_lidos: number
}

// ─── Solicitações ─────────────────────────────────────────────────────────────

export type SolicitacaoTipo = 'exame' | 'legislacao'

export type SolicitacaoStatus = 'pendente' | 'em_analise' | 'agendado' | 'recusado' | 'cancelado'

export interface DadosAtendimento {
  data: string // YYYY-MM-DD
  horario: string
  local: string | null
  observacoes: string | null
}

export interface Solicitacao {
  id: string
  autoescola_id: string
  student_id: string
  tipo: SolicitacaoTipo
  categoria: string | null
  status: SolicitacaoStatus
  observacao_aluno: string | null
  mensagem_admin: string | null
  motivo_recusa: string | null
  dados_atendimento: DadosAtendimento | null
  admin_responsavel_id: string | null
  visualizado_em: string | null
  finalizado_em: string | null
  created_at: string
  updated_at: string
  data_preferida: string | null
  agendamento_id: string | null
}

export interface SolicitacaoComAluno extends Solicitacao {
  student_name: string
  student_document: string
  student_phone: string | null
}

export type SolicitacaoEventoTipo =
  | 'criada' | 'visualizada' | 'em_analise' | 'agendada' | 'recusada' | 'cancelada' | 'mensagem'

export interface SolicitacaoEvento {
  id: string
  solicitacao_id: string
  tipo_evento: SolicitacaoEventoTipo
  autor_tipo: 'aluno' | 'painel'
  autor_nome: string
  dados: Record<string, unknown> | null
  created_at: string
}

export type SituacaoCreditos = 'com_creditos' | 'sem_creditos' | 'indisponivel'

export interface SolicitacaoDetalhe extends SolicitacaoComAluno {
  eventos: SolicitacaoEvento[]
  aulasConcluidas: number
  aulasConcluidasCategoria: number | null
  situacaoCreditos: SituacaoCreditos
  totalCreditos: number | null
}

export type NovaSolicitacaoInput = {
  autoescola_id: string
  student_id: string
  student_name: string
  tipo: SolicitacaoTipo
  categoria?: string | null
  data_preferida?: string | null
  observacao_aluno?: string | null
}

export interface SolicitacoesFiltro {
  tipo?: SolicitacaoTipo | 'TODOS'
  status?: SolicitacaoStatus | 'TODOS'
  dateStart?: string
  dateEnd?: string
  aluno?: string
  naoVisualizadas?: boolean
}
