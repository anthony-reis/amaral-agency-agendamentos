export interface DataExame {
  id: string
  autoescola_id: string
  categoria_codigo: string // 'A'..'E'
  date: string // YYYY-MM-DD
  created_at: string
}

export interface SolicitacaoPendenteExame {
  solicitacaoId: string
  studentId: string
  studentName: string
  studentDocument: string
  dataPreferida: string | null
  aulasConcluidasCategoria: number
  creditosCategoria: number
  observacaoAluno: string | null
}

export interface InstrutorDisponivelExame {
  nome: string
  aulasMinistradas: number
  horarios: string[]
}

export interface AtribuicaoExameMassa {
  solicitacaoId: string
  studentId: string
  studentName: string
  studentDocument: string
  instructorName: string
  timeSlot: string
}
