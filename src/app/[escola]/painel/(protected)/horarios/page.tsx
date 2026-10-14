import { redirect } from 'next/navigation'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { exigirArea, roleParaArea } from '@/lib/permissoes.server'
import { listarHorarios } from '@/features/painel/actions/horarios'
import { listarBloqueios } from '@/features/painel/actions/bloqueios'
import { listarInstrutores } from '@/features/painel/actions/instrutores'
import { HorariosGrid } from '@/features/painel/components/HorariosGrid'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function HorariosPage({ params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)
  await exigirArea('operacao')

  const [horarios, instrutores, bloqueios] = await Promise.all([
    listarHorarios(session.autoescola_id),
    listarInstrutores(session.autoescola_id),
    listarBloqueios(session.autoescola_id),
  ])

  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  const limitePassado = new Date(new Date(hoje + 'T12:00:00').getTime() - 60 * 86400000).toISOString().slice(0, 10)

  // Bloqueios ativos: semanais + pontuais dos últimos 60 dias em diante (weekdays pode vir como array ou string JSON)
  const bloqueiosAgenda = bloqueios
    .filter((b) => b.status === 'Bloqueado' && (b.date === 'RECORRENTE_DIA_SEMANA' || (/^\d{4}-\d{2}-\d{2}$/.test(b.date ?? '') && b.date >= limitePassado)))
    .map((b) => {
      let w: unknown = b.weekdays
      if (typeof w === 'string') { try { w = JSON.parse(w) } catch { w = [] } }
      const weekdays = Array.isArray(w) ? w.map(Number).filter((n) => n >= 1 && n <= 7) : []
      return {
        id: b.id,
        instructor: b.instructor && b.instructor.trim().toUpperCase() !== 'TODOS' ? b.instructor : null,
        vehicle_type: b.vehicle_type,
        time_slot: b.time_slot,
        weekdays,
        reason: b.reason,
        date: b.date === 'RECORRENTE_DIA_SEMANA' ? null : b.date,
      }
    })

  return (
    <HorariosGrid
      horarios={horarios}
      instrutores={instrutores.map((i) => ({ name: i.name, category: i.category }))}
      bloqueiosSemanais={bloqueiosAgenda}
      hoje={hoje}
      autoescola_id={session.autoescola_id}
      userRole={await roleParaArea('operacao')}
    />
  )
}
