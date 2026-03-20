import { listarClientes } from '@/features/admin/actions/clientes'
import { ClientesList } from '@/features/admin/components/ClientesList'

export const dynamic = 'force-dynamic'

export default async function ClientesPage() {
  const clientes = await listarClientes()
  return <ClientesList clientes={clientes} />
}
