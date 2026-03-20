"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { BarChart2, Trophy, TrendingUp, Calendar, Filter } from "lucide-react";
import type { AgendamentoStats, InstrutorDesempenho } from "../types";

interface Props {
  stats: AgendamentoStats;
  desempenho: InstrutorDesempenho[];
  instrutores: string[];
  dateStart: string;
  dateEnd: string;
  escola: string;
}

const MEDAL = ["🥇", "🥈", "🥉"];

export function DashboardStats({
  stats,
  desempenho,
  instrutores,
  dateStart: initStart,
  dateEnd: initEnd,
  escola,
}: Props) {
  const [dateStart, setDateStart] = useState(initStart);
  const [dateEnd, setDateEnd] = useState(initEnd);
  const [instructor, setInstructor] = useState("TODOS");
  const [category, setCategory] = useState("TODAS");
  const [data, setData] = useState({ stats, desempenho });
  const [isPending, startTransition] = useTransition();

  async function applyFilter() {
    startTransition(async () => {
      const params = new URLSearchParams({
        dateStart,
        dateEnd,
        instructor,
        category,
      });
      const res = await fetch(`/${escola}/painel/dashboard/api?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <BarChart2 className="w-6 h-6 text-[#0ea5e9]" />
        <div>
          <h1 className="text-xl font-bold text-[--p-text-1]">
            Dashboard de Aulas
          </h1>
          <p className="text-sm text-[--p-text-3]">
            Estatísticas e desempenho dos instrutores
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[--p-bg-card] rounded-2xl p-5 border border-[--p-border]">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-[--p-text-3]" />
          <span className="text-sm font-medium text-slate-300">Filtros</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-[--p-text-3] mb-1">
              Instrutor
            </label>
            <select
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]/40"
            >
              <option value="TODOS">Todos os Instrutores</option>
              {instrutores.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[--p-text-3] mb-1">
              Categoria
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]/40"
            >
              <option value="TODAS">TODAS</option>
              <option value="CARRO">CARRO</option>
              <option value="MOTO">MOTO</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-[--p-text-3] mb-1">
              Data Início
            </label>
            <input
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]/40"
            />
          </div>
          <div>
            <label className="block text-xs text-[--p-text-3] mb-1">
              Data Fim
            </label>
            <input
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]/40"
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            onClick={applyFilter}
            disabled={isPending}
            className="px-4 py-2 bg-[#0ea5e9] text-white text-sm font-semibold rounded-xl hover:bg-[#0284c7] transition-colors disabled:opacity-50"
          >
            {isPending ? "Carregando…" : "Aplicar"}
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total de Aulas Concluídas"
          value={data.stats.concluidas}
          color="bg-blue-500"
          icon={<Trophy className="w-8 h-8 text-white/80" />}
        />
        <StatCard
          label="Média por Instrutor"
          value={
            data.desempenho.length > 0
              ? (data.stats.concluidas / data.desempenho.length).toFixed(1)
              : "0"
          }
          color="bg-emerald-500"
          icon={<TrendingUp className="w-8 h-8 text-white/80" />}
        />
        <StatCard
          label="Aulas Agendadas"
          value={data.stats.agendadas}
          color="bg-orange-500"
          icon={<Calendar className="w-8 h-8 text-white/80" />}
        />
      </div>

      {/* Instructor performance table */}
      <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[--p-border]">
          <Trophy className="w-4 h-4 text-[--p-text-3]" />
          <h2 className="text-sm font-semibold text-[--p-text-1]">
            Desempenho por Instrutor
          </h2>
        </div>

        {data.desempenho.length === 0 ? (
          <div className="px-6 py-12 text-center text-[--p-text-3] text-sm">
            Nenhum dado para o período selecionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[--p-bg-card]">
                <tr className="border-b border-[--p-border]">
                  <th className="text-left text-xs font-semibold text-[--p-text-3] uppercase px-6 py-3">
                    Ranking
                  </th>
                  <th className="text-left text-xs font-semibold text-[--p-text-3] uppercase px-4 py-3">
                    Instrutor
                  </th>
                  <th className="text-left text-xs font-semibold text-[--p-text-3] uppercase px-4 py-3">
                    Categoria
                  </th>
                  <th className="text-right text-xs font-semibold text-[--p-text-3] uppercase px-4 py-3">
                    Concluídas
                  </th>
                  <th className="text-right text-xs font-semibold text-[--p-text-3] uppercase px-4 py-3">
                    Agendadas
                  </th>
                  <th className="text-right text-xs font-semibold text-[--p-text-3] uppercase px-4 py-3">
                    Canceladas
                  </th>
                  <th className="text-left text-xs font-semibold text-[--p-text-3] uppercase px-4 py-3">
                    Taxa Conclusão
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[--p-border]">
                {data.desempenho.map((row, idx) => (
                  <motion.tr
                    key={row.instructor_name}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.04 }}
                    className="hover:bg-[--p-hover] transition-colors"
                  >
                    <td className="px-6 py-3.5 text-lg">
                      {MEDAL[idx] ?? (
                        <span className="text-[--p-text-3] text-sm font-medium">
                          #{idx + 1}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-[--p-text-1]">
                      {row.instructor_name}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2 py-0.5 text-xs font-bold rounded-md ${
                          row.categoria === "CARRO"
                            ? "bg-blue-500/20 text-blue-300"
                            : "bg-purple-500/20 text-purple-300"
                        }`}
                      >
                        {row.categoria || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right text-emerald-400 font-semibold">
                      {row.concluidas}
                    </td>
                    <td className="px-4 py-3.5 text-right text-[#0ea5e9] font-semibold">
                      {row.agendadas}
                    </td>
                    <td className="px-4 py-3.5 text-right text-red-400 font-semibold">
                      {row.canceladas}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 rounded-full"
                            style={{ width: `${row.taxa}%` }}
                          />
                        </div>
                        <span className="text-xs text-[--p-text-3] w-8 text-right">
                          {row.taxa}%
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-6 py-3 border-t border-[--p-border] text-xs text-[--p-text-3] text-center">
          Exibindo dados de {initStart} até {initEnd}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className={`${color} rounded-2xl p-5 flex items-center justify-between`}
    >
      <div>
        <p className="text-xs text-white/70 font-medium mb-1">{label}</p>
        <p className="text-3xl font-bold text-white/80">{value}</p>
      </div>
      {icon}
    </div>
  );
}
