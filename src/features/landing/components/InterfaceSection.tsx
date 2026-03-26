'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const panels = [
  {
    label: 'Painel Administrativo',
    description: 'Gestão completa e automatizada',
    bg: 'bg-[#0B1221]',
    preview: (
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dashboard</span>
          <span className="text-[9px] text-white bg-brand-teal/30 px-2 py-0.5 rounded-full ring-1 ring-brand-teal/50">Admin</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Aulas hoje', value: '14/32' },
            { label: 'Ocupação', value: '92%' },
          ].map((s) => (
            <div key={s.label} className="bg-white/5 border border-white/5 rounded-xl p-3">
              <div className="text-sm font-bold text-white">{s.value}</div>
              <div className="text-[8px] text-slate-500 uppercase font-semibold">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="space-y-1.5 mt-3">
          {['Agenda confirmada', 'Créditos validados', 'Relatórios prontos'].map((item, i) => (
            <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-xl px-3 py-2">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-teal ring-2 ring-brand-teal/20" />
              <span className="text-[9px] text-slate-300 font-medium">{item}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    label: 'Painel do Aluno',
    description: 'Agendamento rápido e intuitivo',
    bg: 'bg-[#0B1221]',
    preview: (
      <div className="p-4 space-y-4">
        <div className="flex flex-col items-center py-2">
          <div className="w-10 h-10 rounded-full bg-brand-teal/10 flex items-center justify-center mb-2 ring-1 ring-brand-teal/30">
            <span className="text-lg">👤</span>
          </div>
          <p className="text-[11px] font-bold text-white">João Silva</p>
          <p className="text-[9px] text-slate-500 font-mono tracking-tighter mt-0.5">Cat. B • 20/20 aulas</p>
        </div>
        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col items-center text-center">
          <div className="w-8 h-8 rounded-full bg-brand-teal/20 flex items-center justify-center mb-2">
            <div className="w-2 h-2 rounded-full bg-brand-teal animate-pulse" />
          </div>
          <p className="text-[10px] text-slate-300 font-medium leading-tight">Você tem créditos<br/>disponíveis para agendar!</p>
        </div>
        <div className="bg-brand-teal text-white rounded-xl py-3 text-center text-[10px] font-bold shadow-lg shadow-brand-teal/20">
          Agendar Minha Aula
        </div>
      </div>
    ),
  },
  {
    label: 'Painel do Instrutor',
    description: 'Agenda e confirmações digitais',
    bg: 'bg-[#0B1221]',
    preview: (
      <div className="p-4 space-y-2.5">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Minha Agenda</p>
        {[
          { time: '08:00', student: 'Ana Paula', status: 'Aula Ok', color: 'bg-brand-teal/10 text-brand-teal ring-brand-teal/20' },
          { time: '09:30', student: 'Marcos S.', status: 'Pendente', color: 'bg-white/10 text-slate-400 ring-white/5' },
          { time: '11:00', student: 'Pedro L.', status: 'Aula Ok', color: 'bg-brand-teal/10 text-brand-teal ring-brand-teal/20' },
        ].map((item) => (
          <div key={item.time} className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-xl px-3 py-2.5">
            <span className="text-[10px] font-mono text-brand-teal w-8">{item.time}</span>
            <span className="text-[10px] text-slate-200 font-medium flex-1">{item.student}</span>
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md ring-1 ${item.color}`}>
              {item.status}
            </span>
          </div>
        ))}
      </div>
    ),
  },
]

export function InterfaceSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          ref={ref}
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <span className="text-sm font-semibold text-brand-teal uppercase tracking-widest">
            Experiência premium
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Interface intuitiva e moderna
          </h2>
          <p className="mt-4 text-slate-500 text-lg max-w-xl mx-auto">
            Experiência premium em todos os dispositivos
          </p>
        </motion.div>

        {/* Panels grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {panels.map((panel, i) => (
            <motion.div
              key={panel.label}
              initial={{ opacity: 0, y: 28 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ type: 'spring', stiffness: 150, damping: 24, delay: 0.1 + i * 0.12 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group"
            >
              <div className="rounded-2xl overflow-hidden shadow-card ring-1 ring-slate-200 group-hover:shadow-lg group-hover:ring-brand-teal/20 transition-all">
                {/* Fake device bar */}
                <div className="flex items-center gap-1 px-3 py-2 bg-[#1C2539] border-b border-white/5">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                  <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                  <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                </div>

                {/* Content */}
                <div className={panel.bg}>
                  {panel.preview}
                </div>
              </div>

              {/* Label */}
              <div className="mt-4 text-center">
                <p className="text-sm font-semibold text-slate-800">{panel.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{panel.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
