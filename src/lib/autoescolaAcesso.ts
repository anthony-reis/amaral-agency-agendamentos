/**
 * Uma autoescola é acessível (aluno, painel, instrutor) quando está ativa.
 * Autoescolas de teste (is_teste) também ficam acessíveis em trial, mas
 * "suspended" bloqueia sempre — suspender é o jeito de tirar qualquer
 * autoescola do ar, inclusive a de homolog.
 */
export function autoescolaAcessivel<T extends { status: string; is_teste: boolean | null }>(
  autoescola: T | null | undefined
): autoescola is T {
  if (!autoescola || autoescola.status === 'suspended') return false
  return autoescola.status === 'active' || autoescola.is_teste === true
}
