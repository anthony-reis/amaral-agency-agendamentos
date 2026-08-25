'use client'

import { useState, useTransition } from 'react'
import { Award, Search, MessageCircle, ThumbsUp, ThumbsDown, Clock3 } from 'lucide-react'
import { listarResultadosExame, type ResultadoExameRow, type ResultadoFiltro } from '../actions/resultadosExame'
import type { Categoria } from '@/features/admin/actions/categorias'

interface Props {
  autoescolaId: string
  categorias: Categoria[]
  resultadosIniciais: ResultadoExameRow[]
}

const RESULTADO_OPCOES: { value: ResultadoFiltro; label: string }[] = [
  { value: 'TODOS', label: 'Todos os resultados' },
  { value: 'aprovado', label: 'Aprovados' },
  { value: 'reprovado', label: 'Reprovados' },
  { value: 'pendente', label: 'Ainda não marcado' },
]

function fmtData(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function ResultadosExame({ autoescolaId, categorias, resultadosIniciais }: Props) {
  const [itens, setItens] = useState<ResultadoExameRow[]>(resultadosIniciais)
  const [isPending, startTransition] = useTransition()

  const [resultado, setResultado] = useState<ResultadoFiltro>('TODOS')
  const [categoria, setCategoria] = useState('')
  const [aluno, setAluno] = useState('')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')

  function aplicarFiltro(parcial: Partial<{ resultado: ResultadoFiltro; categoria: string; aluno: string; dateStart: string; dateEnd: string }>) {
    const novo = { resultado, categoria, aluno, dateStart, dateEnd, ...parcial }
    setResultado(novo.resultado)
    setCategoria(novo.categoria)
    setAluno(novo.aluno)
    setDateStart(novo.dateStart)
    setDateEnd(novo.dateEnd)
    startTransition(async () => {
      const dados = await listarResultadosExame(autoescolaId, {
        resultado: novo.resultado,
        categoria: novo.categoria || undefined,
        aluno: novo.aluno || undefined,
        dateStart: novo.dateStart || undefined,
        dateEnd: novo.dateEnd || undefined,
      })
      setItens(dados)
    })
  }

  const aprovados = itens.filter((i) => i.resultado_exame === 'aprovado').length
  const reprovados = itens.filter((i) => i.resultado_exame === 'reprovado').length

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Award className="w-5 h-5 text-[--p-accent]" />
        <div>
          <h1 className="text-xl font-bold text-[--p-text-1]">Aprovados/Reprovados</h1>
          <p className="text-sm text-[--p-text-3]">
            {itens.length} banca{itens.length !== 1 ? 's' : ''} · {aprovados} aprovado{aprovados !== 1 ? 's' : ''} · {reprovados} reprovado{reprovados !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <p className="text-xs text-[--p-text-3] bg-[--p-bg-card] border border-[--p-border] rounded-xl px-4 py-3">
        Use isso pra tentar revenda: aluno <span className="text-emerald-500 font-semibold">aprovado</span> é oportunidade de vender a próxima categoria;
        aluno <span className="text-red-500 font-semibold">reprovado</span> é oportunidade de vender mais aulas pra tentar de novo.
      </p>

      {/* Filtros */}
      <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-[--p-text-3] mb-1">Resultado</label>
          <select
            value={resultado}
            onChange={(e) => aplicarFiltro({ resultado: e.target.value as ResultadoFiltro })}
            className="px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1]"
          >
            {RESULTADO_OPCOES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        {categorias.length > 0 && (
          <div>
            <label className="block text-xs text-[--p-text-3] mb-1">Categoria</label>
            <select
              value={categoria}
              onChange={(e) => aplicarFiltro({ categoria: e.target.value })}
              className="px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1]"
            >
              <option value="">Todas</option>
              {categorias.map((c) => <option key={c.codigo} value={c.codigo}>{c.nome}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs text-[--p-text-3] mb-1">De</label>
          <input type="date" value={dateStart} onChange={(e) => aplicarFiltro({ dateStart: e.target.value })} className="px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1]" />
        </div>
        <div>
          <label className="block text-xs text-[--p-text-3] mb-1">Até</label>
          <input type="date" value={dateEnd} onChange={(e) => aplicarFiltro({ dateEnd: e.target.value })} className="px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1]" />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-[--p-text-3] mb-1">Aluno</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[--p-text-3] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Nome ou documento"
              value={aluno}
              onChange={(e) => aplicarFiltro({ aluno: e.target.value })}
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] placeholder:text-[--p-text-3]"
            />
          </div>
        </div>
        {isPending && <span className="text-xs text-[--p-text-3] animate-pulse pb-2">Atualizando...</span>}
      </div>

      {/* Lista */}
      {itens.length === 0 ? (
        <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] px-6 py-16 text-center text-[--p-text-3] text-sm">
          Nenhum resultado de exame encontrado com esses filtros.
        </div>
      ) : (
        <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-[--p-bg-base]">
                <tr className="border-b border-[--p-border]">
                  <th className="text-left text-xs font-semibold text-[--p-text-3] uppercase px-5 py-3">Aluno</th>
                  <th className="text-left text-xs font-semibold text-[--p-text-3] uppercase px-4 py-3">Categoria</th>
                  <th className="text-left text-xs font-semibold text-[--p-text-3] uppercase px-4 py-3">Data</th>
                  <th className="text-left text-xs font-semibold text-[--p-text-3] uppercase px-4 py-3">Instrutor</th>
                  <th className="text-left text-xs font-semibold text-[--p-text-3] uppercase px-4 py-3">Resultado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[--p-border]">
                {itens.map((r) => (
                  <tr key={r.id} className="hover:bg-[--p-hover] transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-[--p-text-1]">{r.student_name}</p>
                      {r.student_document && <p className="text-xs text-[--p-text-3]">{r.student_document}</p>}
                    </td>
                    <td className="px-4 py-3 text-[--p-text-2]">{r.categoria ?? '—'}</td>
                    <td className="px-4 py-3 text-[--p-text-3] whitespace-nowrap">{fmtData(r.date)} · {r.time_slot?.substring(0, 5)}</td>
                    <td className="px-4 py-3 text-[--p-text-2]">{r.instructor_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      {r.resultado_exame === 'aprovado' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500">
                          <ThumbsUp className="w-3 h-3" /> Aprovado
                        </span>
                      ) : r.resultado_exame === 'reprovado' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-md bg-red-500/10 text-red-500">
                          <ThumbsDown className="w-3 h-3" /> Reprovado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-md bg-[--p-bg-input] text-[--p-text-3]">
                          <Clock3 className="w-3 h-3" /> {r.status === 'completed' ? 'Não marcado' : 'Pendente'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.student_phone && (
                        <a
                          href={`https://wa.me/55${r.student_phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Falar no WhatsApp"
                          className="inline-flex p-1.5 rounded-lg text-[--p-text-3] hover:text-emerald-500 hover:bg-emerald-500/5 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
