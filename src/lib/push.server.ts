import 'server-only'

import webpush from 'web-push'
import { createServiceClient } from '@/lib/supabase/server'

export interface PayloadPush {
  titulo: string
  mensagem: string
  url: string
  tag?: string
}

let configurado = false
function configurar(): boolean {
  if (configurado) return true
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'mailto:contato@amaralpro.com.br', pub, priv)
  configurado = true
  return true
}

/** Envia a notificação para todos os aparelhos inscritos do aluno/instrutor. Nunca lança. */
export async function enviarPush(perfil: 'aluno' | 'instrutor', ownerId: string, payload: PayloadPush): Promise<number> {
  try {
    if (!configurar()) return 0
    const supabase = createServiceClient()
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('perfil', perfil)
      .eq('owner_id', ownerId)
    let enviados = 0
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 }
        )
        enviados++
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode
        // inscrição expirada/revogada: limpa
        if (status === 404 || status === 410) await supabase.from('push_subscriptions').delete().eq('id', s.id)
      }
    }
    return enviados
  } catch {
    return 0
  }
}
