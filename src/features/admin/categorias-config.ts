export const CODIGOS_VALIDOS = ['A', 'B', 'C', 'D', 'E'] as const
export type CodigoCNH = typeof CODIGOS_VALIDOS[number]

export const CATEGORIAS_DEFAULT: Record<CodigoCNH, string> = {
  A: 'Moto',
  B: 'Carro',
  C: 'Caminhão',
  D: 'Ônibus',
  E: 'Carreta',
}
