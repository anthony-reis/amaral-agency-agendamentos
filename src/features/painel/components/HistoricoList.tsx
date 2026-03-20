"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  History,
  Filter,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import type { Agendamento, AgendamentoStats } from "../types";
import { DetalheAulaModal } from "./DetalheAulaModal";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  scheduled: { label: "Agendado", className: "bg-[#0ea5e9]/10 text-[#0ea5e9]" },
  confirmed: {
    label: "Confirmado",
    className: "bg-purple-500/10 text-purple-300",
  },
  completed: {
    label: "Concluído",
    className: "bg-emerald-500/10 text-emerald-400",
  },
  cancelled: { label: "Desmarcado", className: "bg-red-500/10 text-red-400" },
  absent: { label: "Falta", className: "bg-orange-500/10 text-orange-400" },
};

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
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

const PAGE_SIZE = 30;

export function HistoricoList({
  agendamentos: initial,
  stats,
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
  const [totalCount, setTotalCount] = useState(initTotal);
  const [page, setPage] = useState(0);
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

  async function fetchPage(f: typeof filters, p: number) {
    const params = new URLSearchParams({
      autoescola_id,
      dateStart: f.dateStart,
      dateEnd: f.dateEnd,
      instructor: f.instructor,
      category: f.category,
      status: f.status,
      search: f.search,
      offset: String(p * PAGE_SIZE),
      limit: String(PAGE_SIZE),
    });
    const res = await fetch(`/${escola}/painel/historico/api?${params}`);
    if (res.ok) {
      const json = await res.json();
      setItems(json.data);
      setTotalCount(json.total);
      setPage(p);
    }
  }

  function applyFilters() {
    startTransition(() => {
      fetchPage(filters, 0);
    });
  }

  function handleExportCSV() {
    const header = "Data,Horário,Instrutor,Aluno,Documento,Status,Categoria";
    const rows = items.map((a) =>
      [
        a.date,
        a.time_slot,
        a.instructor_name,
        a.student_name,
        a.cpf_cnh ?? a.student_document ?? "",
        a.status,
        a.instructorCategory ?? "",
      ].join(","),
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `historico-${filters.dateStart}-${filters.dateEnd}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <History className="w-5 h-5 text-[#0ea5e9]" />
        <div>
          <h1 className="text-xl font-bold text-[--p-text-1]">
            Histórico de Atividades
          </h1>
          <p className="text-sm text-[--p-text-3]">
            Acompanhe todas as ações realizadas
          </p>
        </div>
      </div>

      {/* Stats chips */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: "Total",
            value: stats.total,
            cls: "text-[#0ea5e9] bg-[--p-hover]",
          },
          {
            label: "Agendadas",
            value: stats.agendadas,
            cls: "text-[#0ea5e9] bg-[#0ea5e9]/10",
          },
          {
            label: "Confirmadas",
            value: stats.confirmadas,
            cls: "text-purple-300 bg-purple-500/10",
          },
          {
            label: "Concluídas",
            value: stats.concluidas,
            cls: "text-emerald-400 bg-emerald-500/10",
          },
          {
            label: "Desmarcadas",
            value: stats.desmarcadas,
            cls: "text-red-400 bg-red-500/10",
          },
          {
            label: "Faltas",
            value: stats.faltas,
            cls: "text-orange-400 bg-orange-500/10",
          },
        ].map((chip) => (
          <div key={chip.label} className={`rounded-xl p-3 ${chip.cls}`}>
            <p className="text-xs opacity-70 mb-0.5">{chip.label}</p>
            <p className="text-2xl font-bold">{chip.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-[--p-bg-card] rounded-2xl p-5 border border-[--p-border] space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-4 h-4 text-[--p-text-3]" />
          <span className="text-sm font-medium text-slate-300">Filtros</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
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
          <div>
            <label className="block text-xs text-[--p-text-3] mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((p) => ({ ...p, status: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]/40"
            >
              <option value="TODOS">TODOS</option>
              <option value="scheduled">Agendado</option>
              <option value="confirmed">Confirmado</option>
              <option value="completed">Concluído</option>
              <option value="cancelled">Desmarcado</option>
              <option value="absent">Falta</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 text-sm text-[--p-text-3] hover:text-[--p-text-1] transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
          <button
            onClick={applyFilters}
            disabled={isPending}
            className="px-4 py-2 bg-[#0ea5e9] text-white text-sm font-semibold rounded-xl hover:bg-[#0284c7] disabled:opacity-50"
          >
            {isPending ? "Carregando…" : "Aplicar"}
          </button>
        </div>
      </div>

      {/* Feed */}
      {items.length === 0 ? (
        <div className="text-center py-16 bg-[--p-bg-card] rounded-2xl border border-[--p-border]">
          <History className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-[--p-text-3] font-medium">
            Nenhum registro encontrado
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((a, idx) => {
            const statusCfg =
              STATUS_CONFIG[a.status] ?? STATUS_CONFIG.scheduled;
            const initials = (a.instructor_name ?? "IN")
              .slice(0, 2)
              .toUpperCase();
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.02 }}
                onClick={() => a.status === 'completed' ? setAulaDetalhe(a) : undefined}
                className={`flex items-center gap-4 px-4 py-3.5 bg-[--p-bg-card] rounded-xl border border-[--p-border] hover:bg-[--p-hover] transition-colors ${a.status === 'completed' ? 'cursor-pointer' : ''}`}
              >
                <div className="w-9 h-9 rounded-full bg-[#0ea5e9]/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-[#0ea5e9]">
                    {initials}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[--p-text-1]">
                    <span className="font-semibold">
                      {a.instructor_name ?? "Instrutor"}
                    </span>{" "}
                    <span className="text-[--p-text-3]">
                      {a.status === "completed"
                        ? "concluiu"
                        : a.status === "cancelled"
                          ? "desmarcou"
                          : "agendou"}{" "}
                      uma aula de{" "}
                    </span>
                    <span
                      className={`font-semibold ${a.instructorCategory === "MOTO" ? "text-purple-300" : "text-[#0ea5e9]"}`}
                    >
                      {a.instructorCategory ?? "CARRO"}
                    </span>
                  </p>
                  <p className="text-xs text-[--p-text-3] mt-0.5 flex items-center gap-2">
                    <span>{a.student_name}</span>
                    <span>·</span>
                    <span>{formatDate(a.date)}</span>
                    <span>{a.time_slot}</span>
                    {(a.cpf_cnh || a.student_document) && (
                      <>
                        <span>·</span>
                        <span className="font-mono text-xs bg-[--p-hover] px-1.5 py-0.5 rounded">
                          CPF: {a.cpf_cnh ?? a.student_document}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusCfg.className}`}
                  >
                    {statusCfg.label}
                  </span>
                  <span className="text-xs text-slate-600">
                    {getRelativeTime(a.created_at)}
                  </span>
                  {a.status === 'completed' && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                      <Eye className="w-3 h-3" />
                      Ver detalhes
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[--p-text-3]">
            {page * PAGE_SIZE + 1}–
            {Math.min((page + 1) * PAGE_SIZE, totalCount)} de {totalCount}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() =>
                startTransition(() => fetchPage(filters, page - 1))
              }
              disabled={page === 0 || isPending}
              className="p-2 rounded-lg bg-[--p-hover] text-[--p-text-3] hover:text-[--p-text-1] disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() =>
                startTransition(() => fetchPage(filters, page + 1))
              }
              disabled={page >= totalPages - 1 || isPending}
              className="p-2 rounded-lg bg-[--p-hover] text-[--p-text-3] hover:text-[--p-text-1] disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <DetalheAulaModal aula={aulaDetalhe} onClose={() => setAulaDetalhe(null)} />
    </div>
  );
}
