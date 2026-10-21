// PostgREST devolve no máximo 1000 linhas por request: busca em páginas até acabar.
const PAGINA = 1000

export async function buscarTodos<T>(
  montar: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const todos: T[] = []
  for (let from = 0; ; from += PAGINA) {
    const { data, error } = await montar(from, from + PAGINA - 1)
    if (error) throw new Error('Erro ao buscar dados.')
    const lote = data ?? []
    todos.push(...lote)
    if (lote.length < PAGINA) break
  }
  return todos
}
