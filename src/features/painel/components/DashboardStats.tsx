"use client";

import { useState, useTransition, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart2,
  Trophy,
  TrendingUp,
  CalendarClock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Filter,
  Route,
  X,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
} from "lucide-react";
import type { AgendamentoStats, InstrutorDesempenho } from "../types";
import type { KmStats } from "../actions/agendamentos";
import { InconsistenciasKmModal } from "./InconsistenciasKmModal";

interface Props {
  stats: AgendamentoStats;
  desempenho: InstrutorDesempenho[];
  instrutores: string[];
  dateStart: string;
  dateEnd: string;
  escola: string;
  autoescola_id: string;
  kmStats?: KmStats;
  registrarKm?: boolean;
  userRole: string;
}

const MEDAL = ["🥇", "🥈", "🥉"];

type SortCol =
  | "instructor_name"
  | "concluidas"
  | "agendadas"
  | "canceladas"
  | "taxa"
  | "km_total"
  | "km_medio";

interface MergedRow {
  instructor_name: string;
  categoria: string | null;
  concluidas: number;
  agendadas: number;
  canceladas: number;
  taxa: number;
  km_total: number | null;
  km_medio: number | null;
}

function formatDateBR(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export function DashboardStats({
  stats,
  desempenho,
  instrutores,
  dateStart: initStart,
  dateEnd: initEnd,
  escola,
  autoescola_id,
  kmStats: initKmStats,
  registrarKm = false,
  userRole,
}: Props) {
  const [dateStart, setDateStart] = useState(initStart);
  const [dateEnd, setDateEnd] = useState(initEnd);
  const [instructor, setInstructor] = useState("TODOS");
  const [category, setCategory] = useState("TODAS");
  const [data, setData] = useState({ stats, desempenho, kmStats: initKmStats });
  const [appliedRange, setAppliedRange] = useState({ start: initStart, end: initEnd });
  const [isPending, startTransition] = useTransition();
  const [inconsistenciasOpen, setInconsistenciasOpen] = useState(false);
  const [sortCol, setSortCol] = useState<SortCol>("concluidas");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  async function fetchWith(f: { dateStart: string; dateEnd: string; instructor: string; category: string }) {
    const params = new URLSearchParams(f);
    const res = await fetch(`/${escola}/painel/dashboard/api?${params}`);
    if (res.ok) {
      const json = await res.json();
      setData(json);
      setAppliedRange({ start: f.dateStart, end: f.dateEnd });
    }
  }

  function applyFilter() {
    startTransition(() => fetchWith({ dateStart, dateEnd, instructor, category }));
  }

  function clearFilters() {
    setInstructor("TODOS");
    setCategory("TODAS");
    setDateStart(initStart);
    setDateEnd(initEnd);
    startTransition(() =>
      fetchWith({ dateStart: initStart, dateEnd: initEnd, instructor: "TODOS", category: "TODAS" })
    );
  }

  const km = data.kmStats;

  const hasActiveFilters =
    instructor !== "TODOS" ||
    category !== "TODAS" ||
    dateStart !== initStart ||
    dateEnd !== initEnd;

  const attendanceDenom = data.stats.concluidas + data.stats.desmarcadas + data.stats.faltas;
  const taxaComparecimento =
    attendanceDenom > 0 ? Math.round((data.stats.concluidas / attendanceDenom) * 100) : 0;
  const attendanceColor =
    taxaComparecimento >= 80 ? "bg-emerald-500" : taxaComparecimento >= 60 ? "bg-orange-500" : "bg-red-500";

  const mergedRows: MergedRow[] = useMemo(() => {
    const kmMap = new Map((km?.por_instrutor ?? []).map((r) => [r.instructor_name, r]));
    return data.desempenho.map((d) => {
      const k = kmMap.get(d.instructor_name);
      return {
        instructor_name: d.instructor_name,
        categoria: d.categoria,
        concluidas: d.concluidas,
        agendadas: d.agendadas,
        canceladas: d.canceladas,
        taxa: d.taxa,
        km_total: k?.km_total ?? null,
        km_medio: k?.km_medio ?? null,
      };
    });
  }, [data.desempenho, km]);

  const sortedRows = useMemo(() => {
    const rows = [...mergedRows];
    rows.sort((a, b) => {
      let cmp: number;
      if (sortCol === "instructor_name") {
        cmp = a.instructor_name.localeCompare(b.instructor_name);
      } else {
        cmp = (a[sortCol] ?? 0) - (b[sortCol] ?? 0);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [mergedRows, sortCol, sortDir]);

  function handleSort(col: SortCol) {
    setSortDir(sortCol === col ? (sortDir === "asc" ? "desc" : "asc") : "desc");
    setSortCol(col);
  }

  const showMedals = sortCol === "concluidas" && sortDir === "desc";

  const columns: { key: SortCol; label: string; show: boolean }[] = [
    { key: "instructor_name", label: "Instrutor", show: true },
    { key: "concluidas", label: "Concluídas", show: true },
    { key: "agendadas", label: "Agendadas", show: true },
    { key: "canceladas", label: "Canceladas", show: true },
    { key: "taxa", label: "Taxa Conclusão", show: true },
    { key: "km_total", label: "KM Total", show: registrarKm },
    { key: "km_medio", label: "Média KM/Aula", show: registrarKm },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#0ea5e9]/10 flex items-center justify-center shrink-0">
          <BarChart2 className="w-5 h-5 text-[#0ea5e9]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[--p-text-1]">
            Dashboard de Aulas
          </h1>
          <p className="text-sm text-[--p-text-3]">
            Visão geral do negócio no período selecionado
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[--p-bg-card] rounded-2xl p-5 border border-[--p-border]">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-[--p-text-3]" />
          <span className="text-sm font-semibold text-[--p-text-1]">Filtros</span>
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
        <div className="mt-3 flex items-center justify-end gap-4">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              disabled={isPending}
              className="flex items-center gap-1 text-sm font-medium text-[--p-text-3] hover:text-red-400 transition-colors disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
              Limpar
            </button>
          )}
          <button
            onClick={applyFilter}
            disabled={isPending}
            className="px-4 py-2 bg-[#0ea5e9] text-white text-sm font-semibold rounded-xl hover:bg-[#0284c7] transition-colors disabled:opacity-50"
          >
            {isPending ? "Carregando…" : "Aplicar"}
          </button>
        </div>
      </div>

      {/* KPIs do período */}
      <div className={`grid grid-cols-2 lg:grid-cols-3 ${registrarKm ? "xl:grid-cols-6" : "xl:grid-cols-5"} gap-4`}>
        <StatCard
          label="Aulas Concluídas"
          value={data.stats.concluidas}
          color="bg-emerald-500"
          icon={<CheckCircle2 className="w-8 h-8 text-white/80" />}
        />
        <StatCard
          label="Aulas Agendadas"
          value={data.stats.agendadas}
          color="bg-[#0ea5e9]"
          icon={<CalendarClock className="w-8 h-8 text-white/80" />}
        />
        <StatCard
          label="Desmarcadas"
          value={data.stats.desmarcadas}
          color="bg-red-500"
          icon={<XCircle className="w-8 h-8 text-white/80" />}
        />
        <StatCard
          label="Faltas"
          value={data.stats.faltas}
          color="bg-orange-500"
          icon={<AlertTriangle className="w-8 h-8 text-white/80" />}
        />
        <StatCard
          label="Taxa de Comparecimento"
          value={`${taxaComparecimento}%`}
          color={attendanceColor}
          icon={<TrendingUp className="w-8 h-8 text-white/80" />}
        />
        {registrarKm && km && (
          <StatCard
            label="KM Rodado"
            value={`${km.km_total.toLocaleString("pt-BR")} km`}
            color="bg-violet-600"
            icon={<Route className="w-8 h-8 text-white/80" />}
          />
        )}
      </div>

      {/* Alerta de inconsistências de KM */}
      {registrarKm && km && km.inconsistencias > 0 && (
        <button
          type="button"
          onClick={() => setInconsistenciasOpen(true)}
          className="w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 transition-colors text-left"
        >
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-300 flex-1">
            <span className="font-semibold">{km.inconsistencias}</span>{" "}
            {km.inconsistencias === 1 ? "inconsistência de KM encontrada" : "inconsistências de KM encontradas"} —
            leituras de hodômetro que precisam de revisão
          </p>
          <span className="text-xs font-semibold text-red-300 underline shrink-0">Ver e resolver</span>
        </button>
      )}

      {/* Desempenho por Instrutor — concluídas, agendadas, canceladas, taxa e KM em uma única tabela */}
      <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[--p-border]">
          <Trophy className="w-4 h-4 text-[--p-text-3]" />
          <h2 className="text-sm font-semibold text-[--p-text-1]">
            Desempenho por Instrutor
          </h2>
        </div>

        {sortedRows.length === 0 ? (
          <div className="px-6 py-12 text-center text-[--p-text-3] text-sm">
            Nenhum dado para o período selecionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[--p-border]">
                  <th className="text-left text-xs font-semibold text-[--p-text-3] uppercase px-6 py-3">
                    Ranking
                  </th>
                  {columns.filter((c) => c.show).map((col) => {
                    const isName = col.key === "instructor_name";
                    return (
                      <th key={col.key} className={`px-4 py-3 ${isName ? "text-left" : "text-right"}`}>
                        <button
                          onClick={() => handleSort(col.key)}
                          className={`flex items-center gap-1 text-xs font-semibold uppercase transition-colors ${
                            isName ? "" : "ml-auto"
                          } ${sortCol === col.key ? "text-[#0ea5e9]" : "text-[--p-text-3] hover:text-[--p-text-1]"}`}
                        >
                          {col.label}
                          {sortCol === col.key ? (
                            sortDir === "asc" ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40" />
                          )}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-[--p-border]">
                {sortedRows.map((row, idx) => (
                  <motion.tr
                    key={row.instructor_name}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.04 }}
                    className="hover:bg-[--p-hover] transition-colors"
                  >
                    <td className="px-6 py-3.5 text-lg">
                      {showMedals && MEDAL[idx] ? (
                        MEDAL[idx]
                      ) : (
                        <span className="text-[--p-text-3] text-sm font-medium">#{idx + 1}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-[--p-text-1]">{row.instructor_name}</p>
                      <span
                        className={`inline-block mt-0.5 px-2 py-0.5 text-xs font-bold rounded-md ${
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
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 rounded-full"
                            style={{ width: `${row.taxa}%` }}
                          />
                        </div>
                        <span className="text-xs text-[--p-text-3] w-9 text-right">
                          {row.taxa}%
                        </span>
                      </div>
                    </td>
                    {registrarKm && (
                      <>
                        <td className="px-4 py-3.5 text-right font-bold text-violet-400">
                          {row.km_total != null ? `${row.km_total.toLocaleString("pt-BR")} km` : "—"}
                        </td>
                        <td className="px-4 py-3.5 text-right text-[--p-text-3]">
                          {row.km_medio != null ? `${row.km_medio} km` : "—"}
                        </td>
                      </>
                    )}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-6 py-3 border-t border-[--p-border] text-xs text-[--p-text-3] text-center">
          Exibindo dados de {formatDateBR(appliedRange.start)} até {formatDateBR(appliedRange.end)}
        </div>
      </div>

      {/* Modal de inconsistências de KM */}
      <InconsistenciasKmModal
        open={inconsistenciasOpen}
        onClose={() => setInconsistenciasOpen(false)}
        inconsistencias={km?.inconsistencias_detalhes ?? []}
        autoescola_id={autoescola_id}
        onResolved={applyFilter}
        userRole={userRole}
      />
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
      className={`${color} rounded-2xl p-5 flex items-center justify-between transition-transform duration-150 hover:-translate-y-0.5`}
    >
      <div>
        <p className="text-xs text-white/70 font-medium mb-1">{label}</p>
        <p className="text-3xl font-bold text-white/80">{value}</p>
      </div>
      {icon}
    </div>
  );
}
