'use client'

// Campos compartilhados do bloqueio semanal (agenda de Horários e tela de Bloqueios).

export const DIAS_SEMANA_ISO = [
  { n: 1, curto: 'Seg', longo: 'Segunda' },
  { n: 2, curto: 'Ter', longo: 'Terça' },
  { n: 3, curto: 'Qua', longo: 'Quarta' },
  { n: 4, curto: 'Qui', longo: 'Quinta' },
  { n: 5, curto: 'Sex', longo: 'Sexta' },
  { n: 6, curto: 'Sáb', longo: 'Sábado' },
  { n: 7, curto: 'Dom', longo: 'Domingo' },
]
const TODOS = [1, 2, 3, 4, 5, 6, 7]

export type TipoBloqueioSemanal = 'dia_inteiro' | 'apos' | 'horario'
export interface CamposBloqueioSemanal {
  tipo: TipoBloqueioSemanal
  horario: string
  dias: number[]
  reason: string
}

export function tipoDoTimeSlot(t: string): { tipo: TipoBloqueioSemanal; horario: string } {
  if (t === 'DIA_INTEIRO' || t === 'TODOS') return { tipo: 'dia_inteiro', horario: '' }
  if (t.startsWith('APOS_')) return { tipo: 'apos', horario: t.slice(5) }
  return { tipo: 'horario', horario: t }
}

export function DiasChips({ dias, onChange, tom }: { dias: number[]; onChange: (d: number[]) => void; tom: 'sky' | 'rose' }) {
  const on = tom === 'sky' ? 'bg-[#0ea5e9] border-[#0ea5e9] text-white' : 'bg-rose-500 border-rose-500 text-white'
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-[--p-text-2]">Dias da semana</span>
        <div className="flex gap-3 text-xs">
          <button type="button" className="text-[--p-accent] hover:underline" onClick={() => onChange([1, 2, 3, 4, 5])}>Seg–Sex</button>
          <button type="button" className="text-[--p-accent] hover:underline" onClick={() => onChange(TODOS)}>Todos</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {DIAS_SEMANA_ISO.map((d) => {
          const ativo = dias.includes(d.n)
          return (
            <button
              key={d.n}
              type="button"
              title={d.longo}
              aria-pressed={ativo}
              onClick={() => onChange(ativo ? dias.filter((x) => x !== d.n) : [...dias, d.n].sort())}
              className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${
                ativo ? on : 'bg-[--p-bg-input] border-[--p-border] text-[--p-text-2] hover:bg-[--p-hover]'
              }`}
            >
              {d.curto}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function BloqueioSemanalCampos({ value, onChange, idPrefix = 'bs', mostrarDias = true }: {
  value: CamposBloqueioSemanal
  onChange: (v: CamposBloqueioSemanal) => void
  idPrefix?: string
  mostrarDias?: boolean
}) {
  return (
    <div className="space-y-4">
      <div>
        <span className="block text-xs font-medium text-[--p-text-2] mb-1.5">O que bloquear</span>
        <div className="grid grid-cols-3 gap-1.5">
          {([['dia_inteiro', 'Dia inteiro'], ['apos', 'A partir de'], ['horario', 'Um horário']] as const).map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={value.tipo === k}
              onClick={() => onChange({ ...value, tipo: k })}
              className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${
                value.tipo === k ? 'bg-rose-500/12 border-rose-500 text-rose-500' : 'bg-[--p-bg-input] border-[--p-border] text-[--p-text-2] hover:bg-[--p-hover]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {value.tipo !== 'dia_inteiro' && (
        <div>
          <label htmlFor={`${idPrefix}-hora`} className="block text-xs font-medium text-[--p-text-2] mb-1.5">
            {value.tipo === 'apos' ? 'Bloquear a partir das' : 'Horário bloqueado'}
          </label>
          <input
            id={`${idPrefix}-hora`}
            required
            type="time"
            value={value.horario}
            onChange={(e) => onChange({ ...value, horario: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-lg font-semibold tabular-nums text-[--p-text-1] focus:outline-none focus:ring-2 focus:ring-rose-500/40"
          />
        </div>
      )}
      {mostrarDias && <DiasChips dias={value.dias} onChange={(dias) => onChange({ ...value, dias })} tom="rose" />}
      <div>
        <label htmlFor={`${idPrefix}-motivo`} className="block text-xs font-medium text-[--p-text-2] mb-1.5">
          Motivo <span className="text-[--p-text-3] font-normal">(opcional)</span>
        </label>
        <input
          id={`${idPrefix}-motivo`}
          type="text"
          placeholder="Ex: almoço, fim de expediente"
          value={value.reason}
          onChange={(e) => onChange({ ...value, reason: e.target.value })}
          className="w-full px-3 py-2.5 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] placeholder:text-[--p-text-3] focus:outline-none focus:ring-2 focus:ring-rose-500/40"
        />
      </div>
    </div>
  )
}
