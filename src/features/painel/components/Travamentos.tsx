'use client'

import { useState, useTransition } from 'react'
import { Hourglass, Clock, CheckCircle2, Lock, CalendarClock, Plus, Trash2 } from 'lucide-react'
import { salvarJanelaAgendamento, salvarReagendamentoMinHoras } from '@/features/painel/actions/configuracoes'
import {
  DIAS_SEMANA, janelaAbertaAgora, janelaVazia, resumoJanela, validarJanela,
  type FaixaHorario, type JanelaAgendamento,
} from '@/lib/janelaAgendamento'

interface Props {
  autoescola_id: string
  escola: string
  initialReagendamentoMinHoras: number
  initialJanela: JanelaAgendamento | null
  /** Perfil com "editar" na área (sem isso, a tela fica só leitura). */
  podeEditar: boolean
}

const FAIXA_PADRAO: FaixaHorario = { inicio: '07:00', fim: '20:00' }

const PRESETS: { label: string; dias: number[]; faixa: FaixaHorario }[] = [
  { label: 'Seg–Sex · 07h–20h', dias: [1, 2, 3, 4, 5], faixa: { inicio: '07:00', fim: '20:00' } },
  { label: 'Seg–Sáb · 07h–17h', dias: [1, 2, 3, 4, 5, 6], faixa: { inicio: '07:00', fim: '17:00' } },
  { label: 'Todos os dias · 07h–20h', dias: [0, 1, 2, 3, 4, 5, 6], faixa: { inicio: '07:00', fim: '20:00' } },
]

