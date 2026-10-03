export interface ExameBancaAgendado {
  date: string // YYYY-MM-DD
  time_slot: string
  instructor_name: string | null
}

export function formatarExameBanca(exame: ExameBancaAgendado): string {
  return `${exame.date.split('-').reverse().slice(0, 2).join('/')} às ${exame.time_slot}`
}
