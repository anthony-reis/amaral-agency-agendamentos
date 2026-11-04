'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { NotificacaoCelular, type ItemNotificacao } from '@/components/NotificacaoCelular'
import { useAvisoRealtime } from '@/lib/useAvisoRealtime'
import { buscarMeusAvisosInstrutor, marcarAvisosInstrutorLidos } from '../actions/avisos'

/** Aulas agendadas, desmarcadas ou remarcadas, como notificação de celular (6 s), em tempo real. */
export function AvisosInstrutor({ escola, instructorId }: { escola: string; instructorId: string }) {
  const [fila, setFila] = useState<ItemNotificacao[]>([])
  const vistos = useRef(new Set<string>())

  const carregar = useCallback(async () => {
    const novos = (await buscarMeusAvisosInstrutor(escola)).filter((a) => !vistos.current.has(a.id))
    if (novos.length === 0) return
    novos.forEach((a) => vistos.current.add(a.id))
    setFila((f) => [...f, ...novos.map((a) => ({ id: a.id, tipo: a.tipo, titulo: a.titulo, mensagem: a.mensagem }))])
    void marcarAvisosInstrutorLidos(escola, novos.map((a) => a.id))
  }, [escola])

  useEffect(() => { void carregar() }, [carregar])
  useAvisoRealtime(`instrutor:${instructorId}`, 'avisos', carregar)

  const fechar = useCallback((id: string) => setFila((f) => f.filter((i) => i.id !== id)), [])
  return <NotificacaoCelular itens={fila} onFechar={fechar} />
}
