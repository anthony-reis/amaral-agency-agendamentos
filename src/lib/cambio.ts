// Câmbio do carro. Client-safe; a leitura do banco fica em `cambio.server.ts`.
export type Cambio = 'MANUAL' | 'AUTOMATICO'

export const CAMBIOS: { value: Cambio; label: string }[] = [
  { value: 'MANUAL', label: 'Manual' },
  { value: 'AUTOMATICO', label: 'Automático' },
]

export function parseCambio(v: unknown): Cambio | null {
  return v === 'MANUAL' || v === 'AUTOMATICO' ? v : null
}

export function labelCambio(c: Cambio | null | undefined): string {
  return c === 'AUTOMATICO' ? 'Automático' : c === 'MANUAL' ? 'Manual' : '—'
}
