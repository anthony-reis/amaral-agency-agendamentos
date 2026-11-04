'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { ESTILO_AVISO } from '@/components/NotificacaoCelular'
import type { TipoAviso } from '@/lib/tiposAviso'

export interface NotificacaoItem {
  id: string
  tipo: TipoAviso
  titulo: string
  mensagem: string
  created_at: string
}

const DIA = 86400_000

function grupo(iso: string): string {
  const d = new Date(iso)
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const diff = hoje.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  if (diff <= 0) return 'Hoje'
  if (diff <= DIA) return 'Ontem'
  return 'Anteriores'
}

function hora(iso: string, grupoNome: string): string {
  const d = new Date(iso)
  const h = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return grupoNome === 'Anteriores' ? `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} · ${h}` : h
}

/** Histórico dos últimos 30 dias. Os dados vêm de uma server action que identifica o dono pela sessão. */
export function ListaNotificacoes({ inicial, buscar }: { inicial: NotificacaoItem[]; buscar: () => Promise<NotificacaoItem[]> }) {
  const [itens, setItens] = useState(inicial)

  const recarregar = useCallback(async () => {
    try { setItens(await buscar()) } catch {}
  }, [buscar])

  // Atualiza ao voltar para a aba/app (o banner em tempo real fica no layout)
  useEffect(() => {
    const aoVoltar = () => { if (document.visibilityState === 'visible') void recarregar() }
    document.addEventListener('visibilitychange', aoVoltar)
    window.addEventListener('focus', aoVoltar)
    return () => {
      document.removeEventListener('visibilitychange', aoVoltar)
      window.removeEventListener('focus', aoVoltar)
    }
  }, [recarregar])

  if (itens.length === 0) {
    return (
      <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-10 text-center">
        <BellOff className="w-10 h-10 text-[--p-text-3] mx-auto mb-3 opacity-30" />
        <p className="text-sm text-[--p-text-3]">Nenhuma notificação recente.</p>
      </div>
    )
  }

  const ordem = ['Hoje', 'Ontem', 'Anteriores']
  const porGrupo = new Map<string, NotificacaoItem[]>()
  for (const i of itens) {
    const g = grupo(i.created_at)
    porGrupo.set(g, [...(porGrupo.get(g) ?? []), i])
  }

  return (
    <div className="space-y-5">
      {ordem.filter((g) => porGrupo.has(g)).map((g) => (
        <section key={g}>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[--p-text-3] mb-2 px-1">{g}</h2>
          <div className="space-y-2">
            {porGrupo.get(g)!.map((i) => {
              const { Icon, cor } = ESTILO_AVISO[i.tipo] ?? { Icon: Bell, cor: 'bg-sky-500/15 text-sky-400' }
              return (
                <div key={i.id} className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-3 flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cor}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-[--p-text-1] leading-snug">{i.titulo}</p>
                      <span className="text-[10px] text-[--p-text-3] shrink-0 mt-0.5">{hora(i.created_at, g)}</span>
                    </div>
                    <p className="text-[13px] text-[--p-text-2] leading-snug break-words">{i.mensagem}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
      <p className="text-[11px] text-[--p-text-3] text-center">As notificações ficam guardadas por 30 dias.</p>
    </div>
  )
}
