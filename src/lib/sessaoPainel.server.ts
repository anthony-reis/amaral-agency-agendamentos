import 'server-only'

import { cookies } from 'next/headers'
import { lerSessaoPainelToken } from '@/lib/painelSessionToken'
import type { PainelSession } from '@/features/painel/types'

export const PAINEL_COOKIE = 'painel_session'

/** Sessão do cookie assinado (null se ausente, inválida ou adulterada). */
export async function lerSessaoPainelCookie(): Promise<PainelSession | null> {
  const cookieStore = await cookies()
  return lerSessaoPainelToken<PainelSession>(cookieStore.get(PAINEL_COOKIE)?.value)
}
