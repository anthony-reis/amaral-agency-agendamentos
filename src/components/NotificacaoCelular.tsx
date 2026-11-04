'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlarmClock, Ban, BadgeCheck, Bell, CalendarCheck, CalendarClock, CalendarX2, Coins, FileSignature, FileText, UserX } from 'lucide-react'
import type { TipoAviso } from '@/lib/tiposAviso'

export interface ItemNotificacao {
  id: string
  tipo: TipoAviso
  titulo: string
  mensagem: string
}

export const DURACAO_NOTIFICACAO_MS = 6000

const VERDE = 'bg-emerald-500/15 text-emerald-400'
const VERMELHO = 'bg-red-500/15 text-red-400'
const AMBAR = 'bg-amber-500/15 text-amber-400'
const AZUL = 'bg-sky-500/15 text-sky-400'

const ESTILO: Record<TipoAviso, { Icon: typeof Bell; cor: string }> = {
  aula_agendada: { Icon: CalendarCheck, cor: VERDE },
  aula_cancelada: { Icon: CalendarX2, cor: VERMELHO },
  aula_remarcada: { Icon: CalendarClock, cor: AMBAR },
  falta: { Icon: UserX, cor: VERMELHO },
  solicitacao: { Icon: FileText, cor: AZUL },
  pagamento: { Icon: BadgeCheck, cor: VERDE },
  credito: { Icon: Coins, cor: VERDE },
  contrato: { Icon: FileSignature, cor: AMBAR },
  lembrete_dia: { Icon: Bell, cor: AZUL },
  lembrete_hora: { Icon: AlarmClock, cor: AMBAR },
  horario_bloqueado: { Icon: Ban, cor: VERMELHO },
}

function Cartao({ item, onFechar }: { item: ItemNotificacao; onFechar: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onFechar(item.id), DURACAO_NOTIFICACAO_MS)
    return () => clearTimeout(t)
  }, [item.id, onFechar])

  const { Icon, cor } = ESTILO[item.tipo] ?? { Icon: Bell, cor: AZUL }
  return (
    <motion.button
      type="button"
      layout
      initial={{ y: -90, opacity: 0, scale: 0.96 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -90, opacity: 0, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      onClick={() => onFechar(item.id)}
      aria-label={`${item.titulo}. Toque para fechar`}
      className="pointer-events-auto w-full text-left rounded-[22px] border border-white/10 bg-[--p-bg-card]/95 backdrop-blur-xl shadow-2xl shadow-black/40 p-3 flex items-start gap-3"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cor}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[--p-text-3]">AmaralPro</span>
          <span className="text-[10px] text-[--p-text-3]">agora</span>
        </div>
        <p className="text-sm font-bold text-[--p-text-1] leading-snug">{item.titulo}</p>
        <p className="text-[13px] text-[--p-text-2] leading-snug break-words">{item.mensagem}</p>
      </div>
    </motion.button>
  )
}

/** Banner no estilo notificação de celular: desce do topo, some sozinho em 6 s, toque fecha. */
export function NotificacaoCelular({ itens, onFechar }: { itens: ItemNotificacao[]; onFechar: (id: string) => void }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col gap-2 px-3 sm:items-center"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      role="status"
      aria-live="polite"
    >
      <div className="w-full sm:max-w-sm flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {itens.slice(-3).map((i) => (
            <Cartao key={i.id} item={i} onFechar={onFechar} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
