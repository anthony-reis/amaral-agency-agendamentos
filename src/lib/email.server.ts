import 'server-only'

// Envio de e-mail transacional via Resend (API HTTP, sem dependência extra).
// Envs: RESEND_API_KEY e EMAIL_FROM (ex.: "AmaralPro <nao-responda@seudominio.com.br>",
// domínio verificado no Resend). Sem elas, emailConfigurado() = false e as
// telas escondem/avisam o envio em vez de quebrar.

export function emailConfigurado(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
}

export interface EmailInput {
  to: string
  subject: string
  html: string
  text: string
}

export async function enviarEmail(input: EmailInput): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!emailConfigurado()) return { ok: false, error: 'Envio de e-mail não configurado.' }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    })
    if (!res.ok) {
      console.error('[email] Resend respondeu', res.status, await res.text().catch(() => ''))
      return { ok: false, error: 'Não foi possível enviar o e-mail.' }
    }
    return { ok: true }
  } catch (err) {
    console.error('[email] falha no envio:', err)
    return { ok: false, error: 'Não foi possível enviar o e-mail.' }
  }
}

/** "anthony@gmail.com" → "an****@gmail.com" */
export function mascararEmail(email: string): string {
  const [user, domain] = email.split('@')
  if (!domain) return '***'
  const visivel = user.slice(0, Math.min(2, user.length))
  return `${visivel}${'*'.repeat(Math.max(user.length - visivel.length, 3))}@${domain}`
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}
