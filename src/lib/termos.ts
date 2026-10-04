// Termos de Uso / Política de Privacidade — tipos e helpers client-safe.
// Leitura do banco em `termos.server.ts`.

export interface TermosVersao {
  id: string
  autoescola_id: string
  versao: number
  termos_uso: string
  politica_privacidade: string
  publicado_por: string | null
  created_at: string
}

export interface TermosAceite {
  id: string
  student_id: string
  student_name: string
  student_document: string
  ip: string | null
  user_agent: string | null
  aceito_em: string
  versao: number
}

export type TipoDocumento = 'termos_uso' | 'politica_privacidade'

export const DOCUMENTOS: Record<TipoDocumento, { titulo: string; curto: string }> = {
  termos_uso: { titulo: 'Termos de Uso', curto: 'Termos' },
  politica_privacidade: { titulo: 'Política de Privacidade', curto: 'Privacidade' },
}

export function temConteudo(v: Pick<TermosVersao, 'termos_uso' | 'politica_privacidade'> | null): boolean {
  return Boolean(v && (v.termos_uso.trim() || v.politica_privacidade.trim()))
}

/** Documentos preenchidos da versão, na ordem de leitura. */
export function documentosDaVersao(v: Pick<TermosVersao, 'termos_uso' | 'politica_privacidade'>): TipoDocumento[] {
  return (['termos_uso', 'politica_privacidade'] as const).filter((k) => v[k].trim().length > 0)
}

/** Tempo estimado de leitura (~200 palavras/min). */
export function minutosDeLeitura(texto: string): number {
  const palavras = texto.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(palavras / 200))
}

// ─── Formatação simples (sem HTML) ──────────────────────────────────────────

export type BlocoTexto =
  | { tipo: 'h1' | 'h2' | 'p'; texto: string }
  | { tipo: 'ul' | 'ol'; itens: string[] }

/**
 * Converte o texto da autoescola em blocos:
 * "# Título", "## Subtítulo", "- item", "1. item", linha em branco separa
 * parágrafos. Negrito com **texto** é tratado na renderização.
 */
export function parseTermos(texto: string): BlocoTexto[] {
  const blocos: BlocoTexto[] = []
  let paragrafo: string[] = []
  let lista: { tipo: 'ul' | 'ol'; itens: string[] } | null = null

  const fecharParagrafo = () => {
    if (paragrafo.length) blocos.push({ tipo: 'p', texto: paragrafo.join(' ') })
    paragrafo = []
  }
  const fecharLista = () => {
    if (lista) blocos.push(lista)
    lista = null
  }

  for (const bruta of texto.replace(/\r\n/g, '\n').split('\n')) {
    const linha = bruta.trim()
    if (!linha) {
      fecharParagrafo()
      fecharLista()
      continue
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(linha)
    if (h) {
      fecharParagrafo()
      fecharLista()
      blocos.push({ tipo: h[1].length === 1 ? 'h1' : 'h2', texto: h[2] })
      continue
    }
    const ul = /^[-*•]\s+(.*)$/.exec(linha)
    const ol = /^\d+[.)]\s+(.*)$/.exec(linha)
    if (ul || ol) {
      fecharParagrafo()
      const tipo = ul ? 'ul' : 'ol'
      if (lista && lista.tipo !== tipo) fecharLista()
      if (!lista) lista = { tipo, itens: [] }
      lista.itens.push((ul ?? ol)![1])
      continue
    }
    fecharLista()
    paragrafo.push(linha)
  }
  fecharParagrafo()
  fecharLista()
  return blocos
}
