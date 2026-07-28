"use client";

import { useState, useTransition, useEffect, useRef, useMemo, Fragment } from "react";
import {
  History,
  Filter,
  Download,
  Search,
  Eye,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  CalendarClock,
  CircleDot,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  Car,
  Bike,
} from "lucide-react";
import { DetalheAulaModal } from "./DetalheAulaModal";
import type { Agendamento, AgendamentoStats } from "../types";

const STATUS_CONFIG: Record<
  string,
  { label: string; badge: string; bar: string; icon: typeof CircleDot }
> = {
  scheduled: {
    label: "Agendado",
    badge: "bg-[#0ea5e9]/10 text-[#0ea5e9]",
    bar: "bg-[#0ea5e9]",
    icon: CircleDot,
  },
  confirmed: {
    label: "Confirmado",
    badge: "bg-purple-500/10 text-purple-300",
    bar: "bg-purple-400",
    icon: CircleDot,
  },
  completed: {
    label: "Concluído",
    badge: "bg-emerald-500/10 text-emerald-400",
    bar: "bg-emerald-400",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Desmarcado",
    badge: "bg-red-500/10 text-red-400",
    bar: "bg-red-400",
    icon: XCircle,
  },
  absent: {
    label: "Falta",
    badge: "bg-orange-500/10 text-orange-400",
    bar: "bg-orange-400",
    icon: AlertTriangle,
  },
};

const WEEKDAY_FMT = new Intl.DateTimeFormat("pt-BR", { weekday: "long" });
const DAY_FMT = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" });

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function formatGroupHeader(d: string) {
  const date = new Date(`${d}T12:00:00`);
  const weekday = WEEKDAY_FMT.format(date);
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${DAY_FMT.format(date)}`;
}

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffH = Math.round((now.getTime() - then.getTime()) / 3600000);
  if (diffH < 1) return "Agora";
  if (diffH < 24) return `Há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Há 1 dia";
  return `Há ${diffD} dias`;
}

interface Props {
  agendamentos: Agendamento[];
  stats: AgendamentoStats;
  instrutores: string[];
  total: number;
  escola: string;
  autoescola_id: string;
}

const PAGE_SIZE = 50;

type ChipKey =
  | "TODOS"
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "absent";

type SortColumn =
  | "date"
  | "time_slot"
  | "student_name"
  | "instructor_name"
  | "instructorCategory"
  | "status";

const SORT_LABELS: { key: SortColumn; label: string; align?: "right" }[] = [
  { key: "date", label: "Data" },
  { key: "time_slot", label: "Horário" },
  { key: "student_name", label: "Aluno" },
  { key: "instructor_name", label: "Instrutor" },
  { key: "instructorCategory", label: "Categoria" },
  { key: "status", label: "Status" },
];

