"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { GraduationCap, Building2 } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative min-h-screen bg-white overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-slate-50 via-teal-50/30 to-transparent" />
        <div className="absolute top-20 right-10 w-96 h-96 bg-brand-teal/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-brand-teal/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16 lg:pt-36 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text side */}
          <div className="space-y-8">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-teal/10 text-brand-teal text-xs font-semibold rounded-full ring-1 ring-brand-teal/20">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-teal animate-pulse" />
                Sistema para Autoescolas
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold text-slate-900 leading-[1.15] tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Automatize, agende e gerencie suas aulas de direção com um{" "}
              <span className="text-brand-teal">clique.</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="text-lg text-slate-500 leading-relaxed max-w-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Um sistema completo para autoescolas e instrutores, com
              agendamentos inteligentes, controle total e integração com
              WhatsApp.
            </motion.p>

            {/* CTAs */}
            <motion.div
              className="flex flex-col sm:flex-row gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/entrar?perfil=aluno"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-brand-teal text-white font-semibold rounded-xl shadow-md hover:bg-brand-teal-dark transition-colors"
                >
                  <GraduationCap className="w-4 h-4" />
                  Sou aluno
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/entrar?perfil=escola"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-slate-700 font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  <Building2 className="w-4 h-4 text-brand-teal" />
                  Sou autoescola
                </Link>
              </motion.div>
            </motion.div>

            {/* Social proof */}
            <motion.div
              className="flex items-center gap-4 pt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex -space-x-2">
                {["CM", "MS", "RL"].map((initials, i) => (
                  <div
                    key={initials}
                    className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold ${
                      i === 0
                        ? "bg-blue-200 text-blue-700"
                        : i === 1
                          ? "bg-emerald-200 text-emerald-700"
                          : "bg-violet-200 text-violet-700"
                    }`}
                  >
                    {initials}
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-slate-800">
                  O sistema ideal
                </span>{" "}
                para autoescolas e instrutores
              </p>
            </motion.div>
          </div>

          {/* Visual side */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              type: "spring",
              stiffness: 140,
              damping: 22,
              delay: 0.2,
            }}
          >
            {/* Main card / UI preview */}
            <div className="relative bg-white rounded-2xl shadow-card-lg ring-1 ring-slate-100 overflow-hidden">
              {/* Fake browser bar */}
              <div className="flex items-center gap-1.5 px-4 py-3 bg-slate-50 border-b border-slate-100">
                <div className="w-3 h-3 rounded-full bg-red-300" />
                <div className="w-3 h-3 rounded-full bg-yellow-300" />
                <div className="w-3 h-3 rounded-full bg-green-300" />
                <div className="flex-1 mx-4 h-5 bg-white rounded border border-slate-200 flex items-center px-2">
                  <span className="text-[10px] text-slate-400 truncate">
                    amaralpro.com.br/agendamento
                  </span>
                </div>
              </div>

              {/* Dashboard preview */}
              <div className="p-4 bg-gradient-navy">
                <div className="text-white text-xs font-semibold mb-3 opacity-70">
                  DASHBOARD — HOJE
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: "Aulas hoje", value: "12" },
                    { label: "Confirmadas", value: "9" },
                    { label: "Instrutores", value: "4" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="bg-white/10 rounded-xl p-3"
                    >
                      <div className="text-lg font-bold text-white">
                        {stat.value}
                      </div>
                      <div className="text-[10px] text-slate-300 mt-0.5">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  {[
                    "08:00 — João Silva — Cat. B",
                    "09:30 — Maria Santos — Cat. A",
                    "11:00 — Pedro Lima — Cat. B",
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2"
                    >
                      <div className="w-2 h-2 rounded-full bg-brand-teal shrink-0" />
                      <span className="text-[11px] text-slate-200 truncate">
                        {item}
                      </span>
                      <span className="ml-auto text-[10px] bg-brand-teal/20 text-brand-teal-light px-1.5 py-0.5 rounded-md shrink-0">
                        OK
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating badge */}
            <motion.div
              className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-card-lg ring-1 ring-slate-100 px-4 py-3 flex items-center gap-3"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="w-8 h-8 rounded-full bg-brand-teal/10 flex items-center justify-center">
                <span className="text-base">✅</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  Aula confirmada!
                </p>
                <p className="text-[10px] text-slate-400">
                  João Silva — 09:30h
                </p>
              </div>
            </motion.div>

            {/* Floating stat */}
            <motion.div
              className="absolute -top-4 -right-4 bg-brand-teal text-white rounded-xl shadow-card-lg px-4 py-3"
              animate={{ y: [0, 6, 0] }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5,
              }}
            >
              <p className="text-lg font-bold">98%</p>
              <p className="text-[10px] opacity-80">Satisfação</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
