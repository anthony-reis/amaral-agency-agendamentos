'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Plus, Trash2, Pencil, X, Power, Ban, Car, Bike, Layers, CalendarClock, Copy, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { criarHorario, atualizarHorario, moverOcorrenciaHorario, toggleHorario, excluirHorario, copiarGlobalParaInstrutor } from '../actions/horarios'
import { criarBloqueioSemanalLivre, criarBloqueioPontual, atualizarBloqueioSemanal, excluirBloqueio } from '../actions/bloqueios'
import { DiasChips, BloqueioSemanalCampos, tipoDoTimeSlot } from './BloqueioSemanalCampos'
import { canEditPainel, type HorarioDisponivel } from '../types'
import {
  conflitoComBloqueio, mensagemConflito, conflitoComHorario, mensagemConflitoHorario, conflitoEntreBloqueios,
  mensagemConflitoBloqueio, horariosDoInstrutorNoDia, bloqueiosParaData, isoWeekday,
} from '@/lib/horariosDia'

/** Bloqueio na agenda: `date` null = semanal (weekdays); com `date` = só nesse dia. */
export interface BloqueioSemanal {
  id: string
  instructor: string | null
  vehicle_type: string
  time_slot: string
  weekdays: number[]
  reason: string | null
  date: string | null
}

interface InstrutorOpt { name: string; category: string }

interface Props {
  horarios: HorarioDisponivel[]
  instrutores: InstrutorOpt[]
  bloqueiosSemanais: BloqueioSemanal[]
  hoje: string
  autoescola_id: string
  userRole: string
}

const GLOBAL = '__global__'
const DIAS = [
  { n: 1, curto: 'Seg', longo: 'Segunda' },
  { n: 2, curto: 'Ter', longo: 'Terça' },
  { n: 3, curto: 'Qua', longo: 'Quarta' },
  { n: 4, curto: 'Qui', longo: 'Quinta' },
  { n: 5, curto: 'Sex', longo: 'Sexta' },
  { n: 6, curto: 'Sáb', longo: 'Sábado' },
  { n: 7, curto: 'Dom', longo: 'Domingo' },
]
const TODOS = [1, 2, 3, 4, 5, 6, 7]
const DIAS_UTEIS = [1, 2, 3, 4, 5]
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const DURACAO = 50 // minutos — tamanho visual de cada aula
const PX_MIN = 1.15
const RAIL = 18 // largura da faixa de bloqueio na coluna
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

const toMin = (h: string) => (HHMM.test(h) ? Number(h.slice(0, 2)) * 60 + Number(h.slice(3)) : NaN)
const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const valeNoDia = (h: HorarioDisponivel, d: number) => !h.dias_semana || h.dias_semana.length === 0 || h.dias_semana.includes(d)
const primeiroNome = (n: string) => n.split(' - ')[0].trim()

// Datas (YYYY-MM-DD) sem depender de fuso: tudo ao meio-dia UTC
const paraDate = (s: string) => new Date(s + 'T12:00:00Z')
const deDate = (d: Date) => d.toISOString().slice(0, 10)
const somarDias = (s: string, n: number) => deDate(new Date(paraDate(s).getTime() + n * 86400000))
const segundaDe = (s: string) => somarDias(s, -(isoWeekday(s) - 1))
const curta = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`
const longa = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`

function tituloSemana(segunda: string): string {
  const fim = somarDias(segunda, 6)
  const m1 = Number(segunda.slice(5, 7)) - 1
  const m2 = Number(fim.slice(5, 7)) - 1
  const d1 = Number(segunda.slice(8, 10))
  const d2 = Number(fim.slice(8, 10))
  const ano = fim.slice(0, 4)
  return m1 === m2 ? `${d1} – ${d2} de ${MESES[m1]} de ${ano}` : `${d1} de ${MESES[m1].slice(0, 3)} – ${d2} de ${MESES[m2].slice(0, 3)} de ${ano}`
}

function resumoDias(d: number[] | null): string {
  if (!d || d.length === 0 || d.length === 7) return 'Seg–Dom'
  if (d.join() === '1,2,3,4,5') return 'Seg–Sex'
  if (d.join() === '6,7') return 'Fim de semana'
  return d.map((x) => DIAS[x - 1].curto).join(', ')
}

function descreverBloqueio(b: BloqueioSemanal): string {
  if (b.time_slot === 'TODOS' || b.time_slot === 'DIA_INTEIRO') return 'Dia inteiro'
  if (b.time_slot.startsWith('APOS_')) return `A partir das ${b.time_slot.slice(5)}`
  return b.time_slot
}

type TipoBloqueio = 'dia_inteiro' | 'apos' | 'horario'
type Repete = 'semanal' | 'data'
type Modal =
  | { modo: 'horario'; id: string | null; horario: string; repete: Repete; dias: number[]; data: string }
  | { modo: 'bloqueio'; editId?: string; repete: Repete; tipo: TipoBloqueio; horario: string; dias: number[]; data: string; reason: string }
  | { modo: 'ver-bloqueio'; id: string }
  | null

function CategoriaIcon({ cat, className }: { cat: string; className?: string }) {
  if (cat === 'MOTO') return <Bike className={className} />
  if (cat === 'CARRO') return <Car className={className} />
  return <Layers className={className} />
}

/** Frase que descreve a repetição escolhida. */
function descreverRepeticao(repete: Repete, dias: number[], data: string): string {
  if (repete === 'data') return data ? `Vale só em ${longa(data)}. Nas outras semanas não existe.` : 'Escolha a data.'
  if (dias.length === 0) return 'Selecione ao menos um dia.'
  if (dias.join() === '1,2,3,4,5') return 'Repete de segunda a sexta, toda semana, sem data para acabar.'
  if (dias.length === 7) return 'Repete todos os dias da semana, inclusive sábado e domingo, sem data para acabar.'
  if (dias.length === 1) return `Repete toda ${DIAS[dias[0] - 1].longo.toLowerCase()}${dias[0] <= 5 ? '-feira' : ''}, sem data para acabar.`
  return `Repete toda semana (${resumoDias(dias)}), sem data para acabar.`
}

