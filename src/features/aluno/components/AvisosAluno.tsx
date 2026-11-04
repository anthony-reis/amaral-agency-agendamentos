'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { NotificacaoCelular, type ItemNotificacao } from '@/components/NotificacaoCelular'
import { useAvisoRealtime } from '@/lib/useAvisoRealtime'
import { buscarMeusAvisos, marcarAvisosComoLidos, type AvisoAluno } from '@/features/aluno/actions/avisos'

/** Aulas desmarcadas/remarcadas pela escola, como notificação de celular (6 s), em tempo real. */
export function AvisosAluno({ avisos, escola, studentId }: { avisos: AvisoAluno[]; escola: string; studentId: string }) {
  const [fila, setFila] = useState<ItemNotificacao[]>([])
  const vistos = useRef(new Set<string>())

  const mostrar = useCallback((novos: AvisoAluno[]) => {
    const inedidos = novos.filter((a) => !vistos.current.has(a.id))
    if (inedidos.length === 0) return
    inedidos.forEach((a) => vistos.current.add(a.id))
    setFila((f) => [...f, ...inedidos.map((a) => ({ id: a.id, tipo: a.tipo, titulo: a.titulo, mensagem: a.mensagem }))])
    // já foi exibido: não repete no próximo acesso
    void marcarAvisosComoLidos(inedidos.map((a) => a.id), escola)
  }, [escola])

  useEffect(() => { mostrar(avisos) }, [avisos, mostrar])

  // Realtime: o banco só avisa que chegou algo; a busca traz o dado fresco
  useAvisoRealtime(`aluno:${studentId}`, 'agendamentos', async () => mostrar(await buscarMeusAvisos()))

  const fechar = useCallback((id: string) => setFila((f) => f.filter((i) => i.id !== id)), [])
  return <NotificacaoCelular itens={fila} onFechar={fechar} />
}
