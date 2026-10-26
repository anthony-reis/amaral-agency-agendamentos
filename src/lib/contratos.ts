// Contrato de prestação de serviço — tipos e helpers client-safe.
// Leitura/escrita no banco em `contratos.server.ts`.

export interface ContratoModelo {
  id: string
  autoescola_id: string
  versao: number
  titulo: string
  texto: string
  publicado_por: string | null
  created_at: string
}

export type ContratoStatus = 'pendente' | 'assinado' | 'cancelado'
export type ContratoOrigem = 'digital' | 'anexado'

export interface ContratoAluno {
  id: string
  autoescola_id: string
  student_id: string
  origem: ContratoOrigem
  status: ContratoStatus
  titulo: string
  texto: string | null
  texto_hash: string | null
  modelo_versao: number | null
  enviado_por: string | null
  created_at: string
  assinado_em: string | null
  ip: string | null
  user_agent: string | null
  foto_path: string | null
  assinatura_path: string | null
  anexo_id: string | null
  cancelado_em: string | null
  cancelado_por: string | null
}

/** Contrato + URLs temporárias das evidências/arquivo (bucket privado). */
export interface ContratoComUrls extends ContratoAluno {
  fotoUrl: string | null
  assinaturaUrl: string | null
  anexoUrl: string | null
  anexoNome: string | null
}

export const STATUS_CONTRATO_LABEL: Record<ContratoStatus, string> = {
  pendente: 'Aguardando assinatura',
  assinado: 'Assinado',
  cancelado: 'Cancelado',
}

/** Campos que a autoescola pode usar no texto: {{nome}}, {{documento}} … */
export const CAMPOS_CONTRATO = [
  { chave: 'nome', descricao: 'Nome completo do aluno' },
  { chave: 'documento', descricao: 'CPF/CNH do aluno' },
  { chave: 'telefone', descricao: 'Telefone do aluno' },
  { chave: 'email', descricao: 'E-mail do aluno' },
  { chave: 'data', descricao: 'Data do envio do contrato' },
  { chave: 'autoescola', descricao: 'Nome da autoescola' },
] as const

export type DadosContrato = Record<(typeof CAMPOS_CONTRATO)[number]['chave'], string>

/** Troca {{campo}} pelos dados do aluno; campo desconhecido fica como está. */
export function preencherContrato(texto: string, dados: DadosContrato): string {
  return texto.replace(/\{\{\s*(\w+)\s*\}\}/g, (inteiro, chave: string) =>
    chave in dados ? dados[chave as keyof DadosContrato] || '—' : inteiro
  )
}

/** Dados fictícios para a pré-visualização do modelo. */
export const DADOS_EXEMPLO: DadosContrato = {
  nome: 'Maria da Silva',
  documento: '123.456.789-09',
  telefone: '(38) 99999-0000',
  email: 'maria@exemplo.com',
  data: new Date().toLocaleDateString('pt-BR'),
  autoescola: 'Sua Autoescola',
}