export function HistoricoList({
  agendamentos: initial,
  stats: initialStats,
  instrutores,
  total: initTotal,
  escola,
  autoescola_id,
}: Props) {
  const today = new Date().toISOString().split("T")[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000)
    .toISOString()
    .split("T")[0];

  const [items, setItems] = useState<Agendamento[]>(initial);
  const [stats, setStats] = useState<AgendamentoStats>(initialStats);
  const [totalCount, setTotalCount] = useState(initTotal);
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ by: SortColumn; dir: "asc" | "desc" }>({
    by: "date",
    dir: "desc",
  });
  const [isPending, startTransition] = useTransition();
  const [aulaDetalhe, setAulaDetalhe] = useState<Agendamento | null>(null);

  const [filters, setFilters] = useState({
    dateStart: monthAgo,
    dateEnd: today,
    instructor: "TODOS",
    category: "TODAS",
    status: "TODOS",
    search: "",
  });

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  const isFirstSort = useRef(true);

  async function fetchData(f: typeof filters, p: number, s: typeof sort) {
    const params = new URLSearchParams({
      autoescola_id,
      dateStart: f.dateStart,
      dateEnd: f.dateEnd,
      instructor: f.instructor,
      category: f.category,
      status: f.status,
      search: f.search,
      sortBy: s.by,
      sortDir: s.dir,
      offset: String(p * PAGE_SIZE),
      limit: String(PAGE_SIZE),
    });
    const res = await fetch(`/${escola}/painel/historico/api?${params}`);
    if (res.ok) {
      const json = await res.json();
      setItems(json.data);
      setTotalCount(json.total);
      setStats(json.stats);
      setPage(p);
    }
  }

  // Auto-apply on filter changes (except search which is debounced) — sempre volta para a página 1
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    startTransition(() => {
      fetchData(filters, 0, sort);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.dateStart,
    filters.dateEnd,
    filters.instructor,
    filters.category,
    filters.status,
  ]);

  // Debounce search
  useEffect(() => {
    if (isFirstRender.current) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      startTransition(() => {
        fetchData(filters, 0, sort);
      });
    }, 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);

  // Reaplica ao mudar a ordenação — também volta para a página 1
  useEffect(() => {
    if (isFirstSort.current) {
      isFirstSort.current = false;
      return;
    }
    startTransition(() => {
      fetchData(filters, 0, sort);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort.by, sort.dir]);

  function handleChipClick(status: ChipKey) {
    setFilters((p) => ({ ...p, status: p.status === status ? "TODOS" : status }));
  }

  function handleSort(column: SortColumn) {
    setSort((prev) => {
      if (prev.by === column) {
        return { by: column, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return { by: column, dir: column === "date" ? "desc" : "asc" };
    });
  }

  function clearFilters() {
    setFilters({
      dateStart: monthAgo,
      dateEnd: today,
      instructor: "TODOS",
      category: "TODAS",
      status: "TODOS",
      search: "",
    });
  }

  const hasActiveFilters =
    filters.instructor !== "TODOS" ||
    filters.category !== "TODAS" ||
    filters.status !== "TODOS" ||
    filters.search !== "" ||
    filters.dateStart !== monthAgo ||
    filters.dateEnd !== today;

  function handleExportCSV() {
    const header =
      '"Data","Horário","Instrutor","Aluno","Documento","Status","Categoria","KM Inicial","KM Final","KM Rodado"';
    const escape = (v: string | null | undefined) =>
      `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = items.map((a) =>
      [
        escape(a.date),
        escape(a.time_slot),
        escape(a.instructor_name),
        escape(a.student_name),
        escape(a.cpf_cnh ?? a.student_document ?? ""),
        escape(a.status),
        escape(a.instructorCategory ?? ""),
        escape(a.km_inicial != null ? String(a.km_inicial) : ""),
        escape(a.km_final != null ? String(a.km_final) : ""),
        escape(a.km_rodado != null ? String(a.km_rodado) : ""),
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `historico-${filters.dateStart}-${filters.dateEnd}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const chips: {
    key: ChipKey;
    label: string;
    value: number;
    solid: string;
    icon: typeof History;
  }[] = [
    { key: "TODOS", label: "Total", value: stats.total, solid: "bg-slate-600", icon: History },
    { key: "scheduled", label: "Agendadas", value: stats.agendadas, solid: "bg-[#0ea5e9]", icon: CalendarClock },
    { key: "completed", label: "Concluídas", value: stats.concluidas, solid: "bg-emerald-500", icon: CheckCircle2 },
    { key: "cancelled", label: "Desmarcadas", value: stats.desmarcadas, solid: "bg-red-500", icon: XCircle },
    { key: "absent", label: "Faltas", value: stats.faltas, solid: "bg-orange-500", icon: AlertTriangle },
  ];

  const isGroupedByDate = sort.by === "date";
  const columnCount = SORT_LABELS.length + 1 - (isGroupedByDate ? 1 : 0);

  const groups = useMemo(() => {
    if (!isGroupedByDate) return null;
    const map = new Map<string, Agendamento[]>();
    for (const a of items) {
      const bucket = map.get(a.date);
      if (bucket) bucket.push(a);
      else map.set(a.date, [a]);
    }
    return Array.from(map.entries());
  }, [items, isGroupedByDate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#0ea5e9]/10 flex items-center justify-center shrink-0">
          <History className="w-5 h-5 text-[#0ea5e9]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[--p-text-1]">
            Histórico de Atividades
          </h1>
          <p className="text-sm text-[--p-text-3]">
            Acompanhe todas as aulas agendadas, concluídas e desmarcadas
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[--p-bg-card] rounded-2xl p-5 border border-[--p-border] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[--p-text-3]" />
            <span className="text-sm font-semibold text-[--p-text-1]">Filtros</span>
          </div>
          {isPending && (
            <div className="flex items-center gap-1.5 text-xs text-[--p-text-3]">
              <div className="w-3 h-3 border-2 border-[#0ea5e9] border-t-transparent rounded-full animate-spin" />
              Carregando…
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="col-span-2 lg:col-span-1">
            <label className="block text-xs text-[--p-text-3] mb-1">
              Buscar Aluno
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[--p-text-3]" />
              <input
                type="text"
                placeholder="Nome ou CPF..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, search: e.target.value }))
                }
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]/40"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[--p-text-3] mb-1">
              Data Início
            </label>
            <input
              type="date"
              value={filters.dateStart}
              onChange={(e) =>
                setFilters((p) => ({ ...p, dateStart: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]/40"
            />
          </div>
          <div>
            <label className="block text-xs text-[--p-text-3] mb-1">
              Data Fim
            </label>
            <input
              type="date"
              value={filters.dateEnd}
              onChange={(e) =>
                setFilters((p) => ({ ...p, dateEnd: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]/40"
            />
          </div>
          <div>
            <label className="block text-xs text-[--p-text-3] mb-1">
              Instrutor
            </label>
            <select
              value={filters.instructor}
              onChange={(e) =>
                setFilters((p) => ({ ...p, instructor: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]/40"
            >
              <option value="TODOS">TODOS</option>
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
              value={filters.category}
              onChange={(e) =>
                setFilters((p) => ({ ...p, category: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]/40"
            >
              <option value="TODAS">TODAS</option>
              <option value="CARRO">CARRO</option>
              <option value="MOTO">MOTO</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-[--p-border]">
          <span className="text-xs text-[--p-text-3] pt-3">
            {formatDate(filters.dateStart)} até {formatDate(filters.dateEnd)}
          </span>
          <div className="flex items-center gap-4 pt-3">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm font-medium text-[--p-text-3] hover:text-red-400 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Limpar
              </button>
            )}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 text-sm text-[--p-text-3] hover:text-[#0ea5e9] transition-colors"
            >
              <Download className="w-4 h-4" />
              Exportar CSV ({items.length})
            </button>
          </div>
        </div>
      </div>

      {/* Stats cards — clique para filtrar por status */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {chips.map((chip) => {
          const active = filters.status === chip.key;
          const Icon = chip.icon;
          return (
            <button
              key={chip.key}
              onClick={() => handleChipClick(chip.key)}
              className={`relative text-left rounded-2xl p-4 ${chip.solid} transition-all duration-150 ${
                active
                  ? "ring-2 ring-white/70 ring-offset-2 ring-offset-[--p-bg-base] shadow-lg -translate-y-0.5"
                  : "opacity-90 hover:opacity-100 hover:-translate-y-0.5"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-white/70 font-medium mb-1">{chip.label}</p>
                  <p className="text-2xl font-bold text-white">{chip.value}</p>
                </div>
                <Icon className="w-6 h-6 text-white/60" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Tabela */}
      {items.length === 0 ? (
        <div className="text-center py-16 bg-[--p-bg-card] rounded-2xl border border-[--p-border]">
          <History className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-[--p-text-3] font-medium">
            Nenhum registro encontrado
          </p>
          <p className="text-xs text-[--p-text-3]/70 mt-1">
            Tente ajustar o período ou limpar os filtros
          </p>
        </div>
      ) : (
        <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[--p-border]">
                  {SORT_LABELS.map((col) => {
                    if (isGroupedByDate && col.key === "date") return null;
                    const active = sort.by === col.key;
                    return (
                      <th key={col.key} className="text-left px-4 py-3">
                        <button
                          onClick={() => handleSort(col.key)}
                          className={`flex items-center gap-1 text-xs font-semibold uppercase transition-colors ${
                            active ? "text-[#0ea5e9]" : "text-[--p-text-3] hover:text-[--p-text-1]"
                          }`}
                        >
                          {col.label}
                          {active ? (
                            sort.dir === "asc" ? (
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
                  <th className="text-right text-xs font-semibold text-[--p-text-3] uppercase px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[--p-border]">
                {(groups ?? [[null, items] as [string | null, Agendamento[]]]).map(([date, rowItems]) => (
                  <Fragment key={date ?? "flat"}>
                    {date && (
                      <tr>
                        <td colSpan={columnCount} className="px-4 py-2 bg-[--p-hover]">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-semibold text-[--p-text-1] capitalize">
                              {formatGroupHeader(date)}
                            </span>
                            <span className="text-xs text-[--p-text-3]">
                              {rowItems.length} aula{rowItems.length === 1 ? "" : "s"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {rowItems.map((a) => {
                      const statusCfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.scheduled;
                      const StatusIcon = statusCfg.icon;
                      const CategoryIcon = a.instructorCategory === "MOTO" ? Bike : Car;
                      const isConflito = a.cancel_reason?.startsWith("Conflito resolvido");
                      const clickable = a.status === "completed";
                      return (
                        <tr
                          key={a.id}
                          onClick={() => (clickable ? setAulaDetalhe(a) : undefined)}
                          className={`group relative hover:bg-[--p-hover] transition-colors ${clickable ? "cursor-pointer" : ""}`}
                        >
                          {!isGroupedByDate && (
                            <td className="px-4 py-3 relative">
                              <span className={`absolute left-0 top-0 bottom-0 w-1 ${statusCfg.bar}`} />
                              <span className="font-medium text-[--p-text-1]">{formatDate(a.date)}</span>
                            </td>
                          )}
                          <td className="px-4 py-3 relative">
                            {isGroupedByDate && (
                              <span className={`absolute left-0 top-0 bottom-0 w-1 ${statusCfg.bar}`} />
                            )}
                            <span className="font-medium text-[--p-text-1]">{a.time_slot}</span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-[--p-text-1]">{a.student_name}</p>
                            {(a.cpf_cnh || a.student_document) && (
                              <p className="font-mono text-[11px] text-[--p-text-3]">
                                {a.cpf_cnh ?? a.student_document}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[--p-text-2]">
                            {a.instructor_name ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-md ${
                                a.instructorCategory === "MOTO"
                                  ? "bg-purple-500/10 text-purple-300"
                                  : "bg-[#0ea5e9]/10 text-[#0ea5e9]"
                              }`}
                            >
                              <CategoryIcon className="w-3 h-3" />
                              {a.instructorCategory ?? "CARRO"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${statusCfg.badge}`}
                              title={
                                isConflito
                                  ? "Conflito resolvido automaticamente"
                                  : a.status === "cancelled" && a.cancel_reason
                                    ? a.cancel_reason
                                    : undefined
                              }
                            >
                              <StatusIcon className="w-3 h-3" />
                              {statusCfg.label}
                              {a.status === "cancelled" && a.cancel_reason && (
                                <ShieldAlert className="w-3 h-3 text-red-400" />
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {clickable && (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Eye className="w-3.5 h-3.5" />
                                Ver detalhes
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-[--p-border]">
            <p className="text-sm text-[--p-text-3]">
              {totalCount === 0 ? 0 : page * PAGE_SIZE + 1}–
              {Math.min((page + 1) * PAGE_SIZE, totalCount)} de {totalCount}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => startTransition(() => fetchData(filters, page - 1, sort))}
                disabled={page === 0 || isPending}
                className="p-2 rounded-lg bg-[--p-hover] text-[--p-text-3] hover:text-[--p-text-1] disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => startTransition(() => fetchData(filters, page + 1, sort))}
                disabled={(page + 1) * PAGE_SIZE >= totalCount || isPending}
                className="p-2 rounded-lg bg-[--p-hover] text-[--p-text-3] hover:text-[--p-text-1] disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <DetalheAulaModal aula={aulaDetalhe} onClose={() => setAulaDetalhe(null)} />
    </div>
  );
}
