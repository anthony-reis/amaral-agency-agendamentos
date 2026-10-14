import { describe, it, expect } from 'vitest'
import { horariosDoInstrutorNoDia, isoWeekday, conflitoComBloqueio, bloqueioAplicaAoInstrutor, conflitoComHorario, conflitoEntreBloqueios } from '../horariosDia'

const linhas = [
  { horario: '08:00', instrutor: null },
  { horario: '07:00', instrutor: 'Michael' },
  { horario: '13:10', instrutor: 'Michael', dias_semana: [3] },
  { horario: '14:00', instrutor: 'Michael', dias_semana: [3] },
  { horario: '09:00', instrutor: 'Ana', dias_semana: [] },
  { horario: '10:00', instrutor: 'Solo', dias_semana: [3] },
]

describe('horariosDoInstrutorNoDia', () => {
  it('linha sem dias vale todos os dias', () => {
    expect(horariosDoInstrutorNoDia(linhas, 'Michael', 1)).toEqual(['07:00'])
    expect(horariosDoInstrutorNoDia(linhas, 'Ana', 6)).toEqual(['09:00'])
  })
  it('linha com dias vale só neles', () => {
    expect(horariosDoInstrutorNoDia(linhas, 'Michael', 3)).toEqual(['07:00', '13:10', '14:00'])
  })
  it('sem linhas próprias usa o global', () => {
    expect(horariosDoInstrutorNoDia(linhas, 'Outro', 5)).toEqual(['08:00'])
  })
  it('instrutor só com horário de quarta não herda o global nos outros dias', () => {
    expect(horariosDoInstrutorNoDia(linhas, 'Solo', 2)).toEqual([])
    expect(horariosDoInstrutorNoDia(linhas, 'Solo', 3)).toEqual(['10:00'])
  })
})

describe('isoWeekday', () => {
  it('domingo = 7, quarta = 3', () => {
    expect(isoWeekday('2026-10-18')).toBe(7)
    expect(isoWeekday('2026-10-14')).toBe(3)
  })
})

describe('conflitoComBloqueio', () => {
  const b = (o: object) => ({ instructor: null, vehicle_type: 'TODOS', time_slot: 'DIA_INTEIRO', weekdays: [7], ...o })
  it('dia inteiro bloqueado impede qualquer horário nesse dia', () => {
    expect(conflitoComBloqueio('08:00', [7], 'Ana', 'CARRO', [b({})])?.dia).toBe(7)
    expect(conflitoComBloqueio('08:00', [3], 'Ana', 'CARRO', [b({})])).toBeNull()
  })
  it('todos os dias considera todos os dias do bloqueio', () => {
    expect(conflitoComBloqueio('08:00', null, 'Ana', 'CARRO', [b({})])?.dia).toBe(7)
  })
  it('APOS_ bloqueia a partir do corte e horário exato só ele', () => {
    expect(conflitoComBloqueio('18:10', [5], 'Ana', 'CARRO', [b({ weekdays: [5], time_slot: 'APOS_18:00' })])).not.toBeNull()
    expect(conflitoComBloqueio('17:20', [5], 'Ana', 'CARRO', [b({ weekdays: [5], time_slot: 'APOS_18:00' })])).toBeNull()
    expect(conflitoComBloqueio('13:10', [1], 'Ana', 'CARRO', [b({ weekdays: [1], time_slot: '13:00' })])).not.toBeNull()
    expect(conflitoComBloqueio('12:00', [1], 'Ana', 'CARRO', [b({ weekdays: [1], time_slot: '12:00' })])).not.toBeNull()
  })
  it('instrutor "TODOS" (texto) vale para todos; bloqueio de outro instrutor não', () => {
    expect(bloqueioAplicaAoInstrutor('TODOS', 'Ana')).toBe(true)
    expect(conflitoComBloqueio('08:00', [7], 'Ana', 'CARRO', [b({ instructor: 'TODOS' })])).not.toBeNull()
    expect(conflitoComBloqueio('08:00', [7], 'Ana', 'CARRO', [b({ instructor: 'Bia' })])).toBeNull()
  })
  it('bloqueio só de moto não impede instrutor de carro, e AMBOS só conflita se bloquear as duas', () => {
    expect(conflitoComBloqueio('08:00', [7], 'Ana', 'CARRO', [b({ vehicle_type: 'MOTO' })])).toBeNull()
    expect(conflitoComBloqueio('08:00', [7], 'Ana', 'AMBOS', [b({ vehicle_type: 'MOTO' })])).toBeNull()
    expect(conflitoComBloqueio('08:00', [7], null, 'AMBOS', [b({ vehicle_type: 'MOTO' }), b({ vehicle_type: 'CARRO' })])).not.toBeNull()
  })
})

