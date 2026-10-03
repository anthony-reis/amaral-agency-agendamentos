/**
 * Cookie de sessão do painel assinado com HMAC-SHA256.
 *
 * Antes o cookie era JSON puro: qualquer pessoa podia editá-lo pelas
 * ferramentas do navegador e trocar role/autoescola. Agora o valor é
 * "v1.<payload base64url>.<assinatura base64url>" e só é aceito se a
 * assinatura bater.
 *
 * Usa Web Crypto (crypto.subtle) para funcionar também no middleware (Edge).
 * Chave: PAINEL_SESSION_SECRET, ou derivada da SUPABASE_SERVICE_ROLE_KEY
 * (sempre presente no servidor) — assim o deploy não exige env nova.
 */

const PREFIXO = 'v1'

function segredo(): string {
  const s = process.env.PAINEL_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) throw new Error('PAINEL_SESSION_SECRET/SUPABASE_SERVICE_ROLE_KEY não configurada.')
  return `painel-session:${s}`
}

let chaveCache: { segredo: string; chave: Promise<CryptoKey> } | null = null

function chave(): Promise<CryptoKey> {
  const s = segredo()
  if (!chaveCache || chaveCache.segredo !== s) {
    chaveCache = {
      segredo: s,
      chave: crypto.subtle.importKey('raw', new TextEncoder().encode(s), { name: 'HMAC', hash: 'SHA-256' }, false, [
        'sign',
        'verify',
      ]),
    }
  }
  return chaveCache.chave
}

function paraBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function deBase64Url(texto: string): Uint8Array<ArrayBuffer> {
  const b64 = texto.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((texto.length + 3) % 4)
  const bin = atob(b64)
  const out = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export async function assinarSessaoPainel(sessao: object): Promise<string> {
  const payload = paraBase64Url(new TextEncoder().encode(JSON.stringify(sessao)))
  const assinatura = await crypto.subtle.sign('HMAC', await chave(), new TextEncoder().encode(`${PREFIXO}.${payload}`))
  return `${PREFIXO}.${payload}.${paraBase64Url(new Uint8Array(assinatura))}`
}

/** Devolve o objeto da sessão se a assinatura for válida; senão null. */
export async function lerSessaoPainelToken<T>(token: string | undefined | null): Promise<T | null> {
  if (!token) return null
  const partes = token.split('.')
  if (partes.length !== 3 || partes[0] !== PREFIXO) return null
  try {
    const ok = await crypto.subtle.verify(
      'HMAC',
      await chave(),
      deBase64Url(partes[2]),
      new TextEncoder().encode(`${PREFIXO}.${partes[1]}`)
    )
    if (!ok) return null
    return JSON.parse(new TextDecoder().decode(deBase64Url(partes[1]))) as T
  } catch {
    return null
  }
}
