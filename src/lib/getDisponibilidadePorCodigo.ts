import { createServiceClient } from './supabase/server'
import { getDisponibilidade, type InstructorDisponivel } from './getDisponibilidade'
import type { CodigoCNH } from '@/features/admin/categorias-config'

/**
 * Ponte entre o vocabulário de categoria por código (A-E, usado por
 * autoescola_categorias/student_credits) e o vocabulário legado por palavra
 * (CARRO/MOTO/AMBOS, usado por instructors.category e blockedTimeSlots.vehicle_type).
 * A=Moto e B=Carro têm equivalente legado; C/D/E não têm — autoescolas que
 * usarem essas categorias precisam cadastrar instructors.category = 'C'|'D'|'E'
 * diretamente.
 */
export function palavrasLegadoPara(codigo: CodigoCNH): string[] {
  if (codigo === 'A') return ['A', 'MOTO']
  if (codigo === 'B') return ['B', 'CARRO']
  return [codigo]
}

export function campoCreditoPorCodigo(codigo: CodigoCNH): string {
  return `aulas_cat_${codigo.toLowerCase()}`
}

/**
 * Busca disponibilidade por código de categoria, sem modificar getDisponibilidade
 * (usado pelo self-booking do aluno — mudar seu comportamento de match é arriscado
 * demais). Chama getDisponibilidade uma vez por palavra equivalente e funde os
 * resultados por nome de instrutor (união dos horários), já que blockedTimeSlots
 * só reconhece vehicle_type como CARRO/MOTO/TODOS — chamar só com o código cru
 * faria bloqueios específicos de CARRO/MOTO serem ignorados.
 */
export async function getDisponibilidadePorCodigo(
  autoescolaId: string,
  date: string,
  codigo: CodigoCNH
): Promise<InstructorDisponivel[]> {
  const palavras = palavrasLegadoPara(codigo)
  const resultados = await Promise.all(
    palavras.map((p) => getDisponibilidade(autoescolaId, date, p))
  )

  const merged = new Map<string, InstructorDisponivel>()
  for (const lista of resultados) {
    for (const inst of lista) {
      const existente = merged.get(inst.nome)
      if (!existente) {
        merged.set(inst.nome, inst)
        continue
      }
      const horarios = Array.from(new Set([...existente.horarios, ...inst.horarios])).sort()
      merged.set(inst.nome, { ...existente, horarios })
    }
  }

  // Várias bancas podem compartilhar o mesmo instrutor+horário no mesmo dia
  // (turma indo junto pro exame) — diferente de aula normal, onde 1 instrutor
  // só atende 1 aluno por horário. getDisponibilidade() não distingue tipo e
  // já subtraiu qualquer horário ocupado por qualquer agendamento existente;
  // aqui devolvemos os horários que só estavam "ocupados" por OUTRA banca
  // (nunca por uma aula normal real, que continua bloqueando de verdade).
  const supabase = createServiceClient()
  const { data: bancasDoDia } = await supabase
    .from('agendamentos')
    .select('instructor_name, time_slot')
    .eq('autoescola_id', autoescolaId)
    .eq('date', date)
    .eq('tipo', 'banca')
    .neq('status', 'cancelled')

  for (const b of bancasDoDia ?? []) {
    const existente = merged.get(b.instructor_name)
    if (existente && !existente.horarios.includes(b.time_slot)) {
      existente.horarios = [...existente.horarios, b.time_slot].sort()
    }
  }

  return Array.from(merged.values())
}