function Card({ icone: Icone, cor, titulo, descricao, children, acao }: {
  icone: typeof Clock; cor: string; titulo: string; descricao: string; children: React.ReactNode; acao?: React.ReactNode
}) {
  return (
    <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-5">
      <div className="flex items-start gap-4">
        <div className="w-8 h-8 rounded-lg bg-[--p-bg-input] border border-[--p-border] flex items-center justify-center shrink-0 mt-0.5">
          <Icone className={`w-4 h-4 ${cor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[--p-text-1]">{titulo}</p>
              <p className="text-xs text-[--p-text-3] mt-0.5 mb-4">{descricao}</p>
            </div>
            {acao}
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

function Interruptor({ ligado, onChange, disabled, label }: { ligado: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!ligado)}
      className={`relative w-10 h-6 rounded-full shrink-0 transition-colors disabled:opacity-50 ${ligado ? 'bg-[--p-accent]' : 'bg-[--p-border]'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${ligado ? 'translate-x-4' : ''}`} />
    </button>
  )
}

function BotaoSalvar({ onClick, pendente, salvo, erro, texto }: { onClick: () => void; pendente: boolean; salvo: boolean; erro: string | null; texto: string }) {
  return (
    <div className="flex items-center gap-3 mt-4">
      <button
        onClick={onClick}
        disabled={pendente}
        className="px-5 py-2.5 rounded-xl bg-[--p-accent] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {pendente ? 'Salvando...' : texto}
      </button>
      {salvo && (
        <span className="text-sm text-emerald-400 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" /> Salvo!
        </span>
      )}
      {erro && <span className="text-sm text-red-400">{erro}</span>}
    </div>
  )
}

export function Travamentos({ autoescola_id, escola, initialReagendamentoMinHoras, initialJanela, podeEditar }: Props) {
  // ── Reagendamento ──
  const [horas, setHoras] = useState(initialReagendamentoMinHoras)
  const [pendenteReag, startReag] = useTransition()
  const [salvoReag, setSalvoReag] = useState(false)
  const [erroReag, setErroReag] = useState<string | null>(null)

  function salvarReag() {
    setErroReag(null)
    setSalvoReag(false)
    const horasValidadas = Math.max(1, Math.round(horas))
    startReag(async () => {
      const result = await salvarReagendamentoMinHoras(autoescola_id, horasValidadas, escola)
      if (!result.success) setErroReag(result.error ?? 'Erro ao salvar configurações.')
      else { setSalvoReag(true); setHoras(horasValidadas) }
    })
  }

  // ── Janela de agendamento ──
  const [janela, setJanela] = useState<JanelaAgendamento>(initialJanela ?? janelaVazia())
  const [pendenteJan, startJan] = useTransition()
  const [salvoJan, setSalvoJan] = useState(false)
  const [erroJan, setErroJan] = useState<string | null>(null)

  function mudar(fn: (dias: Record<string, FaixaHorario[]>) => Record<string, FaixaHorario[]>) {
    setSalvoJan(false)
    setErroJan(null)
    setJanela((j) => ({ ...j, dias: fn(j.dias) }))
  }

  function aplicarPreset(p: (typeof PRESETS)[number]) {
    mudar(() => Object.fromEntries(p.dias.map((d) => [String(d), [{ ...p.faixa }]])))
  }

  function salvarJan() {
    setErroJan(null)
    setSalvoJan(false)
    const erro = validarJanela(janela)
    if (erro) { setErroJan(erro); return }
    startJan(async () => {
      const result = await salvarJanelaAgendamento(autoescola_id, janela, escola)
      if (!result.success) setErroJan(result.error ?? 'Erro ao salvar configurações.')
      else setSalvoJan(true)
    })
  }

  const resumo = janela.ativo ? resumoJanela(janela) : []
  const abertoAgora = janelaAbertaAgora(janela)
  const campoHora =
    'px-2 py-1.5 rounded-lg bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-2 focus:ring-[--p-accent]/30 disabled:opacity-50'

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <Lock className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[--p-text-1]">Travamentos</h1>
          <p className="text-sm text-[--p-text-3]">Regras que limitam o que o aluno pode fazer pelo app</p>
        </div>
      </div>

      {/* Reagendamento */}
      <div>
        <Card
          icone={Hourglass}
          cor="text-amber-400"
          titulo="Antecedência mínima para reagendar"
          descricao="O aluno só pode reagendar uma aula se ela ainda estiver a pelo menos este número de horas de distância."
        >
          <div className="flex items-center gap-3">
            <input
              id="reagendamento-horas"
              type="number"
              min={1}
              max={168}
              value={horas}
              onChange={(e) => { setSalvoReag(false); setHoras(Number(e.target.value)) }}
              disabled={pendenteReag || !podeEditar}
              className="w-24 px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-[--p-text-1] text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-[--p-accent]/30 focus:border-[--p-accent] disabled:opacity-50 transition"
            />
            <span className="text-sm text-[--p-text-2] font-medium">hora{horas !== 1 ? 's' : ''} de antecedência</span>
          </div>
          {horas >= 24 && (
            <p className="text-xs text-amber-400 mt-2">
              ⚠️ Com {horas}h, o aluno precisará reagendar com pelo menos {Math.round(horas / 24)} dia{horas >= 48 ? 's' : ''} de antecedência.
            </p>
          )}
          {podeEditar && <BotaoSalvar onClick={salvarReag} pendente={pendenteReag} salvo={salvoReag} erro={erroReag} texto="Salvar" />}
        </Card>
      </div>

      {/* Janela de agendamento */}
      <Card
        icone={CalendarClock}
        cor="text-sky-400"
        titulo="Horário para realizar agendamentos"
        descricao="Define em quais dias e horários o aluno pode usar o app para agendar ou reagendar aulas. Fora disso, ele vê que está fora do horário e deve falar com a autoescola."
        acao={<Interruptor ligado={janela.ativo} disabled={!podeEditar} label="Limitar horário de agendamento" onChange={(v) => { setSalvoJan(false); setErroJan(null); setJanela((j) => ({ ...j, ativo: v })) }} />}
      >
        {!janela.ativo ? (
          <p className="text-sm text-[--p-text-3]">Sem limite: o aluno pode agendar a qualquer dia e hora.</p>
        ) : (
          <div className="space-y-4">
            {podeEditar && (
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => aplicarPreset(p)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[--p-border] text-[--p-text-2] hover:text-[--p-accent] hover:bg-[--p-hover] transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            <div className="divide-y divide-[--p-border] border border-[--p-border] rounded-xl">
              {DIAS_SEMANA.map((d) => {
                const faixas = janela.dias[String(d.id)] ?? []
                const aberto = faixas.length > 0
                return (
                  <div key={d.id} className="flex flex-wrap items-start gap-x-4 gap-y-2 px-3 py-2.5">
                    <div className="flex items-center gap-3 w-40 pt-1">
                      <Interruptor
                        ligado={aberto}
                        disabled={!podeEditar}
                        label={`Liberar ${d.label}`}
                        onChange={(v) => mudar((dias) => ({ ...dias, [d.id]: v ? [{ ...FAIXA_PADRAO }] : [] }))}
                      />
                      <span className={`text-sm ${aberto ? 'font-medium text-[--p-text-1]' : 'text-[--p-text-3]'}`}>{d.label}</span>
                    </div>

                    <div className="flex-1 min-w-[220px] space-y-1.5">
                      {!aberto && <p className="text-xs text-[--p-text-3] pt-1.5">Fechado</p>}
                      {faixas.map((f, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="time" value={f.inicio} disabled={!podeEditar} aria-label={`${d.label}: início`}
                            onChange={(e) => mudar((dias) => ({ ...dias, [d.id]: faixas.map((x, j) => (j === i ? { ...x, inicio: e.target.value } : x)) }))}
                            className={campoHora}
                          />
                          <span className="text-xs text-[--p-text-3]">até</span>
                          <input
                            type="time" value={f.fim} disabled={!podeEditar} aria-label={`${d.label}: fim`}
                            onChange={(e) => mudar((dias) => ({ ...dias, [d.id]: faixas.map((x, j) => (j === i ? { ...x, fim: e.target.value } : x)) }))}
                            className={campoHora}
                          />
                          {podeEditar && faixas.length > 1 && (
                            <button
                              onClick={() => mudar((dias) => ({ ...dias, [d.id]: faixas.filter((_, j) => j !== i) }))}
                              className="p-1.5 rounded-lg text-[--p-text-3] hover:text-red-400 hover:bg-red-500/10" aria-label="Remover faixa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          {podeEditar && i === faixas.length - 1 && (
                            <button
                              onClick={() => mudar((dias) => ({ ...dias, [d.id]: [...faixas, { inicio: f.fim, fim: '23:59' }] }))}
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-[--p-accent] rounded-lg hover:bg-[--p-hover]" title="Adicionar outra faixa no mesmo dia"
                            >
                              <Plus className="w-3.5 h-3.5" /> faixa
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="rounded-xl bg-[--p-bg-input] border border-[--p-border] p-3 text-xs space-y-1">
              <p className="font-semibold text-[--p-text-2]">O aluno poderá agendar:</p>
              {resumo.length === 0 ? (
                <p className="text-amber-400">Nenhum dia liberado — ninguém conseguiria agendar.</p>
              ) : (
                resumo.map((l) => <p key={l} className="text-[--p-text-1]">{l}</p>)
              )}
              <p className="text-[--p-text-3] pt-1">
                Agora (horário de Brasília): {abertoAgora ? <span className="text-emerald-400 font-medium">dentro do horário</span> : <span className="text-red-400 font-medium">fora do horário</span>}.
                Vale só para o app do aluno; a equipe agenda pelo painel a qualquer hora.
              </p>
            </div>
          </div>
        )}

        {podeEditar && <BotaoSalvar onClick={salvarJan} pendente={pendenteJan} salvo={salvoJan} erro={erroJan} texto="Salvar travamento" />}
      </Card>
    </div>
  )
}