/** Escolha: só numa data / toda semana (dias marcados) / todos os dias (segunda a sexta). */
function Repeticao({ repete, dias, data, onChange, hoje, tom }: {
  repete: Repete
  dias: number[]
  data: string
  onChange: (patch: { repete?: Repete; dias?: number[]; data?: string }) => void
  hoje: string
  tom: 'sky' | 'rose'
}) {
  const on = tom === 'sky' ? 'bg-[#0ea5e9] text-white shadow-sm' : 'bg-rose-500 text-white shadow-sm'
  const foco = tom === 'sky' ? 'focus:ring-[#0ea5e9]/40' : 'focus:ring-rose-500/40'
  const modo: 'data' | 'semana' | 'todos' = repete === 'data' ? 'data' : dias.join() === '1,2,3,4,5' ? 'todos' : 'semana'
  const diaDaData = data ? isoWeekday(data) : 1
  return (
    <div className="space-y-2">
      <span className="block text-xs font-medium text-[--p-text-2]">Repetição</span>
      <div className="grid grid-cols-3 p-1 rounded-xl bg-[--p-bg-input] border border-[--p-border]">
        {([['data', 'Só numa data'], ['semana', 'Toda semana'], ['todos', 'Todos os dias']] as const).map(([k, label]) => (
          <button
            key={k}
            type="button"
            aria-pressed={modo === k}
            title={k === 'todos' ? 'Segunda a sexta' : k === 'semana' ? 'Escolha os dias da semana' : 'Vale em uma única data'}
            onClick={() => {
              if (k === 'data') onChange({ repete: 'data' })
              else if (k === 'todos') onChange({ repete: 'semanal', dias: DIAS_UTEIS })
              else onChange({ repete: 'semanal', dias: modo === 'semana' && dias.length > 0 ? dias : [diaDaData] })
            }}
            className={`py-1.5 px-1 rounded-lg text-xs sm:text-[13px] font-semibold transition-colors ${modo === k ? on : 'text-[--p-text-2] hover:text-[--p-text-1]'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {modo === 'data' && (
        <input
          type="date"
          required
          min={hoje}
          value={data}
          onChange={(e) => onChange({ data: e.target.value })}
          aria-label="Data"
          className={`w-full px-3 py-2.5 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm font-semibold text-[--p-text-1] focus:outline-none focus:ring-2 ${foco}`}
        />
      )}
      {modo === 'semana' && <DiasChips dias={dias} onChange={(d) => onChange({ dias: d })} tom={tom} />}
      <p className="text-[11px] text-[--p-text-3]">{descreverRepeticao(repete, dias, data)}</p>
    </div>
  )
}

export function HorariosGrid({ horarios: initial, instrutores, bloqueiosSemanais: bloqueiosIniciais, hoje, autoescola_id, userRole }: Props) {
  const canEdit = canEditPainel(userRole)
  const { escola } = useParams<{ escola: string }>()
  const [horarios, setHorarios] = useState<HorarioDisponivel[]>(initial)
  const [todosBloqueios, setTodosBloqueios] = useState<BloqueioSemanal[]>(bloqueiosIniciais)
  const [selecionado, setSelecionado] = useState<string>(instrutores[0]?.name ?? GLOBAL)
  const [segunda, setSegunda] = useState(() => segundaDe(hoje))
  const [modal, setModal] = useState<Modal>(null)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [dica, setDica] = useState<{ x: number; y: number; texto: string } | null>(null)
  const dicaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isPending, startTransition] = useTransition()
  const [drag, setDrag] = useState<{ id: string; dia: number; minuto: number; erro?: boolean } | null>(null)
  const [hover, setHover] = useState<{ dia: number; minuto: number } | null>(null)
  const [agoraMin, setAgoraMin] = useState<number | null>(null)
  const colRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const arrastou = useRef(false)
  const fila = useRef<Promise<unknown>>(Promise.resolve()) // grava um movimento por vez, na ordem

  // Data de cada coluna da semana mostrada
  const datas = useMemo(() => Object.fromEntries(DIAS.map((d) => [d.n, somarDias(segunda, d.n - 1)])) as Record<number, string>, [segunda])

  // Hora atual só no cliente (evita divergência de hidratação)
  useEffect(() => {
    const tick = () => { const d = new Date(); setAgoraMin(d.getHours() * 60 + d.getMinutes()) }
    tick()
    const t = setInterval(tick, 60_000)
    return () => clearInterval(t)
  }, [])

  const instrutorAtual = selecionado === GLOBAL ? null : selecionado
  const categoria = instrutores.find((i) => i.name === selecionado)?.category ?? 'AMBOS'
  const nomeAtual = instrutorAtual ? primeiroNome(instrutorAtual) : 'Global'

  const proprios = useMemo(() => horarios.filter((h) => (h.instrutor ?? null) === instrutorAtual), [horarios, instrutorAtual])
  const globais = useMemo(() => horarios.filter((h) => !h.instrutor), [horarios])
  const usandoGlobais = instrutorAtual !== null && proprios.length === 0
  const exibidos = usandoGlobais ? globais : proprios
  const validos = exibidos.filter((h) => !isNaN(toMin(h.horario)))
  const invalidos = exibidos.filter((h) => isNaN(toMin(h.horario)))
  const podeCriar = canEdit && !usandoGlobais

  // Bloqueios do instrutor mostrado (semanais + pontuais)
  const bloqueios = useMemo(
    () =>
      todosBloqueios.filter((b) => {
        if (b.instructor && b.instructor !== instrutorAtual) return false
        const vt = b.vehicle_type.toUpperCase()
        const ehCarro = vt === 'CAR' || vt === 'CARRO'
        const ehMoto = vt === 'MOTO' || vt === 'MOTORCYCLE'
        if (instrutorAtual && categoria !== 'AMBOS') {
          if (ehCarro && categoria !== 'CARRO') return false
          if (ehMoto && categoria !== 'MOTO') return false
        }
        return true
      }),
    [todosBloqueios, instrutorAtual, categoria]
  )
  const bloqueiosSem = bloqueios.filter((b) => !b.date)
  const semanaisTodos = useMemo(() => todosBloqueios.filter((b) => !b.date), [todosBloqueios])

  // ─── Regras: horário × bloqueio, horário × horário, bloqueio × bloqueio ─────
  const conflito = (horario: string, dias: number[] | null, data?: string | null) => {
    if (!HHMM.test(horario)) return null
    if (data) return conflitoComBloqueio(horario, [isoWeekday(data)], instrutorAtual, categoria, bloqueiosParaData(data, todosBloqueios))
    return conflitoComBloqueio(horario, dias, instrutorAtual, categoria, semanaisTodos)
  }
  const conflitoHorario = (horario: string, dias: number[] | null, ignorarId?: string | null, data?: string | null) => {
    const c = conflitoComHorario(horario, dias, proprios, ignorarId ?? undefined, data)
    return c ? mensagemConflitoHorario(horario, c) : null
  }
  const conflitoBloqueio = (m: { editId?: string; repete: Repete; tipo: TipoBloqueio; horario: string; dias: number[]; data: string }) => {
    if (m.tipo !== 'dia_inteiro' && !HHMM.test(m.horario)) return null
    const time_slot = m.tipo === 'dia_inteiro' ? 'DIA_INTEIRO' : m.tipo === 'apos' ? `APOS_${m.horario}` : m.horario
    const dono = m.editId ? todosBloqueios.find((x) => x.id === m.editId) : null
    const novo = { instructor: dono ? dono.instructor : instrutorAtual, vehicle_type: dono ? dono.vehicle_type : 'TODOS', time_slot }
    if (m.repete === 'data') {
      if (!m.data) return null
      const c = conflitoEntreBloqueios({ ...novo, weekdays: [isoWeekday(m.data)] }, bloqueiosParaData(m.data, todosBloqueios))
      return c ? mensagemConflitoBloqueio(c) : null
    }
    const c = conflitoEntreBloqueios({ ...novo, weekdays: m.dias }, semanaisTodos, m.editId)
    return c ? mensagemConflitoBloqueio(c) : null
  }
  // Aviso (não bloqueia): horários que o novo bloqueio deixa indisponíveis
  const horariosAfetados = (m: { repete: Repete; tipo: TipoBloqueio; horario: string; dias: number[]; data: string }) => {
    if (m.tipo !== 'dia_inteiro' && !HHMM.test(m.horario)) return []
    if (m.repete === 'data' && !m.data) return []
    const time_slot = m.tipo === 'dia_inteiro' ? 'DIA_INTEIRO' : m.tipo === 'apos' ? `APOS_${m.horario}` : m.horario
    const dias = m.repete === 'data' ? [isoWeekday(m.data)] : m.dias
    const data = m.repete === 'data' ? m.data : undefined
    const alvo = [...new Set(proprios.filter((h) => h.ativo).map((h) => h.horario))].sort()
    return alvo.filter((h) =>
      dias.some((d) =>
        horariosDoInstrutorNoDia(proprios, instrutorAtual ?? '', d, data).includes(h) &&
        conflitoComBloqueio(h, [d], instrutorAtual, categoria, [{ instructor: instrutorAtual, vehicle_type: 'TODOS', time_slot, weekdays: dias }])
      )
    )
  }

  // Texto do impedimento para um horário candidato (null = livre), já dizendo o que fazer
  const impedimento = (horario: string, dias: number[] | null, ignorarId?: string | null, data?: string | null): string | null => {
    const c = conflito(horario, dias, data)
    if (c) return `${mensagemConflito(horario, c)} Clique na faixa vermelha ao lado para editar ou excluir o bloqueio.`
    return conflitoHorario(horario, dias, ignorarId, data)
  }
  // Impedimento do que está no modal (horário ou bloqueio): usado no aviso, no botão e na dica do mouse
  const impedimentoModal = (m: NonNullable<Modal>): string | null => {
    if (m.modo === 'ver-bloqueio') return null
    if (m.repete === 'data') {
      if (!m.data) return 'Escolha a data.'
      if (m.data < hoje) return 'Escolha uma data de hoje em diante.'
    } else if (m.dias.length === 0) {
      return 'Selecione ao menos um dia da semana.'
    }
    if (m.modo === 'horario') {
      return impedimento(m.horario, m.repete === 'data' || m.dias.length === 7 ? null : m.dias, m.id, m.repete === 'data' ? m.data : null)
    }
    return conflitoBloqueio(m)
  }
  function mostrarDica(x: number, y: number, texto: string | null, duracaoMs?: number) {
    if (dicaTimer.current) { clearTimeout(dicaTimer.current); dicaTimer.current = null }
    if (!texto) { setDica(null); return }
    setDica({ x, y, texto })
    if (duracaoMs) dicaTimer.current = setTimeout(() => { dicaTimer.current = null; setDica(null) }, duracaoMs)
  }

  // O que aparece em cada coluna: recorrentes do dia da semana + pontuais daquela data
  const doDia = (n: number) => validos.filter((h) => (h.data ? h.data === datas[n] : valeNoDia(h, n)))

  // Faixa visível: 06–20h, ampliada se houver horário fora dela
  const mins = DIAS.flatMap((d) => doDia(d.n).map((h) => toMin(h.horario)))
  const inicio = Math.floor(Math.min(6 * 60, ...mins) / 60) * 60
  const fim = Math.ceil(Math.max(20 * 60, ...mins.map((m) => m + DURACAO)) / 60) * 60
  const altura = (fim - inicio) * PX_MIN
  const linhas = Array.from({ length: (fim - inicio) / 30 + 1 }, (_, i) => inicio + i * 30)

  // Global = cardápio da escola; o instrutor monta a agenda dele a partir dele
  const poolGlobal = useMemo(
    () => [...new Set(globais.filter((h) => h.ativo && !h.data && !isNaN(toMin(h.horario))).map((h) => h.horario))].sort(),
    [globais]
  )
  const jaTem = new Set(proprios.filter((h) => !h.data).map((h) => h.horario))

  function abrirHorario(dia: number | null, minuto?: number) {
    setError('')
    setModal({
      modo: 'horario', id: null, horario: minuto !== undefined ? fmt(minuto) : '', repete: 'semanal',
      dias: dia ? [dia] : DIAS_UTEIS, data: dia ? (datas[dia] < hoje ? hoje : datas[dia]) : hoje,
    })
  }
  function abrirBloqueio(dia: number | null, minuto?: number) {
    setError('')
    setModal({
      modo: 'bloqueio', repete: 'semanal', tipo: minuto !== undefined ? 'horario' : 'dia_inteiro', horario: minuto !== undefined ? fmt(minuto) : '',
      dias: dia ? [dia] : DIAS_UTEIS, data: dia ? (datas[dia] < hoje ? hoje : datas[dia]) : hoje, reason: '',
    })
  }
  function abrirEdicao(h: HorarioDisponivel) {
    if (!canEdit || usandoGlobais) return
    setError('')
    setModal({
      modo: 'horario', id: h.id, horario: h.horario, repete: h.data ? 'data' : 'semanal',
      dias: h.dias_semana && h.dias_semana.length ? h.dias_semana : TODOS, data: h.data ?? hoje,
    })
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!modal || modal.modo === 'ver-bloqueio') return
    setError('')
    const imp = impedimentoModal(modal)
    if (imp) { setError(imp); return }

    if (modal.modo === 'horario') {
      const m = modal
      const dias = m.repete === 'data' || m.dias.length === 7 ? null : m.dias
      startTransition(async () => {
        if (m.id) {
          const r = await atualizarHorario(m.id, { horario: m.horario, dias_semana: dias, data: m.repete === 'data' ? m.data : undefined }, autoescola_id)
          if (!r.success) { setError(r.error); return }
          setHorarios((prev) => prev.map((h) => (h.id === m.id ? r.data : h)))
        } else {
          const r = await criarHorario(m.horario, instrutorAtual, autoescola_id, dias, m.repete === 'data' ? m.data : null)
          if (!r.success) { setError(r.error); return }
          setHorarios((prev) => [...prev, r.data])
          if (r.data.data) setSegunda(segundaDe(r.data.data)) // leva a agenda até a semana criada
        }
        setModal(null)
      })
    } else {
      const m = modal
      startTransition(async () => {
        const r = m.repete === 'data'
          ? await criarBloqueioPontual({ date: m.data, tipo: m.tipo, horario: m.horario, instrutor: instrutorAtual, reason: m.reason, autoescola_id })
          : m.editId
            ? await atualizarBloqueioSemanal(m.editId, { dias: m.dias, tipo: m.tipo, horario: m.horario, reason: m.reason }, autoescola_id)
            : await criarBloqueioSemanalLivre({ dias: m.dias, tipo: m.tipo, horario: m.horario, instrutor: instrutorAtual, reason: m.reason, autoescola_id })
        if (!r.success) { setError(r.error); return }
        const w = Array.isArray(r.data.weekdays) ? (r.data.weekdays as unknown[]).map(Number) : m.dias
        const atualizado: BloqueioSemanal = {
          id: r.data.id, instructor: r.data.instructor, vehicle_type: r.data.vehicle_type,
          time_slot: r.data.time_slot, weekdays: m.repete === 'data' ? [] : w, reason: r.data.reason,
          date: m.repete === 'data' ? r.data.date : null,
        }
        setTodosBloqueios((prev) => (m.editId ? prev.map((x) => (x.id === m.editId ? atualizado : x)) : [...prev, atualizado]))
        if (m.repete === 'data') setSegunda(segundaDe(m.data))
        setModal(null)
      })
    }
  }

  function alternarAtivo(h: HorarioDisponivel) {
    startTransition(async () => {
      const r = await toggleHorario(h.id, !h.ativo, autoescola_id)
      if (r.success) setHorarios((prev) => prev.map((x) => (x.id === h.id ? { ...x, ativo: !h.ativo } : x)))
    })
  }

  function removerHorario(id: string) {
    startTransition(async () => {
      const r = await excluirHorario(id, autoescola_id)
      if (r.success) { setHorarios((prev) => prev.filter((h) => h.id !== id)); setModal(null) }
    })
  }

  function removerBloqueio(id: string) {
    startTransition(async () => {
      const r = await excluirBloqueio(id, autoescola_id)
      if (r.success) { setTodosBloqueios((prev) => prev.filter((b) => b.id !== id)); setModal(null) }
      else setAviso(r.error)
    })
  }

  function copiarGlobal() {
    if (!instrutorAtual) return
    startTransition(async () => {
      const r = await copiarGlobalParaInstrutor(instrutorAtual, autoescola_id)
      if (r.success) setHorarios((prev) => [...prev, ...r.data])
      else setAviso(r.error)
    })
  }

  // Arrastar: recorrente muda a ocorrência daquele dia da semana; pontual muda de hora e/ou de data
  function iniciarArraste(e: React.PointerEvent, h: HorarioDisponivel, diaOrigem: number) {
    if (!podeCriar || e.button !== 0) return
    const bloco = e.currentTarget as HTMLElement
    const offsetY = e.clientY - bloco.getBoundingClientRect().top
    const x0 = e.clientX
    const y0 = e.clientY
    let moveu = false
    let ultimo = { x: x0, y: y0 }
    let alvo = { dia: diaOrigem, minuto: toMin(h.horario) }
    const pontual = !!h.data
    const dataAlvo = () => (pontual ? datas[alvo.dia] : null)

    // Encaixe magnético: perto de um horário já usado por esse instrutor (ou do global), gruda nele;
    // senão encaixa de 10 em 10 minutos. Horários que já estão ocupados naquele dia não atraem.
    const conhecidos = [...new Set([...proprios.filter((x) => !x.data).map((x) => x.horario), ...poolGlobal])].map(toMin).filter((m) => !isNaN(m))
    const calcular = (ev: PointerEvent) => {
      let dia = alvo.dia
      for (const d of DIAS) {
        const r = colRefs.current[d.n]?.getBoundingClientRect()
        if (r && ev.clientX >= r.left && ev.clientX < r.right) { dia = d.n; break }
      }
      const topo = colRefs.current[dia]?.getBoundingClientRect().top ?? 0
      const cru = inicio + (ev.clientY - topo - offsetY) / PX_MIN
      let minuto = Math.round(cru / 10) * 10
      const ignorar = pontual ? h.id : dia === diaOrigem ? h.id : null
      const dataDia = pontual ? datas[dia] : null
      const ima = conhecidos
        .filter((t) => !conflitoComHorario(fmt(t), [dia], proprios, ignorar ?? undefined, dataDia))
        .reduce((melhor, t) => (Math.abs(t - cru) < Math.abs(melhor - cru) ? t : melhor), Infinity)
      if (isFinite(ima) && Math.abs(ima - cru) <= 15) minuto = ima
      alvo = { dia, minuto: Math.min(Math.max(minuto, inicio), fim - DURACAO) }
    }
    const impedimentoAlvo = () => {
      if (pontual && datas[alvo.dia] < hoje) return 'Essa data já passou. Escolha uma data de hoje em diante.'
      return impedimento(fmt(alvo.minuto), [alvo.dia], pontual || alvo.dia === diaOrigem ? h.id : null, dataAlvo())
    }
    const mover = (ev: PointerEvent) => {
      if (!moveu && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 5) return
      moveu = true
      setHover(null)
      ultimo = { x: ev.clientX, y: ev.clientY }
      calcular(ev)
      const msg = impedimentoAlvo()
      setDrag({ id: h.id, ...alvo, erro: !!msg })
      mostrarDica(ev.clientX, ev.clientY, msg)
    }
    const soltar = () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      window.removeEventListener('pointercancel', soltar)
      setDrag(null)
      if (!dicaTimer.current) setDica(null)
      if (!moveu) return
      arrastou.current = true
      setTimeout(() => { arrastou.current = false }, 0)

      const novoHorario = fmt(alvo.minuto)
      if (novoHorario === h.horario && alvo.dia === diaOrigem) return
      setAviso('')

      const impedido = impedimentoAlvo()
      if (impedido) {
        setAviso(impedido)
        mostrarDica(ultimo.x, ultimo.y, `Não foi movido para ${novoHorario}: ${impedido}`, 5000)
        return
      }

      const destino = alvo.dia
      const dataDestino = dataAlvo() ?? undefined

      // Pontual: atualiza no lugar (hora e data)
      if (pontual) {
        setHorarios((prev) => prev.map((x) => (x.id === h.id ? { ...x, horario: novoHorario, data: dataDestino! } : x)))
        fila.current = fila.current.then(async () => {
          const r = await moverOcorrenciaHorario(h.id, { diaOrigem, novoHorario, diaDestino: destino, dataDestino }, autoescola_id)
          if (r.success) setHorarios((prev) => prev.map((x) => (x.id === h.id ? r.data.atualizado : x)))
          else {
            setHorarios((prev) => prev.map((x) => (x.id === h.id ? h : x)))
            setAviso(r.error)
            mostrarDica(ultimo.x, ultimo.y, r.error, 5000)
          }
        }).catch(() => {
          setHorarios((prev) => prev.map((x) => (x.id === h.id ? h : x)))
          setAviso('Não foi possível salvar o movimento. Tente novamente.')
        })
        return
      }

      // Recorrente: atualização otimista, igual à do servidor
      const diasAtuais = h.dias_semana && h.dias_semana.length > 0 ? h.dias_semana : TODOS
      const provisorioId = `tmp-${Date.now()}`
      const emPlace = diasAtuais.length === 1
      if (emPlace) {
        setHorarios((prev) => prev.map((x) => (x.id === h.id ? { ...x, horario: novoHorario, dias_semana: [destino] } : x)))
      } else {
        const restantes = diasAtuais.filter((d) => d !== diaOrigem)
        setHorarios((prev) => [
          ...prev.map((x) => (x.id === h.id ? { ...x, dias_semana: restantes.length === 7 ? null : restantes } : x)),
          { ...h, id: provisorioId, horario: novoHorario, dias_semana: [destino] },
        ])
      }
      fila.current = fila.current.then(async () => {
        const r = await moverOcorrenciaHorario(h.id, { diaOrigem, novoHorario, diaDestino: destino }, autoescola_id)
        if (r.success) {
          setHorarios((prev) => {
            const sem = prev.filter((x) => x.id !== provisorioId).map((x) => (x.id === h.id ? r.data.atualizado : x))
            return r.data.criado ? [...sem, r.data.criado] : sem
          })
        } else {
          // desfaz só este movimento
          setHorarios((prev) =>
            emPlace
              ? prev.map((x) => (x.id === h.id ? h : x))
              : prev.filter((x) => x.id !== provisorioId).map((x) => (x.id === h.id ? h : x))
          )
          setAviso(r.error)
          mostrarDica(ultimo.x, ultimo.y, r.error, 5000)
        }
      }).catch(() => {
        setHorarios((prev) => (emPlace ? prev.map((x) => (x.id === h.id ? h : x)) : prev.filter((x) => x.id !== provisorioId).map((x) => (x.id === h.id ? h : x))))
        setAviso('Não foi possível salvar o movimento. Tente novamente.')
      })
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
    window.addEventListener('pointercancel', soltar)
  }

  const editando = modal?.modo === 'horario' && modal.id ? horarios.find((h) => h.id === modal.id) : null
  const bloqueioVisto = modal?.modo === 'ver-bloqueio' ? todosBloqueios.find((b) => b.id === modal.id) : null
  const criando = modal && modal.modo !== 'ver-bloqueio' && !(modal.modo === 'horario' && modal.id) && !(modal.modo === 'bloqueio' && modal.editId)
  const tipoFixo = !!(modal && modal.modo !== 'ver-bloqueio' && ((modal.modo === 'horario' && modal.id) || (modal.modo === 'bloqueio' && modal.editId)))
  const impModal = modal ? impedimentoModal(modal) : null

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[--p-text-1]">Horários</h1>
          <p className="text-sm text-[--p-text-3] mt-0.5">
            Agenda de cada instrutor, semana a semana. Clique num espaço vazio para criar e arraste um horário para movê-lo.
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => abrirBloqueio(null)}
              className="flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-rose-500/40 text-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              <Ban className="w-4 h-4" /> Novo bloqueio
            </button>
            <button
              onClick={() => abrirHorario(null)}
              className="flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold rounded-xl bg-[#0ea5e9] text-white hover:bg-[#0284c7] transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Novo horário
            </button>
          </div>
        )}
      </div>

      {/* Instrutores */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {[...instrutores.map((i) => ({ key: i.name, label: primeiroNome(i.name), cat: i.category, n: horarios.filter((h) => h.instrutor === i.name && !h.data).length })),
          { key: GLOBAL, label: 'Global', cat: 'GLOBAL', n: globais.filter((h) => !h.data).length }].map((o) => {
          const ativo = selecionado === o.key
          return (
            <button
              key={o.key}
              onClick={() => { setSelecionado(o.key); setModal(null); setHover(null) }}
              className={`shrink-0 flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                ativo
                  ? 'bg-[#0ea5e9]/12 border-[#0ea5e9] text-[--p-text-1]'
                  : 'bg-[--p-bg-card] border-[--p-border] text-[--p-text-2] hover:bg-[--p-hover]'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center ${ativo ? 'bg-[#0ea5e9] text-white' : 'bg-[--p-hover] text-[--p-text-3]'}`}>
                {o.cat === 'GLOBAL' ? <Layers className="w-3.5 h-3.5" /> : <CategoriaIcon cat={o.cat} className="w-3.5 h-3.5" />}
              </span>
              {o.label}
              <span className="text-xs text-[--p-text-3] tabular-nums">{o.n}</span>
            </button>
          )
        })}
      </div>

      {instrutorAtual === null && (
        <p className="text-sm text-[--p-text-2] bg-[#0ea5e9]/8 border border-[#0ea5e9]/25 rounded-xl px-4 py-3">
          O <b>Global</b> é o cardápio de horários da escola: quem ainda não tem agenda própria usa estes, e ao montar a agenda de um instrutor você escolhe a partir deles.
        </p>
      )}

      {usandoGlobais && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[--p-bg-card] border border-dashed border-[--p-border] rounded-xl px-4 py-3">
          <p className="text-sm text-[--p-text-2]">
            <b className="text-[--p-text-1]">{nomeAtual}</b> usa os horários globais (em cinza). Crie uma agenda própria para ajustar dia a dia.
          </p>
          {canEdit && globais.length > 0 && (
            <button
              onClick={copiarGlobal}
              disabled={isPending}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl bg-[#0ea5e9] text-white hover:bg-[#0284c7] disabled:opacity-50"
            >
              <Copy className="w-4 h-4" /> Criar agenda a partir do global
            </button>
          )}
        </div>
      )}

      {/* Navegação por semana */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setSegunda(somarDias(segunda, -7))} aria-label="Semana anterior" className="p-2 rounded-lg border border-[--p-border] bg-[--p-bg-card] text-[--p-text-2] hover:bg-[--p-hover]">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setSegunda(segundaDe(hoje))} className="px-3 py-2 rounded-lg border border-[--p-border] bg-[--p-bg-card] text-sm font-semibold text-[--p-text-1] hover:bg-[--p-hover]">
            Hoje
          </button>
          <button onClick={() => setSegunda(somarDias(segunda, 7))} aria-label="Próxima semana" className="p-2 rounded-lg border border-[--p-border] bg-[--p-bg-card] text-[--p-text-2] hover:bg-[--p-hover]">
            <ChevronRight className="w-4 h-4" />
          </button>
          <h2 className="ml-2 text-base font-semibold text-[--p-text-1]">{tituloSemana(segunda)}</h2>
        </div>
        <label className="flex items-center gap-2 text-xs text-[--p-text-3]">
          <CalendarDays className="w-4 h-4" /> Ir para
          <input
            type="date"
            value={datas[1]}
            onChange={(e) => { if (e.target.value) setSegunda(segundaDe(e.target.value)) }}
            aria-label="Ir para a semana de"
            className="px-2.5 py-1.5 rounded-lg bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]/40"
          />
        </label>
      </div>

      {/* Legenda: o que cada cor significa */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[--p-text-2]">
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-[#0ea5e9]/15 border-l-[3px] border-[#0ea5e9]" />
          <b className="text-[#0ea5e9] font-semibold">Azul</b> horário toda semana
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-violet-500/15 border-l-[3px] border-violet-500" />
          <b className="text-violet-500 font-semibold">Roxo</b> horário só naquela data
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-sm border-l-2 border-rose-500" style={{ background: 'repeating-linear-gradient(135deg, rgba(244,63,94,.45) 0 3px, rgba(244,63,94,.15) 3px 6px)' }} />
          <b className="text-rose-500 font-semibold">Vermelho</b> bloqueio: o horário fica indisponível
        </span>
      </div>

      {/* Grade */}
      <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[780px]">
            <div className="grid grid-cols-[52px_repeat(7,1fr)] border-b border-[--p-border] bg-[--p-bg-card]">
              <div />
              {DIAS.map((d) => {
                const ehHoje = datas[d.n] === hoje
                const passado = datas[d.n] < hoje
                return (
                  <div key={d.n} className={`py-2.5 text-center border-l border-[--p-border] ${passado ? 'opacity-55' : ''}`}>
                    <span className="block text-xs font-medium text-[--p-text-3]">{d.curto}</span>
                    <span className={`inline-flex items-center justify-center h-8 min-w-[2rem] px-1.5 mt-0.5 rounded-full text-base font-semibold tabular-nums ${ehHoje ? 'bg-[#0ea5e9] text-white' : 'text-[--p-text-1]'}`}>
                      {Number(datas[d.n].slice(8, 10))}
                    </span>
                    {(d.n === 1 || datas[d.n].slice(8, 10) === '01') && (
                      <span className="block text-[10px] text-[--p-text-3] -mt-0.5">{MESES[Number(datas[d.n].slice(5, 7)) - 1].slice(0, 3)}</span>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="grid grid-cols-[52px_repeat(7,1fr)]" style={{ height: altura }}>
              <div className="relative">
                {linhas.filter((m) => m % 60 === 0).map((m) => (
                  <span key={m} className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-[--p-text-3]" style={{ top: (m - inicio) * PX_MIN }}>
                    {fmt(m)}
                  </span>
                ))}
              </div>

              {DIAS.map((d) => {
                const dataCol = datas[d.n]
                const passado = dataCol < hoje
                const criavel = podeCriar && !passado
                return (
                  <div
                    key={d.n}
                    ref={(el) => { colRefs.current[d.n] = el }}
                    className={`relative border-l border-[--p-border] ${d.n >= 6 ? 'bg-[--p-hover]/40' : ''} ${passado ? 'bg-[--p-hover]/60' : ''} ${criavel ? 'cursor-cell' : ''}`}
                    onPointerMove={(e) => {
                      if (!criavel || drag || e.target !== e.currentTarget) { if (hover) setHover(null); if (dica && !dicaTimer.current) setDica(null); return }
                      const y = e.clientY - e.currentTarget.getBoundingClientRect().top
                      const minuto = Math.min(inicio + Math.round(y / PX_MIN / 10) * 10, fim - DURACAO)
                      const msg = impedimento(fmt(minuto), [d.n], undefined, dataCol)
                      if (msg) { if (hover) setHover(null); mostrarDica(e.clientX, e.clientY, msg); return }
                      if (dica && !dicaTimer.current) setDica(null)
                      if (!hover || hover.dia !== d.n || hover.minuto !== minuto) setHover({ dia: d.n, minuto })
                    }}
                    onPointerLeave={() => { setHover(null); if (!dicaTimer.current) setDica(null) }}
                    onClick={(e) => {
                      if (!podeCriar || e.target !== e.currentTarget) return
                      if (passado) { mostrarDica(e.clientX, e.clientY, 'Essa data já passou. Navegue para hoje ou para uma data futura para criar.', 3500); return }
                      const y = e.clientY - e.currentTarget.getBoundingClientRect().top
                      const minuto = Math.min(inicio + Math.round(y / PX_MIN / 10) * 10, fim - DURACAO)
                      const msg = impedimento(fmt(minuto), [d.n], undefined, dataCol)
                      if (msg) { mostrarDica(e.clientX, e.clientY, msg, 4000); return }
                      abrirHorario(d.n, minuto)
                    }}
                  >
                    {linhas.map((m) => (
                      <div
                        key={m}
                        className={`absolute inset-x-0 pointer-events-none border-t ${m % 60 === 0 ? 'border-[--p-border]' : 'border-dashed border-[--p-border]/50'}`}
                        style={{ top: (m - inicio) * PX_MIN }}
                      />
                    ))}

                    {/* Bloqueios (semanais deste dia da semana + pontuais desta data): tom suave na área + faixa clicável na lateral */}
                    {bloqueios.filter((b) => (b.date ? b.date === dataCol : b.weekdays.includes(d.n))).map((b) => {
                      const dia = b.time_slot === 'TODOS' || b.time_slot === 'DIA_INTEIRO'
                      const apos = b.time_slot.startsWith('APOS_')
                      const ini = dia ? inicio : apos ? toMin(b.time_slot.slice(5)) : toMin(b.time_slot)
                      if (isNaN(ini)) return null
                      const top = (Math.max(ini, inicio) - inicio) * PX_MIN
                      const h = (dia ? fim - inicio : apos ? fim - ini : DURACAO) * PX_MIN
                      return (
                        <div key={b.id + d.n}>
                          <div className="absolute inset-x-0 pointer-events-none bg-rose-500/[0.07]" style={{ top, height: h }} />
                          <button
                            type="button"
                            title={`Bloqueio${b.date ? ` em ${curta(b.date)}` : ' semanal'}: ${descreverBloqueio(b)}${b.reason ? ` — ${b.reason}` : ''}${b.instructor ? ` (${primeiroNome(b.instructor)})` : ' (todos)'}`}
                            onClick={(e) => { e.stopPropagation(); setModal({ modo: 'ver-bloqueio', id: b.id }) }}
                            className="absolute right-0 z-[3] border-l-2 border-rose-500/70 hover:border-rose-500 overflow-hidden flex items-center justify-center transition-colors"
                            style={{
                              top, height: h, width: RAIL,
                              background: 'repeating-linear-gradient(135deg, rgba(244,63,94,.32) 0 4px, rgba(244,63,94,.10) 4px 8px)',
                            }}
                          >
                            {h >= 70 && (
                              <span className="text-[9px] font-bold text-rose-600 dark:text-rose-300 [writing-mode:vertical-rl] rotate-180 whitespace-nowrap">
                                Bloqueio
                              </span>
                            )}
                          </button>
                        </div>
                      )
                    })}

                    {/* Horários */}
                    {doDia(d.n).map((h) => {
                      const especifico = !h.data && h.dias_semana && h.dias_semana.length > 0 && h.dias_semana.length < 7
                      const salvando = h.id.startsWith('tmp-')
                      return (
                        <button
                          key={h.id + d.n}
                          onPointerDown={(e) => iniciarArraste(e, h, d.n)}
                          onClick={() => { if (!arrastou.current) abrirEdicao(h) }}
                          disabled={!podeCriar || salvando}
                          title={salvando ? 'Salvando…' : undefined}
                          className={`absolute left-1 z-[2] rounded-lg pl-2.5 pr-1.5 py-1 text-left overflow-hidden border-l-[3px] transition-shadow touch-none select-none ${salvando ? 'animate-pulse pointer-events-none' : ''} ${
                            podeCriar ? 'cursor-grab active:cursor-grabbing hover:shadow-md' : ''
                          } ${
                            usandoGlobais
                              ? 'bg-[--p-hover] border-slate-400/60 text-[--p-text-3]'
                              : !h.ativo
                                ? 'bg-[--p-hover] border-slate-400/60 text-[--p-text-3] line-through'
                                : h.data
                                  ? 'bg-violet-500/15 border-violet-500 text-[--p-text-1]'
                                  : 'bg-[#0ea5e9]/15 border-[#0ea5e9] text-[--p-text-1]'
                          } ${drag?.id === h.id ? 'opacity-30' : ''} ${passado ? 'opacity-60' : ''}`}
                          style={{ top: (toMin(h.horario) - inicio) * PX_MIN + 1, height: DURACAO * PX_MIN - 2, right: RAIL + 2 }}
                        >
                          <span className="block text-[13px] font-semibold leading-tight tabular-nums">{h.horario}</span>
                          {h.data && <span className="block text-[10px] leading-tight text-violet-500 font-medium mt-0.5">só {curta(h.data)}</span>}
                          {especifico && <span className="block text-[10px] leading-tight text-[#0ea5e9] font-medium mt-0.5">só {resumoDias(h.dias_semana)}</span>}
                        </button>
                      )
                    })}

                    {/* Dica ao passar o mouse em espaço vazio */}
                    {hover && hover.dia === d.n && !drag && (
                      <div
                        className="absolute left-1 rounded-lg border border-dashed border-[#0ea5e9]/70 bg-[#0ea5e9]/8 text-[#0ea5e9] text-xs font-semibold flex items-center gap-1 px-2 pointer-events-none z-[1]"
                        style={{ top: (hover.minuto - inicio) * PX_MIN + 1, height: DURACAO * PX_MIN - 2, right: RAIL + 2 }}
                      >
                        <Plus className="w-3 h-3" /> {fmt(hover.minuto)}
                      </div>
                    )}

                    {drag && drag.dia === d.n && (
                      <div
                        className={`absolute left-1 rounded-lg px-2.5 py-1 text-[13px] font-bold border-2 z-[5] pointer-events-none shadow-lg tabular-nums text-[--p-text-1] ${drag.erro ? 'border-rose-500 bg-rose-500/35' : 'border-[#0ea5e9] bg-[#0ea5e9]/35'}`}
                        style={{ top: (drag.minuto - inicio) * PX_MIN + 1, height: DURACAO * PX_MIN - 2, right: RAIL + 2 }}
                      >
                        {fmt(drag.minuto)}
                      </div>
                    )}

                    {/* Linha do "agora" */}
                    {dataCol === hoje && agoraMin !== null && agoraMin >= inicio && agoraMin <= fim && (
                      <div className="absolute inset-x-0 z-[4] pointer-events-none flex items-center" style={{ top: (agoraMin - inicio) * PX_MIN }}>
                        <span className="w-2 h-2 -ml-1 rounded-full bg-sky-600" />
                        <span className="flex-1 border-t border-sky-600" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {aviso && (
        <div className="flex items-start justify-between gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2.5 text-sm text-[--p-text-1]">
          <span>{aviso}</span>
          <button onClick={() => setAviso('')} aria-label="Fechar aviso" className="text-[--p-text-3] hover:text-[--p-text-1]"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Bloqueios semanais */}
      <section className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-[--p-border]">
          <h2 className="text-sm font-semibold text-[--p-text-1]">
            Bloqueios semanais {instrutorAtual ? `de ${nomeAtual}` : 'da escola'}
            <span className="ml-2 text-xs font-normal text-[--p-text-3] tabular-nums">{bloqueiosSem.length}</span>
          </h2>
          <div className="flex items-center gap-4">
            {canEdit && (
              <button onClick={() => abrirBloqueio(null)} className="flex items-center gap-1 text-xs font-semibold text-rose-500 hover:underline">
                <Plus className="w-3.5 h-3.5" /> Novo bloqueio
              </button>
            )}
            <Link href={`/${escola}/painel/bloqueios`} className="text-xs text-[--p-accent] hover:underline">Todos os bloqueios, com filtros</Link>
          </div>
        </div>
        {bloqueiosSem.length === 0 ? (
          <p className="px-4 py-4 text-sm text-[--p-text-3]">Nenhum bloqueio semanal. Eles servem para almoço, fim de expediente e dias sem atendimento.</p>
        ) : (
          <ul className="divide-y divide-[--p-border]">
            {bloqueiosSem.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm">
                <span className="w-1 self-stretch rounded-full bg-rose-500/70" />
                <span className="font-medium text-[--p-text-1] min-w-[100px]">{resumoDias(b.weekdays)}</span>
                <span className="text-[--p-text-2] tabular-nums">{descreverBloqueio(b)}</span>
                <span className="text-xs text-[--p-text-3]">{b.instructor ? primeiroNome(b.instructor) : 'Todos os instrutores'}</span>
                {b.reason && <span className="text-xs text-[--p-text-3] truncate max-w-[40%] sm:ml-auto">{b.reason}</span>}
                {canEdit && (
                  <button
                    onClick={() => removerBloqueio(b.id)}
                    disabled={isPending}
                    aria-label="Excluir bloqueio"
                    className={`p-1.5 rounded-lg text-[--p-text-3] hover:text-red-500 hover:bg-red-500/10 ${b.reason ? '' : 'sm:ml-auto'}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {invalidos.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-sm text-[--p-text-1]">
          <p className="font-semibold mb-2">Horários com formato inválido (não aparecem para o aluno)</p>
          <div className="flex flex-wrap gap-2">
            {invalidos.map((h) => (
              <span key={h.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[--p-bg-card] border border-[--p-border]">
                “{h.horario}”
                {canEdit && (
                  <button onClick={() => removerHorario(h.id)} disabled={isPending} className="text-red-400 hover:text-red-500" aria-label="Excluir">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div
          className="horarios-overlay fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            className="horarios-modal w-full sm:max-w-sm max-h-[92vh] overflow-y-auto bg-[--p-bg-card] border border-[--p-border] rounded-t-2xl sm:rounded-2xl shadow-xl"
          >
            {/* Detalhe de um bloqueio */}
            {modal.modo === 'ver-bloqueio' && bloqueioVisto && (
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-bold text-[--p-text-1] flex items-center gap-2">
                      <Ban className="w-4 h-4 text-rose-500" /> {bloqueioVisto.date ? `Bloqueio em ${longa(bloqueioVisto.date)}` : 'Bloqueio semanal'}
                    </h2>
                    <p className="text-xs text-[--p-text-3] mt-0.5">{bloqueioVisto.instructor ? primeiroNome(bloqueioVisto.instructor) : 'Todos os instrutores'}</p>
                  </div>
                  <button onClick={() => setModal(null)} aria-label="Fechar" className="text-[--p-text-3] hover:text-[--p-text-1]"><X className="w-4 h-4" /></button>
                </div>
                <dl className="grid grid-cols-[80px_1fr] gap-y-2 text-sm">
                  <dt className="text-[--p-text-3]">{bloqueioVisto.date ? 'Data' : 'Dias'}</dt>
                  <dd className="text-[--p-text-1]">{bloqueioVisto.date ? longa(bloqueioVisto.date) : resumoDias(bloqueioVisto.weekdays)}</dd>
                  <dt className="text-[--p-text-3]">Horário</dt><dd className="text-[--p-text-1]">{descreverBloqueio(bloqueioVisto)}</dd>
                  {bloqueioVisto.reason && (<><dt className="text-[--p-text-3]">Motivo</dt><dd className="text-[--p-text-1]">{bloqueioVisto.reason}</dd></>)}
                </dl>
                <p className="text-xs text-[--p-text-3]">Durante esse período o aluno não consegue agendar com este instrutor.</p>
                {canEdit && (
                  <div className="flex gap-2">
                    {!bloqueioVisto.date && (
                      <button
                        onClick={() => {
                          setError('')
                          setModal({ modo: 'bloqueio', editId: bloqueioVisto.id, repete: 'semanal', ...tipoDoTimeSlot(bloqueioVisto.time_slot), dias: bloqueioVisto.weekdays, data: hoje, reason: bloqueioVisto.reason ?? '' })
                        }}
                        disabled={isPending}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 disabled:opacity-50"
                      >
                        <Pencil className="w-4 h-4" /> Editar
                      </button>
                    )}
                    <button
                      onClick={() => removerBloqueio(bloqueioVisto.id)}
                      disabled={isPending}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/40 text-red-500 text-sm font-semibold hover:bg-red-500/10 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" /> Excluir
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Criar / editar */}
            {modal.modo !== 'ver-bloqueio' && (
              <form onSubmit={salvar}>
                <div className="flex items-start justify-between px-5 pt-5">
                  <div>
                    <h2 className="font-bold text-[--p-text-1]">
                      {modal.modo === 'horario' && modal.id ? 'Editar horário' : modal.modo === 'bloqueio' && modal.editId ? 'Editar bloqueio' : 'Adicionar à agenda'}
                    </h2>
                    <p className="text-xs text-[--p-text-3] mt-0.5">{instrutorAtual ? nomeAtual : 'Global — todos os instrutores'}</p>
                  </div>
                  <button type="button" onClick={() => setModal(null)} aria-label="Fechar" className="text-[--p-text-3] hover:text-[--p-text-1]"><X className="w-4 h-4" /></button>
                </div>

                {criando && (
                  <div className="mx-5 mt-4 grid grid-cols-2 p-1 rounded-xl bg-[--p-bg-input] border border-[--p-border]">
                    {([['horario', 'Horário', CalendarClock], ['bloqueio', 'Bloqueio', Ban]] as const).map(([k, label, Icon]) => {
                      const ativo = modal.modo === k
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => {
                            setError('')
                            if (k === 'horario') setModal({ modo: 'horario', id: null, horario: modal.modo === 'bloqueio' && modal.tipo !== 'dia_inteiro' ? modal.horario : '', repete: modal.repete, dias: modal.dias, data: modal.data })
                            else setModal({ modo: 'bloqueio', repete: modal.repete, tipo: modal.modo === 'horario' && modal.horario ? 'horario' : 'dia_inteiro', horario: modal.modo === 'horario' ? modal.horario : '', dias: modal.dias, data: modal.data, reason: '' })
                          }}
                          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                            ativo ? (k === 'horario' ? 'bg-[#0ea5e9] text-white shadow-sm' : 'bg-rose-500 text-white shadow-sm') : 'text-[--p-text-2] hover:text-[--p-text-1]'
                          }`}
                        >
                          <Icon className="w-4 h-4" /> {label}
                        </button>
                      )
                    })}
                  </div>
                )}

                <div className="px-5 py-4 space-y-4">
                  {modal.modo === 'horario' && (
                    <>
                      <div>
                        <label htmlFor="hr-hora" className="block text-xs font-medium text-[--p-text-2] mb-1.5">Horário</label>
                        <input
                          id="hr-hora"
                          required
                          autoFocus
                          type="time"
                          value={modal.horario}
                          onChange={(e) => setModal({ ...modal, horario: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-lg font-semibold tabular-nums text-[--p-text-1] focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/40"
                        />
                        {instrutorAtual && poolGlobal.length > 0 && (
                          <div className="mt-2.5">
                            <p className="text-[11px] text-[--p-text-3] mb-1.5">Do global da escola</p>
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                              {poolGlobal.filter((h) => !jaTem.has(h) || modal.horario === h).map((h) => (
                                <button
                                  key={h}
                                  type="button"
                                  onClick={() => setModal({ ...modal, horario: h })}
                                  className={`px-2 py-1 rounded-md text-xs tabular-nums border ${
                                    modal.horario === h ? 'bg-[#0ea5e9] border-[#0ea5e9] text-white' : 'bg-[--p-bg-input] border-[--p-border] text-[--p-text-2] hover:bg-[--p-hover]'
                                  }`}
                                >
                                  {h}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {instrutorAtual && poolGlobal.length > 0 && HHMM.test(modal.horario) && !poolGlobal.includes(modal.horario) && (
                          <p className="mt-2 text-[11px] text-amber-500">Este horário não está no global. Vale só para {nomeAtual}.</p>
                        )}
                      </div>

                      {tipoFixo ? (
                        modal.repete === 'data' ? (
                          <div>
                            <label htmlFor="hr-data" className="block text-xs font-medium text-[--p-text-2] mb-1.5">Data (horário pontual)</label>
                            <input
                              id="hr-data"
                              type="date"
                              required
                              min={hoje}
                              value={modal.data}
                              onChange={(e) => setModal({ ...modal, data: e.target.value })}
                              className="w-full px-3 py-2.5 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm font-semibold text-[--p-text-1] focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/40"
                            />
                          </div>
                        ) : (
                          <DiasChips dias={modal.dias} onChange={(dias) => setModal({ ...modal, dias })} tom="sky" />
                        )
                      ) : (
                        <Repeticao repete={modal.repete} dias={modal.dias} data={modal.data} onChange={(p) => setModal({ ...modal, ...p })} hoje={hoje} tom="sky" />
                      )}

                      {impModal && (
                        <p role="alert" className="flex gap-2 text-xs text-rose-600 dark:text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
                          <Ban className="w-4 h-4 shrink-0 mt-px" /> <span>{impModal}</span>
                        </p>
                      )}
                    </>
                  )}

                  {modal.modo === 'bloqueio' && (
                    <>
                      <p className="text-xs text-[--p-text-2] bg-rose-500/8 border border-rose-500/25 rounded-lg px-3 py-2">
                        Bloqueio deixa o horário <b>indisponível</b> para o aluno, {modal.repete === 'data' ? 'só na data escolhida' : 'toda semana nos dias escolhidos'}.
                      </p>
                      {!tipoFixo && (
                        <Repeticao repete={modal.repete} dias={modal.dias} data={modal.data} onChange={(p) => setModal({ ...modal, ...p })} hoje={hoje} tom="rose" />
                      )}
                      <BloqueioSemanalCampos
                        value={modal}
                        onChange={(v) => setModal({ ...modal, ...v })}
                        idPrefix="bl"
                        mostrarDias={tipoFixo && modal.repete === 'semanal'}
                      />
                      {impModal ? (
                        <p role="alert" className="flex gap-2 text-xs text-rose-600 dark:text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
                          <Ban className="w-4 h-4 shrink-0 mt-px" /> <span>{impModal}</span>
                        </p>
                      ) : (() => {
                        const afetados = horariosAfetados(modal)
                        return afetados.length > 0 ? (
                          <p className="text-xs text-[--p-text-2] bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                            Os horários {afetados.join(', ')} de {nomeAtual} ficarão indisponíveis {modal.repete === 'data' ? 'nesse dia' : 'nesses dias'}. Eles continuam cadastrados, e voltam se o bloqueio for excluído.
                          </p>
                        ) : null
                      })()}
                      <p className="text-[11px] text-[--p-text-3]">
                        Vale para {(() => {
                          const alvo = modal.editId ? todosBloqueios.find((x) => x.id === modal.editId)?.instructor ?? null : instrutorAtual
                          return alvo ? <b>{primeiroNome(alvo)}</b> : <b>todos os instrutores</b>
                        })()}.
                      </p>
                    </>
                  )}

                  {error && !impModal && <p role="alert" className="text-sm text-red-500">{error}</p>}
                </div>

                <div className="flex items-center gap-2 px-5 pb-5">
                  {editando && (
                    <>
                      <button type="button" onClick={() => removerHorario(editando.id)} disabled={isPending} aria-label="Excluir horário" className="p-2.5 rounded-xl border border-[--p-border] text-red-500 hover:bg-red-500/10">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => alternarAtivo(editando)} disabled={isPending} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-[--p-border] text-sm text-[--p-text-2] hover:bg-[--p-hover]">
                        <Power className="w-4 h-4" />{editando.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    </>
                  )}
                  <span
                    className="ml-auto"
                    onPointerMove={(e) => mostrarDica(e.clientX, e.clientY, impModal)}
                    onPointerLeave={() => setDica(null)}
                  >
                    <button
                      type="submit"
                      disabled={isPending || !!impModal}
                      className={`px-5 py-2.5 text-white text-sm font-semibold rounded-xl disabled:opacity-50 ${
                        modal.modo === 'bloqueio' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-[#0ea5e9] hover:bg-[#0284c7]'
                      }`}
                    >
                      {modal.modo === 'bloqueio' ? (modal.editId ? 'Salvar alterações' : 'Criar bloqueio') : editando ? 'Salvar alterações' : 'Criar horário'}
                    </button>
                  </span>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {dica && (
        <div
          role="status"
          className="fixed z-[70] pointer-events-none max-w-[300px] rounded-xl border border-rose-500/50 bg-[--p-bg-card] text-[--p-text-1] shadow-xl px-3 py-2 text-xs leading-snug"
          style={{
            left: Math.min(dica.x + 16, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 320),
            top: Math.min(dica.y + 18, (typeof window !== 'undefined' ? window.innerHeight : 800) - 120),
          }}
        >
          <span className="flex gap-2"><Ban className="w-4 h-4 shrink-0 text-rose-500" /><span>{dica.texto}</span></span>
        </div>
      )}
    </div>
  )
}