describe('conflitoComHorario', () => {
  const ex = [{ id: 'a', horario: '13:00', dias_semana: null as number[] | null }, { id: 'b', horario: '15:00', dias_semana: [3] }]
  it('mesmo horário e horários a menos de 50 min se sobrepõem', () => {
    expect(conflitoComHorario('13:00', [1], ex)).not.toBeNull()
    expect(conflitoComHorario('13:10', [1], ex)?.horario).toBe('13:00')
    expect(conflitoComHorario('12:20', [1], ex)).not.toBeNull()
  })
  it('50 min ou mais de distância não conflita', () => {
    expect(conflitoComHorario('13:50', [1], ex)).toBeNull()
    expect(conflitoComHorario('12:10', [1], ex)).toBeNull()
  })
  it('só conflita em dias em comum e ignora o próprio registro', () => {
    expect(conflitoComHorario('15:10', [1], ex)).toBeNull()
    expect(conflitoComHorario('15:10', [3], ex)?.dia).toBe(3)
    expect(conflitoComHorario('13:10', null, ex, 'a')).toBeNull()
  })
})

describe('conflitoEntreBloqueios', () => {
  const base = { instructor: null as string | null, vehicle_type: 'TODOS', time_slot: 'DIA_INTEIRO', weekdays: [7] }
  it('mesmo escopo/dia/horário repetido conflita', () => {
    expect(conflitoEntreBloqueios({ ...base, instructor: 'Ana' }, [{ ...base, instructor: 'Ana' }])?.dia).toBe(7)
  })
  it('bloqueio para todos cobre o de um instrutor (e vice-versa)', () => {
    expect(conflitoEntreBloqueios({ ...base, instructor: 'Ana', time_slot: '10:00' }, [base])).not.toBeNull()
    expect(conflitoEntreBloqueios(base, [{ ...base, instructor: 'Ana', time_slot: '10:00' }])).not.toBeNull()
  })
  it('instrutores, dias ou veículos diferentes não conflitam', () => {
    expect(conflitoEntreBloqueios({ ...base, instructor: 'Ana' }, [{ ...base, instructor: 'Bia' }])).toBeNull()
    expect(conflitoEntreBloqueios({ ...base, weekdays: [1] }, [base])).toBeNull()
    expect(conflitoEntreBloqueios({ ...base, vehicle_type: 'MOTO' }, [{ ...base, vehicle_type: 'CARRO' }])).toBeNull()
  })
  it('a partir de X e horário exato dentro do trecho conflitam; antes não', () => {
    const apos = { ...base, weekdays: [5], time_slot: 'APOS_18:00' }
    expect(conflitoEntreBloqueios({ ...base, weekdays: [5], time_slot: '18:10' }, [apos])).not.toBeNull()
    expect(conflitoEntreBloqueios({ ...base, weekdays: [5], time_slot: '12:00' }, [apos])).toBeNull()
    expect(conflitoEntreBloqueios({ ...base, weekdays: [5], time_slot: 'APOS_19:00' }, [apos])).not.toBeNull()
  })
  it('horário exato bloqueado: 13:00 e 13:10 se sobrepõem, 13:50 não', () => {
    const ex = { ...base, weekdays: [1], time_slot: '13:00' }
    expect(conflitoEntreBloqueios({ ...ex, time_slot: '13:10' }, [ex])).not.toBeNull()
    expect(conflitoEntreBloqueios({ ...ex, time_slot: '13:50' }, [ex])).toBeNull()
  })
})

