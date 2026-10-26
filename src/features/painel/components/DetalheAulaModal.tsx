"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  Calendar,
  Clock,
  Car,
  CheckCircle2,
  Camera,
  PenLine,
} from "lucide-react";
import type { Agendamento } from "../types";
import { getLinhaDoTempoAula, type EventoAula } from "../actions/atividadeAluno";

interface Props {
  aula: Agendamento | null;
  autoescola_id: string;
  onClose: () => void;
}

function LinhaDoTempo({ aulaId, autoescola_id }: { aulaId: string; autoescola_id: string }) {
  const [eventos, setEventos] = useState<EventoAula[] | null>(null);

  useEffect(() => {
    let ativo = true;
    setEventos(null);
    getLinhaDoTempoAula(autoescola_id, aulaId).then((r) => {
      if (ativo) setEventos(r.success ? r.data : []);
    });
    return () => { ativo = false; };
  }, [aulaId, autoescola_id]);

  return (
    <div className="bg-[--p-bg-base] rounded-xl border border-[--p-border] p-4 space-y-3">
      <p className="text-[10px] font-bold text-[--p-text-3] uppercase tracking-wider">Linha do tempo</p>
      {!eventos ? (
        <p className="text-xs text-[--p-text-3]">Carregando…</p>
      ) : eventos.length === 0 ? (
        <p className="text-xs text-[--p-text-3]">Sem registros.</p>
      ) : (
        <ol className="space-y-3 border-l border-[--p-border] ml-1.5">
          {eventos.map((e) => (
            <li key={e.id} className="pl-4 relative">
              <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#0ea5e9]" />
              <p className="text-sm font-semibold text-[--p-text-1]">{e.titulo}</p>
              {e.detalhe && <p className="text-xs text-[--p-text-2]">{e.detalhe}</p>}
              <p className="text-[11px] text-[--p-text-3]">
                {new Date(e.quando).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                {e.autor ? ` · ${e.autor}` : ""}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  scheduled: { label: "Agendado", className: "bg-blue-500/10 text-blue-400" },
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

export function DetalheAulaModal({ aula, autoescola_id, onClose }: Props) {
  if (!aula) return null;

  const statusCfg = STATUS_CONFIG[aula.status] ?? STATUS_CONFIG.scheduled;
  const categoriaLabel = aula.instructorCategory ?? "—";

  return (
    <AnimatePresence>
      {aula && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 flex items-start justify-center z-50 p-3 overflow-y-auto"
          >
            <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] w-full max-w-lg shadow-2xl my-auto">
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[--p-border]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[--p-text-1] text-base">
                      Detalhe da Aula
                    </h3>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusCfg.className}`}
                    >
                      {statusCfg.label}
                    </span>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-[--p-text-3] hover:text-[--p-text-1] transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-5">
                {/* Dados da aula */}
                <div className="bg-[--p-bg-base] rounded-xl border border-[--p-border] p-4 space-y-3">
                  <p className="text-[10px] font-bold text-[--p-text-3] uppercase tracking-wider">
                    Dados da Aula
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="col-span-2 flex items-center gap-2">
                      <User className="w-4 h-4 text-purple-400 shrink-0" />
                      <div>
                        <p className="text-[10px] text-[--p-text-3]">Aluno</p>
                        <p className="font-semibold text-[--p-text-1] uppercase">
                          {aula.student_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                      <div>
                        <p className="text-[10px] text-[--p-text-3]">Data</p>
                        <p className="text-[--p-text-2]">
                          {aula.date.split("-").reverse().join("/")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                      <div>
                        <p className="text-[10px] text-[--p-text-3]">Horário</p>
                        <p className="text-[--p-text-2]">{aula.time_slot}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div>
                        <p className="text-[10px] text-[--p-text-3]">
                          Categoria
                        </p>
                        <p className="text-[--p-text-2]">{categoriaLabel}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-[10px] text-[--p-text-3]">
                          Instrutor
                        </p>
                        <p className="text-[--p-text-2]">
                          {aula.instructor_name ?? "—"}
                        </p>
                      </div>
                    </div>
                    {(aula.cpf_cnh ?? aula.student_document) && (
                      <div className="col-span-2">
                        <p className="text-[10px] text-[--p-text-3]">CPF/CNH</p>
                        <p className="font-mono text-[--p-text-2]">
                          {aula.cpf_cnh ?? aula.student_document}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <LinhaDoTempo aulaId={aula.id} autoescola_id={autoescola_id} />

                {/* Foto */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Camera className="w-4 h-4 text-blue-400" />
                    <p className="text-sm font-semibold text-[--p-text-1]">
                      Foto do Instrutor com Aluno
                    </p>
                  </div>
                  {aula.photo_url ? (
                    <a
                      href={aula.photo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={aula.photo_url}
                        alt="Foto da aula"
                        className="w-full max-h-52 object-cover rounded-xl border border-[--p-border] cursor-pointer hover:opacity-90 transition-opacity"
                      />
                    </a>
                  ) : (
                    <div className="flex items-center justify-center h-28 rounded-xl border border-dashed border-[--p-border] text-[--p-text-3] text-sm">
                      Sem foto registrada
                    </div>
                  )}
                </div>

                {/* Assinatura */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <PenLine className="w-4 h-4 text-indigo-400" />
                    <p className="text-sm font-semibold text-[--p-text-1]">
                      Assinatura do Aluno
                    </p>
                  </div>
                  {aula.signature_url ? (
                    <div className="rounded-xl border border-[--p-border] overflow-hidden bg-white p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={aula.signature_url}
                        alt="Assinatura do aluno"
                        className="w-full max-h-28 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-20 rounded-xl border border-dashed border-[--p-border] text-[--p-text-3] text-sm">
                      Sem assinatura registrada
                    </div>
                  )}
                </div>

                <button
                  onClick={onClose}
                  className="w-full py-2.5 text-sm font-semibold rounded-xl border border-[--p-border] text-[--p-text-2] hover:bg-[--p-hover] transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
