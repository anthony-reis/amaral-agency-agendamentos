'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const DEBOUNCE_MS = 800

/**
 * Use no máximo uma vez por tabela em cada página (um canal por tabela).
 * Escuta o canal de avisos (Realtime Broadcast, enviado por
 * trigger no banco — ver migration `realtime_avisos`). O aviso não carrega
 * dados: ao receber, chame a server action para buscar o estado atual.
 * Rajadas (ex.: agendamento em massa) viram uma única chamada.
 */
export function useAvisoRealtime(
  /** Quem escuta: `autoescola:<id>` (painel/instrutor) ou `aluno:<id>` (só o que é do aluno). */
  escopo: string,
  tabela: 'agendamentos' | 'solicitacoes',
  onAviso: () => void,
  ativo = true
) {
  const onAvisoRef = useRef(onAviso)
  useEffect(() => {
    onAvisoRef.current = onAviso
  }, [onAviso])

  useEffect(() => {
    if (!ativo || !escopo) return

    const supabase = createClient()
    let timer: ReturnType<typeof setTimeout> | null = null

    const channel = supabase
      .channel(`${escopo}:${tabela}`)
      .on('broadcast', { event: 'mudou' }, () => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => onAvisoRef.current(), DEBOUNCE_MS)
      })
      .subscribe()

    return () => {
      if (timer) clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [escopo, tabela, ativo])
}
