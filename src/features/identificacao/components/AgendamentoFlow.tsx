"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Car,
  Bike,
  AlertCircle,
  Clock,
  Info,
  User,
  CalendarDays,
  CalendarRange,
} from "lucide-react";
import {
  fetchDisponibilidade,
  criarAgendamento,
} from "@/features/aluno/actions/agendarAula";
import type { StudentCredits } from "@/features/identificacao/types";

interface Props {
  escola: string;
  autoescolaId: string;
  autoescolaNome: string;
  autoescolaLogoUrl: string | null;
  studentId: string;
  studentName: string;
  studentDocument: string;
  credits: StudentCredits;
}

const DIAS_SEMANA = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const DIAS_HEADER_MON = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function getToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

export function AgendamentoFlow({
  escola,
  autoescolaId,
  studentId,
  studentName,
  studentDocument,
  credits,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState(2);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Booking state
  const [date, setDate] = useState<Date | null>(null);
  const [category, setCategory] = useState<"CARRO" | "MOTO" | null>(null);
  const [instructor, setInstructor] = useState<{
    nome: string;
    aulasMinistradas: number;
    horarios: string[];
  } | null>(null);
  const [timeSlot, setTimeSlot] = useState<string | null>(null);
  const [availableInstructors, setAvailableInstructors] = useState<
    { nome: string; aulasMinistradas: number; horarios: string[] }[]
  >([]);

  // Calendar
  const [calMode, setCalMode] = useState<"week" | "month">("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const today = getToday();

  const weekDays = (): Date[] =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + weekOffset * 7 + i);
      return d;
    });

  const monthDays = (): (Date | null)[] => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const pad = firstDow === 0 ? 6 : firstDow - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result: (Date | null)[] = Array(pad).fill(null);
    for (let i = 1; i <= daysInMonth; i++)
      result.push(new Date(year, month, i));
    return result;
  };

  const canGoWeekPrev = weekOffset > 0;
  const canGoMonthPrev =
    calMonth.getFullYear() > today.getFullYear() ||
    calMonth.getMonth() > today.getMonth();

  const weekLabel = () => {
    const days = weekDays();
    const start = days[0];
    const end = days[6];
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()}–${end.getDate()} de ${start.toLocaleDateString("pt-BR", { month: "long" })}`;
    }
    return `${start.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – ${end.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`;
  };

  // Navigation
  const goBack = () => {
    setError(null);
    if (step === 2) {
      router.push(`/${escola}/aluno`);
      return;
    }
    setStep((s) => s - 1);
  };
  const goNext = () => setStep((s) => s + 1);

  // Step handlers
  const handleDateSelect = (d: Date) => {
    if (d < today) return;
    setDate(d);
    goNext();
  };

  const handleCategorySelect = (cat: "CARRO" | "MOTO") => {
    setCategory(cat);
    startTransition(async () => {
      try {
        const data = await fetchDisponibilidade(
          autoescolaId,
          dateStr(date!),
          cat,
        );
        setAvailableInstructors(data);
        goNext();
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Erro ao buscar disponibilidade",
        );
      }
    });
  };

  const handleInstructorSelect = (inst: {
    nome: string;
    aulasMinistradas: number;
    horarios: string[];
  }) => {
    setInstructor(inst);
    goNext();
  };

  const handleTimeSelect = (time: string) => {
    setTimeSlot(time);
    goNext();
  };

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        await criarAgendamento({
          autoescola_id: autoescolaId,
          date: dateStr(date!),
          timeSlot: timeSlot!,
          instructorName: instructor!.nome,
          category: category!,
          studentId,
          studentName,
          studentDocument,
        });
        setStep(7);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Erro ao confirmar agendamento",
        );
      }
    });
  };

  const stepLabels = [
    "Data",
    "Categoria",
    "Instrutor",
    "Horário",
    "Confirmação",
  ];

  const BackButton = ({ label = "Voltar" }: { label?: string }) => (
    <button
      onClick={goBack}
      className="flex items-center gap-1.5 text-sm text-[--p-text-3] hover:text-[--p-text-1] transition-colors mb-4"
    >
      <ChevronLeft className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <div className="flex flex-col min-h-full">
      {/* Progress dots */}
      {step <= 6 && (
        <div className="flex items-center justify-between px-4 py-3 bg-[--p-bg-card] border-b border-[--p-border]">
          <span className="text-xs font-semibold text-[--p-text-3] uppercase tracking-wide">
            {stepLabels[step - 2]}
          </span>
          <div className="flex items-center gap-1.5">
            {[2, 3, 4, 5, 6].map((s) => (
              <div
                key={s}
                className={`rounded-full transition-all duration-300 ${
                  s === step
                    ? "w-6 h-2 bg-[--p-accent]"
                    : s < step
                      ? "w-2 h-2 bg-[--p-accent]/50"
                      : "w-2 h-2 bg-[--p-border]"
                }`}
              />
            ))}
          </div>
          <div className="w-16" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col items-center pt-5 pb-4 px-4">
        <div className="w-full max-w-sm mx-auto">
          <AnimatePresence mode="wait">
            {/* STEP 2: DATA */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full"
              >
                <h2 className="text-lg font-bold text-[--p-text-1] text-center mb-4">
                  Escolha a data
                </h2>

                <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] overflow-hidden">
                  {/* Nav header */}
                  <div className="flex items-center justify-between px-3 py-3 border-b border-[--p-border]">
                    {calMode === "week" ? (
                      <>
                        <button
                          onClick={() => setWeekOffset((o) => o - 1)}
                          disabled={!canGoWeekPrev}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-[--p-bg-input] text-[--p-text-2] hover:bg-[--p-hover] disabled:opacity-25 transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-semibold text-[--p-text-1] capitalize">
                          {weekLabel()}
                        </span>
                        <button
                          onClick={() => setWeekOffset((o) => o + 1)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-[--p-bg-input] text-[--p-text-2] hover:bg-[--p-hover] transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() =>
                            setCalMonth(
                              (m) =>
                                new Date(m.getFullYear(), m.getMonth() - 1, 1),
                            )
                          }
                          disabled={!canGoMonthPrev}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-[--p-bg-input] text-[--p-text-2] hover:bg-[--p-hover] disabled:opacity-25 transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-[--p-text-1] capitalize">
                            {calMonth.toLocaleDateString("pt-BR", {
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                          <button
                            onClick={() => setCalMode("week")}
                            className="text-xs text-[--p-accent] hover:underline leading-none"
                          >
                            Ver semana
                          </button>
                        </div>
                        <button
                          onClick={() =>
                            setCalMonth(
                              (m) =>
                                new Date(m.getFullYear(), m.getMonth() + 1, 1),
                            )
                          }
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-[--p-bg-input] text-[--p-text-2] hover:bg-[--p-hover] transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Week grid */}
                  {calMode === "week" && (
                    <div className="p-3">
                      <div className="grid grid-cols-7 gap-1">
                        {weekDays().map((d, i) => {
                          const isPast = d < today;
                          const isToday = dateStr(d) === dateStr(today);
                          const isSelected = date
                            ? dateStr(d) === dateStr(date)
                            : false;
                          return (
                            <button
                              key={`week-${i}`}
                              disabled={isPast}
                              onClick={() => handleDateSelect(d)}
                              className={`flex flex-col items-center gap-0.5 py-2.5 rounded-xl transition-all text-xs ${
                                isPast
                                  ? "text-[--p-text-3] opacity-25 cursor-not-allowed"
                                  : isSelected
                                    ? "bg-[--p-accent] text-white font-bold shadow-sm"
                                    : isToday
                                      ? "bg-[--p-accent]/15 text-[--p-accent] font-bold ring-1 ring-[--p-accent]/40"
                                      : "text-[--p-text-2] hover:bg-[--p-hover]"
                              }`}
                            >
                              <span className="text-[9px] font-semibold opacity-70 uppercase">
                                {DIAS_SEMANA[d.getDay()]}
                              </span>
                              <span className="text-base font-bold leading-none">
                                {d.getDate()}
                              </span>
                              {isToday && !isSelected && (
                                <span className="w-1 h-1 rounded-full bg-[--p-accent]" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Month grid */}
                  {calMode === "month" && (
                    <div className="p-3">
                      <div className="grid grid-cols-7 gap-0.5 mb-1">
                        {DIAS_HEADER_MON.map((d) => (
                          <div
                            key={d}
                            className="text-center text-[9px] font-semibold text-[--p-text-3] uppercase py-1"
                          >
                            {d}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-0.5">
                        {monthDays().map((d, i) => {
                          if (!d) return <div key={`empty-${i}`} />;
                          const isPast = d < today;
                          const isToday = dateStr(d) === dateStr(today);
                          const isSelected = date
                            ? dateStr(d) === dateStr(date)
                            : false;
                          return (
                            <button
                              key={`month-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`}
                              disabled={isPast}
                              onClick={() => handleDateSelect(d)}
                              className={`aspect-square rounded-full flex items-center justify-center text-xs sm:text-sm transition-all ${
                                isPast
                                  ? "text-[--p-text-3] opacity-25 cursor-not-allowed"
                                  : isSelected
                                    ? "bg-[--p-accent] text-white font-bold"
                                    : isToday
                                      ? "bg-[--p-accent]/15 text-[--p-accent] font-bold ring-1 ring-[--p-accent]/40"
                                      : "text-[--p-text-2] hover:bg-[--p-hover]"
                              }`}
                            >
                              {d.getDate()}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* "Ver mais datas" button */}
                  {calMode === "week" && (
                    <button
                      onClick={() => {
                        const d = new Date(today);
                        d.setDate(today.getDate() + weekOffset * 7);
                        setCalMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                        setCalMode("month");
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 text-xs font-semibold text-[--p-accent] hover:bg-[--p-hover] border-t border-[--p-border] transition-colors"
                    >
                      <CalendarRange className="w-4 h-4" />
                      Ver mais datas
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* STEP 3: CATEGORIA */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full"
              >
                <BackButton />
                <h2 className="text-lg font-bold text-[--p-text-1] text-center mb-1">
                  Qual categoria?
                </h2>
                <p className="text-sm text-[--p-text-3] text-center mb-4">
                  {date?.toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                  })}
                </p>
                <div className="space-y-3">
                  {credits.aulas_cat_b > 0 && (
                    <button
                      onClick={() => handleCategorySelect("CARRO")}
                      disabled={isPending}
                      className="w-full bg-[--p-bg-card] border border-[--p-border] p-4 rounded-2xl flex items-center justify-between hover:border-[--p-accent]/40 hover:bg-[--p-hover] transition-all disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                          <Car className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-[--p-text-1]">Carro</p>
                          <p className="text-xs text-[--p-accent]">
                            {credits.aulas_cat_b} créditos
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[--p-text-3] shrink-0" />
                    </button>
                  )}
                  {credits.aulas_cat_a > 0 && (
                    <button
                      onClick={() => handleCategorySelect("MOTO")}
                      disabled={isPending}
                      className="w-full bg-[--p-bg-card] border border-[--p-border] p-4 rounded-2xl flex items-center justify-between hover:border-[--p-accent]/40 hover:bg-[--p-hover] transition-all disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <Bike className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-[--p-text-1]">Moto</p>
                          <p className="text-xs text-[--p-accent]">
                            {credits.aulas_cat_a} créditos
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[--p-text-3] shrink-0" />
                    </button>
                  )}
                  {isPending && (
                    <div className="flex items-center justify-center gap-2 py-4 text-[--p-text-3] text-sm">
                      <div className="w-4 h-4 border-2 border-[--p-accent] border-t-transparent rounded-full animate-spin" />
                      Verificando vagas...
                    </div>
                  )}
                  {error && (
                    <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* STEP 4: INSTRUTOR */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full"
              >
                <BackButton />
                <h2 className="text-lg font-bold text-[--p-text-1] text-center mb-1">
                  Escolha o Instrutor
                </h2>
                <p className="text-sm text-[--p-text-3] text-center mb-4">
                  {category === "CARRO" ? "Carro" : "Moto"} ·{" "}
                  {date?.toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  })}
                </p>
                {isPending ? (
                  <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-8 text-center">
                    <div className="w-7 h-7 border-2 border-[--p-accent] border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="mt-3 text-sm text-[--p-text-3]">
                      Buscando disponibilidade...
                    </p>
                  </div>
                ) : availableInstructors.length === 0 ? (
                  <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-6 text-center space-y-3">
                    <AlertCircle className="w-8 h-8 text-[--p-text-3] mx-auto" />
                    <p className="text-sm text-[--p-text-2]">
                      Sem instrutores disponíveis nesta data.
                    </p>
                    <button
                      onClick={goBack}
                      className="text-[--p-accent] font-semibold text-sm"
                    >
                      Escolher outra data
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {availableInstructors.map((inst, i) => (
                      <button
                        key={i}
                        onClick={() => handleInstructorSelect(inst)}
                        className="w-full bg-[--p-bg-card] border border-[--p-border] p-4 rounded-2xl flex items-center justify-between hover:border-[--p-accent]/40 hover:bg-[--p-hover] transition-all text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[--p-accent]/10 flex items-center justify-center shrink-0">
                            <User className="w-5 h-5 text-[--p-accent]" />
                          </div>
                          <div>
                            <p className="font-bold text-[--p-text-1] uppercase">
                              {inst.nome}
                            </p>
                            <p className="text-xs text-[--p-text-3]">
                              {inst.aulasMinistradas} aulas ministradas
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-[--p-accent] font-semibold bg-[--p-accent]/10 px-2 py-0.5 rounded-md">
                            {inst.horarios.length} vagas
                          </span>
                          <ChevronRight className="w-4 h-4 text-[--p-text-3]" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 5: HORÁRIO */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full"
              >
                <BackButton />
                <h2 className="text-lg font-bold text-[--p-text-1] text-center mb-1">
                  Escolha o horário
                </h2>
                <p className="text-sm text-[--p-text-3] text-center mb-4">
                  {instructor?.nome} ·{" "}
                  {date?.toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  })}
                </p>
                <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-4">
                  <div className="grid grid-cols-3 gap-2">
                    {instructor?.horarios.map((time, i) => (
                      <button
                        key={`time-${i}-${time}`}
                        onClick={() => handleTimeSelect(time)}
                        className="py-3 rounded-xl border border-[--p-border] bg-[--p-bg-input] text-[--p-text-1] font-medium text-sm hover:border-[--p-accent] hover:bg-[--p-accent]/10 hover:text-[--p-accent] transition-all flex items-center justify-center gap-1"
                      >
                        <Clock className="w-3 h-3 opacity-50" />
                        {time.substring(0, 5)}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 6: CONFIRMAÇÃO */}
            {step === 6 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full"
              >
                <BackButton />
                <div className="text-center mb-4">
                  <div className="w-11 h-11 bg-[--p-accent]/10 rounded-2xl flex items-center justify-center mx-auto mb-2.5 border border-[--p-accent]/20">
                    <CalendarDays className="w-5 h-5 text-[--p-accent]" />
                  </div>
                  <h2 className="text-lg font-bold text-[--p-text-1]">
                    Confirmar
                  </h2>
                  <p className="text-xs text-[--p-text-3]">
                    Revise antes de confirmar
                  </p>
                </div>
                <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl divide-y divide-[--p-border]">
                  {[
                    {
                      label: "Categoria",
                      value: category === "CARRO" ? "Carro" : "Moto",
                    },
                    {
                      label: "Instrutor",
                      value: instructor?.nome?.toUpperCase(),
                    },
                    {
                      label: "Data",
                      value: date?.toLocaleDateString("pt-BR", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                      }),
                    },
                    { label: "Horário", value: timeSlot?.substring(0, 5) },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <span className="text-xs font-semibold text-[--p-text-3] uppercase tracking-wide">
                        {label}
                      </span>
                      <span className="font-bold text-[--p-text-1] capitalize">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-3 bg-[--p-accent]/5 rounded-xl border border-[--p-accent]/15 flex items-start gap-2">
                  <Info className="w-4 h-4 text-[--p-accent] shrink-0 mt-0.5" />
                  <p className="text-xs text-[--p-text-2]">
                    1 crédito de {category === "CARRO" ? "Carro" : "Moto"} será
                    debitado ao confirmar.
                  </p>
                </div>
                {error && (
                  <div className="mt-3 flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}
                <button
                  onClick={handleConfirm}
                  disabled={isPending}
                  className="w-full mt-4 py-3.5 rounded-xl bg-[--p-accent] text-white font-semibold disabled:opacity-50 flex items-center justify-center transition-opacity"
                >
                  {isPending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Confirmar Agendamento"
                  )}
                </button>
              </motion.div>
            )}

            {/* STEP 7: SUCESSO */}
            {step === 7 && (
              <motion.div
                key="step7"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full text-center py-6"
              >
                <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
                  <Check className="w-10 h-10 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-[--p-text-1] mb-2">
                  Agendado!
                </h2>
                <p className="text-[--p-text-3] text-sm max-w-[240px] mx-auto mb-6">
                  Aula com{" "}
                  <strong className="text-[--p-text-2]">
                    {instructor?.nome}
                  </strong>{" "}
                  em{" "}
                  <strong className="text-[--p-text-2]">
                    {date?.toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </strong>{" "}
                  às{" "}
                  <strong className="text-[--p-text-2]">
                    {timeSlot?.substring(0, 5)}
                  </strong>{" "}
                  confirmada.
                </p>
                <div className="space-y-3 max-w-xs mx-auto">
                  <button
                    onClick={() => {
                      setStep(2);
                      setDate(null);
                      setCategory(null);
                      setInstructor(null);
                      setTimeSlot(null);
                      setError(null);
                    }}
                    className="w-full py-3.5 bg-[--p-accent] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Agendar nova aula
                  </button>
                  <button
                    onClick={() => router.push(`/${escola}/aluno/minhas-aulas`)}
                    className="w-full py-3.5 bg-[--p-bg-card] border border-[--p-border] text-[--p-text-1] font-semibold rounded-xl hover:bg-[--p-hover] transition-colors"
                  >
                    Ver Minhas Aulas
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
