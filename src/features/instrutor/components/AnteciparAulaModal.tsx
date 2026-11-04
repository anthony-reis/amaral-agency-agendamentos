'use client'

import { useEffect, useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarClock, CheckCircle2, Loader2, MessageCircle, X } from 'lucide-react'
import { anteciparAula, listarHorariosParaAntecipar } from '../actions/minhasAulas'
import type { AulaInstrutor } from '../actions/minhasAulas'

interface Props {
  open: boolean
  escola: string
  aula: AulaInstrutor
  /** Telefone do aluno para o botão de WhatsApp; null quando a autoescola oculta o telefone. */
  telefone: string | null
  onSuccess: (novoHorario: string) => void
  onCancel: () => void
}

/** Escolhe um horário vago do próprio instrutor, antes da aula, no mesmo dia. */
export function AnteciparAulaModal({ open, escola, aula, telefone, onSuccess, onCancel }: Props) {
  const [horarios, setHorarios] = useState<string[] | null>(null)
  const [escolhido, setEscolhido] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [consultado, setConsultado] = useState(false)
  // Guarda o horário de antes: o card já troca aula.time_slot ao antecipar.
  const [concluido, setConcluido] = useState<{ de: string; para: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    let ativo = true
    setHorarios(null)
    setEscolhido(null)
    setErro('')
    setConsultado(false)
    setConcluido(null)
    listarHorariosParaAntecipar(escola, aula.id).then((r) => {
      if (!ativo) return
      if (r.success) setHorarios(r.data)
      else {
        setHorarios([])
        setErro(r.error)
      }
    })
    return () => {
      ativo = false
    }
  }, [open, escola, aula.id])

  function confirmar() {
    if (!escolhido) return
    setErro('')
    startTransition(async () => {
      const r = await anteciparAula(escola, aula.id, escolhido, consultado)
      if (!r.success) {
        setErro(r.error)
        // horário pode ter sido ocupado: recarrega as opções
        const nova = await listarHorariosParaAntecipar(escola, aula.id)
        if (nova.success) {
          setHorarios(nova.data)
          setEscolhido(null)
        }
        return
      }
      setConcluido({ de: aula.time_slot, para: escolhido })
      onSuccess(escolhido)
    })
  }

  // Consulta antes de antecipar: pergunta se o aluno consegue pegar o horário que surgiu.
  const primeiroNome = aula.student_name.split(' ')[0]
  const consultaHref =
    escolhido && telefone
      ? `https://wa.me/55${telefone.replace(/\D/g, '')}?text=${encodeURIComponent(
          `Olá, ${primeiroNome}! Surgiu um horário mais cedo: dá para antecipar sua aula do dia ${aula.date.split('-').reverse().slice(0, 2).join('/')} das ${aula.time_slot} para as ${escolhido}? Consegue?`
        )}`
      : null

  // Mensagem pronta para o instrutor avisar o aluno da mudança.
  const dataCurta = aula.date.split('-').reverse().slice(0, 2).join('/')
  const whatsappHref =
    concluido && telefone
      ? `https://wa.me/55${telefone.replace(/\D/g, '')}?text=${encodeURIComponent(
          `Olá, ${aula.student_name.split(' ')[0]}! Sua aula do dia ${dataCurta} foi antecipada: em vez das ${concluido.de}, será às ${concluido.para}.`
        )}`
      : null

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-40"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                    <CalendarClock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[--p-text-1]">Antecipar aula</h3>
                    <p className="text-xs text-[--p-text-3]">
                      {aula.student_name} · {aula.date.split('-').reverse().join('/')} às {aula.time_slot}
                    </p>
                  </div>
                </div>
                <button onClick={onCancel} className="text-[--p-text-3] hover:text-[--p-text-1]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {concluido ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-[--p-text-1]">
                      Aula antecipada: das <strong>{concluido.de}</strong> para as <strong>{concluido.para}</strong>.
                      O horário das {concluido.de} já está livre para novos agendamentos.
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                    Avise o aluno sobre a alteração!
                  </p>
                  {whatsappHref && (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Avisar {aula.student_name.split(' ')[0]} no WhatsApp
                    </a>
                  )}
                  <button
                    onClick={onCancel}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-[--p-text-2] bg-[--p-bg-input] hover:bg-[--p-hover]"
                  >
                    Fechar
                  </button>
                </div>
              ) : horarios === null ? (
                <div className="flex items-center justify-center py-6 text-[--p-text-3]">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : horarios.length === 0 ? (
                <p className="text-sm text-[--p-text-3] bg-[--p-bg-input] rounded-xl p-4 text-center">
                  Não há horário vago antes das {aula.time_slot} na sua agenda neste dia.
                </p>
              ) : (
                <>
                  <p className="text-xs text-[--p-text-3] mb-2">Escolha o novo horário (o das {aula.time_slot} ficará livre):</p>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {horarios.map((h) => (
                      <button
                        key={h}
                        onClick={() => { setEscolhido(h); setConsultado(false) }}
                        disabled={isPending}
                        className={`py-2 rounded-xl border text-sm font-semibold transition-colors ${
                          escolhido === h
                            ? 'bg-sky-500 border-sky-500 text-white'
                            : 'border-[--p-border] text-[--p-text-1] hover:border-sky-500/50'
                        }`}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                  {escolhido && (
                    <div className="mb-4 space-y-2.5 rounded-xl border border-[--p-border] p-3">
                      <p className="text-xs text-[--p-text-2]">
                        Antes de antecipar, pergunte ao aluno se ele consegue pegar o horário das {escolhido}.
                      </p>
                      {consultaHref ? (
                        <a
                          href={consultaHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center gap-2"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Consultar {primeiroNome} no WhatsApp
                        </a>
                      ) : (
                        <p className="text-xs text-[--p-text-3]">Telefone indisponível: consulte o aluno por outro meio.</p>
                      )}
                      <label className="flex items-start gap-2 text-xs font-medium text-[--p-text-1] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={consultado}
                          onChange={(e) => setConsultado(e.target.checked)}
                          disabled={isPending}
                          className="rounded mt-0.5"
                        />
                        Consultei o aluno e ele confirmou que pode pegar o horário das {escolhido}
                      </label>
                    </div>
                  )}
                </>
              )}

              {erro && <p className="text-xs text-red-400 mb-3">{erro}</p>}

              {!concluido && (
              <div className="flex gap-2">
                <button
                  onClick={onCancel}
                  disabled={isPending}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[--p-text-2] bg-[--p-bg-input] hover:bg-[--p-hover] disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmar}
                  disabled={isPending || !escolhido || !consultado}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-sky-500 hover:bg-sky-400 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Antecipar
                </button>
              </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
