'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, Share, X } from 'lucide-react'
import { salvarInscricaoPush } from './actions'

const CHAVE_DISPENSA = 'amaralpro-push-dispensado'
const CHAVE_DESLIGADO = 'amaralpro-push-desligado'

function urlBase64ParaUint8(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

type Estado = 'oculto' | 'pedir' | 'instalar-ios' | 'bloqueado' | 'ativado' | 'erro'

/** Faixa discreta para ligar as notificações do aparelho (Chrome/Android e Safari/iPhone instalado). */
export function AtivarNotificacoes({ perfil, escola }: { perfil: 'aluno' | 'instrutor'; escola: string }) {
  const [estado, setEstado] = useState<Estado>('oculto')
  const [ocupado, setOcupado] = useState(false)
  const [detalheErro, setDetalheErro] = useState('')
  const pathname = usePathname()

  useEffect(() => {
    try { if (localStorage.getItem(CHAVE_DISPENSA) || localStorage.getItem(CHAVE_DESLIGADO)) return } catch {}
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const instalado = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
    // iPhone só recebe push com o app na tela de início
    if (ios && !instalado) { setEstado('instalar-ios'); return }
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return
    if (Notification.permission === 'denied') return
    if (Notification.permission === 'granted') {
      // já permitido: garante que este aparelho está inscrito (renovações silenciosas)
      void inscrever(true).catch(() => {})
      return // permitido: nunca volta a pedir, mesmo que a inscrição falhe agora
    }
    setEstado('pedir')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function inscrever(silencioso: boolean) {
    const reg = await navigator.serviceWorker.register('/sw.js')
    await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, rej) => setTimeout(() => rej(new Error('O navegador demorou para ativar o serviço de notificações.')), 10000)),
    ])
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ParaUint8(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })
    }
    const j = sub.toJSON()
    const r = await salvarInscricaoPush(
      perfil, escola,
      { endpoint: sub.endpoint, p256dh: j.keys?.p256dh ?? '', auth: j.keys?.auth ?? '' },
      navigator.userAgent
    )
    if (!r.ok) throw new Error('Não foi possível salvar este aparelho. Entre novamente e tente de novo.')
    void silencioso
  }

  async function ativar() {
    setOcupado(true)
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setEstado(perm === 'denied' ? 'bloqueado' : 'pedir'); return }
      await inscrever(false)
      setEstado('ativado')
      setTimeout(() => setEstado('oculto'), 3500)
    } catch (e) {
      // permissão já foi concedida: não adianta pedir de novo, mostra o motivo
      setDetalheErro(e instanceof Error ? e.message : 'Erro desconhecido.')
      setEstado(Notification.permission === 'granted' ? 'erro' : 'pedir')
    } finally {
      setOcupado(false)
    }
  }

  function dispensar() {
    try { localStorage.setItem(CHAVE_DISPENSA, '1') } catch {}
    setEstado('oculto')
  }

  // A aba Notificações já tem o cartão fixo de status
  if (estado === 'oculto' || pathname.endsWith('/notificacoes')) return null

  return (
    <div className="mx-auto max-w-2xl w-full px-4 pt-3">
      <div className="flex items-start gap-3 rounded-2xl border border-[--p-border] bg-[--p-bg-card] p-3">
        <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
          {estado === 'instalar-ios' ? <Share className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
        </div>
        <div className="min-w-0 flex-1">
          {estado === 'instalar-ios' ? (
            <>
              <p className="text-sm font-bold text-[--p-text-1]">Receba avisos no iPhone</p>
              <p className="text-xs text-[--p-text-2] mt-0.5">
                Toque em Compartilhar e em &ldquo;Adicionar à Tela de Início&rdquo;. Abra o app por lá para ativar as notificações.
              </p>
            </>
          ) : estado === 'ativado' ? (
            <p className="text-sm font-bold text-emerald-400">Notificações ativadas neste aparelho ✓</p>
          ) : estado === 'erro' ? (
            <>
              <p className="text-sm font-bold text-[--p-text-1]">Não consegui ativar</p>
              <p className="text-xs text-[--p-text-2] mt-0.5 break-words">{detalheErro}</p>
              <button
                type="button"
                onClick={ativar}
                disabled={ocupado}
                className="mt-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-500 hover:bg-sky-400 disabled:opacity-50"
              >
                {ocupado ? 'Tentando…' : 'Tentar de novo'}
              </button>
            </>
          ) : estado === 'bloqueado' ? (
            <>
              <p className="text-sm font-bold text-[--p-text-1]">Notificações bloqueadas</p>
              <p className="text-xs text-[--p-text-2] mt-0.5">Libere nas configurações do navegador para este site.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-[--p-text-1]">Ative as notificações</p>
              <p className="text-xs text-[--p-text-2] mt-0.5">Saiba de aulas marcadas, desmarcadas ou remarcadas mesmo com o app fechado.</p>
              <button
                type="button"
                onClick={ativar}
                disabled={ocupado}
                className="mt-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-500 hover:bg-sky-400 disabled:opacity-50"
              >
                {ocupado ? 'Ativando…' : 'Ativar notificações'}
              </button>
            </>
          )}
        </div>
        <button type="button" onClick={dispensar} aria-label="Dispensar" className="p-1 text-[--p-text-3] hover:text-[--p-text-1]">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