describe('mover só a ocorrência (arrastar)', () => {
  // horário "todos os dias" + fim de semana bloqueado: mover a segunda não pode ser barrado pelo sábado/domingo
  const fds = [
    { instructor: null, vehicle_type: 'TODOS', time_slot: 'DIA_INTEIRO', weekdays: [6, 7] },
  ]
  it('validar só o dia de destino libera segunda mesmo com o fim de semana bloqueado', () => {
    expect(conflitoComBloqueio('14:00', [1], 'Ana', 'CARRO', fds)).toBeNull()
    expect(conflitoComBloqueio('14:00', null, 'Ana', 'CARRO', fds)?.dia).toBe(6) // validar a semana toda barraria
  })
  it('destino num dia bloqueado continua barrado', () => {
    expect(conflitoComBloqueio('14:00', [6], 'Ana', 'CARRO', fds)).not.toBeNull()
  })
})

describe('ir e voltar com o mesmo horário (10:20 → 12:00 → 10:20 na segunda)', () => {
  // depois de mover a segunda: o original perde a segunda e nasce um horário só da segunda às 12:00
  const base = ['07:00', '07:50', '08:40', '09:30', '10:20'].map((h, i) => ({ id: `o${i}`, horario: h, dias_semana: null as number[] | null }))
  const original = { id: 'o4', horario: '10:20', dias_semana: [2, 3, 4, 5, 6, 7] as number[] | null }
  const rows = [...base.slice(0, 4), original, { id: 'novo', horario: '12:00', dias_semana: [1] as number[] | null }]
  it('voltar a ocorrência da segunda para 10:20 não conflita com ninguém', () => {
    expect(conflitoComHorario('10:20', [1], rows, 'novo')).toBeNull()
  })
  it('sem ignorar o próprio card ainda não conflita (ele está às 12:00)', () => {
    expect(conflitoComHorario('10:20', [1], rows)).toBeNull()
  })
})

describe('horários pontuais (data específica)', () => {
  const linhas = [
    { horario: '07:00', instrutor: 'Ana' },
    { horario: '13:10', instrutor: 'Ana', data: '2026-10-21' }, // quarta
    { horario: '09:00', instrutor: null },
    { horario: '16:00', instrutor: null, data: '2026-10-21' },
    { horario: '10:00', instrutor: 'Bia', data: '2026-10-21' },
  ]
  it('pontual soma só na data e some nas outras semanas', () => {
    expect(horariosDoInstrutorNoDia(linhas, 'Ana', 3, '2026-10-21')).toEqual(['07:00', '13:10'])
    expect(horariosDoInstrutorNoDia(linhas, 'Ana', 3, '2026-10-28')).toEqual(['07:00'])
    expect(horariosDoInstrutorNoDia(linhas, 'Ana', 3)).toEqual(['07:00'])
  })
  it('instrutor só com pontual usa o global recorrente + o pontual da data', () => {
    expect(horariosDoInstrutorNoDia(linhas, 'Bia', 3, '2026-10-21')).toEqual(['09:00', '16:00', '10:00'])
    expect(horariosDoInstrutorNoDia(linhas, 'Bia', 3, '2026-10-28')).toEqual(['09:00'])
  })
  it('conflito de pontual: recorrente do dia da semana e pontual da mesma data', () => {
    expect(conflitoComHorario('07:10', null, linhas.map((l, i) => ({ id: String(i), dias_semana: null, ...l })).filter((l) => l.instrutor === 'Ana'), undefined, '2026-10-21')).not.toBeNull()
    expect(conflitoComHorario('13:20', null, linhas.filter((l) => l.instrutor === 'Ana').map((l) => ({ dias_semana: null, ...l })), undefined, '2026-10-21')).not.toBeNull()
    expect(conflitoComHorario('13:20', null, linhas.filter((l) => l.instrutor === 'Ana').map((l) => ({ dias_semana: null, ...l })), undefined, '2026-10-28')).toBeNull()
  })
  it('recorrente ignora os pontuais na validação', () => {
    expect(conflitoComHorario('13:10', [3], linhas.filter((l) => l.instrutor === 'Ana').map((l) => ({ dias_semana: null, ...l })))).toBeNull()
  })
})
