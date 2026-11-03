// Vínculo aluno ↔ instrutor: leitura das aulas futuras do aluno. Client-safe.

export interface AulaFutura {
  id: string
  date: string // YYYY-MM-DD
  time_slot: string
  instructor_name: string
  instructorCategory: string | null
  status: string
}

export interface GrupoInstrutor {
  instrutor: string
  aulas: AulaFutura[]
}

/** Aulas futuras agrupadas por instrutor, do que tem mais aulas para o que tem menos. */
export function agruparPorInstrutor(aulas: AulaFutura[]): GrupoInstrutor[] {
  const mapa = new Map<string, AulaFutura[]>()
  for (const a of aulas) {
    const nome = a.instructor_name?.trim() || '—'
    mapa.set(nome, [...(mapa.get(nome) ?? []), a])
  }
  return [...mapa.entries()]
    .map(([instrutor, lista]) => ({
      instrutor,
      aulas: [...lista].sort((x, y) => `${x.date} ${x.time_slot}`.localeCompare(`${y.date} ${y.time_slot}`)),
    }))
    .sort((a, b) => b.aulas.length - a.aulas.length || a.instrutor.localeCompare(b.instrutor, 'pt-BR'))
}

/** Aluno com aulas agendadas com mais de um instrutor não pode ser vinculado. */
export function vinculoImpossivel(grupos: GrupoInstrutor[]): boolean {
  return grupos.length > 1
}

export function mensagemVinculoImpossivel(grupos: GrupoInstrutor[]): string {
  const resumo = grupos.map((g) => `${g.instrutor}: ${g.aulas.length} ${g.aulas.length === 1 ? 'aula' : 'aulas'}`).join(' · ')
  return `Não é possível vincular este aluno a um instrutor: ele tem aulas agendadas com ${grupos.length} instrutores diferentes (${resumo}). Remarque ou cancele as aulas até restar um só instrutor.`
}

export const rotuloAulas = (n: number) => `${n} ${n === 1 ? 'aula' : 'aulas'}`
