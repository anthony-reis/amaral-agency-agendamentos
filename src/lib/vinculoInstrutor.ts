// Vínculo aluno ↔ instrutor por modalidade (Carro / Moto). Client-safe.

export type Modalidade = 'CARRO' | 'MOTO'

export const MODALIDADES: { id: Modalidade; label: string }[] = [
  { id: 'CARRO', label: 'Carro' },
  { id: 'MOTO', label: 'Moto' },
]

export const rotuloModalidade = (m: Modalidade) => (m === 'CARRO' ? 'Carro' : 'Moto')

/** 'carro'/'CARRO'/'Moto'… → modalidade; qualquer outra coisa (ex.: AMBOS) → null. */
export function normalizarModalidade(cat: string | null | undefined): Modalidade | null {
  const c = (cat ?? '').trim().toUpperCase()
  return c === 'CARRO' || c === 'MOTO' ? c : null
}

/** Instrutor de uma categoria atende a modalidade? AMBOS atende as duas. */
export function instrutorServe(categoriaInstrutor: string | null | undefined, m: Modalidade): boolean {
  const c = (categoriaInstrutor ?? '').trim().toUpperCase()
  return c === 'AMBOS' || c === m
}

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

export const aulasDaModalidade = (aulas: AulaFutura[], m: Modalidade) =>
  aulas.filter((a) => normalizarModalidade(a.instructorCategory) === m)

/** Aulas agrupadas por instrutor, do que tem mais aulas para o que tem menos. */
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

/** Dentro de uma modalidade, aulas agendadas com mais de um instrutor impedem o vínculo. */
export function vinculoImpossivel(grupos: GrupoInstrutor[]): boolean {
  return grupos.length > 1
}

export function mensagemVinculoImpossivel(grupos: GrupoInstrutor[], modalidade?: Modalidade): string {
  const resumo = grupos.map((g) => `${g.instrutor}: ${g.aulas.length} ${g.aulas.length === 1 ? 'aula' : 'aulas'}`).join(' · ')
  const alvo = modalidade ? `o instrutor de ${rotuloModalidade(modalidade)}` : 'um instrutor'
  const aulas = modalidade ? `aulas de ${rotuloModalidade(modalidade)} agendadas` : 'aulas agendadas'
  return `Não é possível vincular ${alvo}: o aluno tem ${aulas} com ${grupos.length} instrutores diferentes (${resumo}). Remarque ou cancele as aulas até restar um só instrutor.`
}

export const rotuloAulas = (n: number) => `${n} ${n === 1 ? 'aula' : 'aulas'}`

// ─── Sugestão: com quem o aluno mais tem aulas ───────────────────────────────

export interface TotalInstrutor {
  categoria: Modalidade
  instrutor: string
  /** Concluídas + agendadas/confirmadas (não conta canceladas). */
  qtd: number
  concluidas: number
  futuras: number
  /** Data da próxima aula agendada (desempate). */
  proxima: string | null
}

export interface Sugestao {
  instrutor: string
  qtd: number
  /** Empatou em quantidade de aulas com outro instrutor (desempate: aula mais próxima). */
  empate: boolean
}

/** Instrutor da modalidade com quem o aluno mais tem aulas (histórico + agendadas). */
export function sugerirInstrutor(totais: TotalInstrutor[], m: Modalidade): Sugestao | null {
  const lista = totais
    .filter((t) => t.categoria === m)
    .sort((a, b) => b.qtd - a.qtd || (a.proxima ?? '9999').localeCompare(b.proxima ?? '9999') || a.instrutor.localeCompare(b.instrutor, 'pt-BR'))
  if (lista.length === 0) return null
  return { instrutor: lista[0].instrutor, qtd: lista[0].qtd, empate: lista.length > 1 && lista[1].qtd === lista[0].qtd }
}
