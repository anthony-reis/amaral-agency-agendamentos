'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const panels = [
  {
    label: 'Painel Administrativo',
    description: 'Visão completa da operação',
    bg: 'bg-brand-navy',
    preview: (
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-slate-300 font-semibold">Dashboard</span>
          <span className="text-[10px] text-brand-teal bg-brand-teal/20 px-2 py-0.5 rounded-full">Hoje</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Aulas', value: '12' },
            { label: 'Alunos', value: '239' },
            { label: 'Instrutores', value: '6' },
            { label: 'Concluídas', value: '9' },
          ].map((s) => (
            <div key={s.label} className="bg-white/10 rounded-lg p-2.5">
              <div className="text-base font-bold text-white">{s.value}</div>
              <div className="text-[9px] text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="space-y-1 mt-2">
          {['08:00 — João Silva', '09:30 — Maria S.', '11:00 — Pedro L.'].map((item, i) => (
            <div key={i} className="flex items-center gap-2 bg-white/5 rounded-md px-2 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-teal" />
              <span className="text-[9px] text-slate-300">{item}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    label: 'Painel do Aluno',
    description: 'Agendamento fácil e intuitivo',
    bg: 'bg-white',
    preview: (
      <div className="p-4 space-y-3">
        <div className="text-center py-1">
          <div className="w-10 h-10 rounded-full bg-brand-teal/10 mx-auto flex items-center justify-center mb-2">
            <span className="text-lg">🎓</span>
          </div>
          <p className="text-xs font-semibold text-slate-700">João Silva</p>
          <p className="text-[10px] text-slate-400">CPF: •••.•••.789-00</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { cat: 'Cat. A', aulas: 3 },
            { cat: 'Cat. B', aulas: 7 },
          ].map((c) => (
            <div key={c.cat} className="bg-brand-teal/5 rounded-lg p-2.5 text-center border border-brand-teal/15">
              <div className="text-base font-bold text-brand-teal">{c.aulas}</div>
              <div className="text-[9px] text-slate-500">{c.cat} disponível</div>
            </div>
          ))}
        </div>
        <div className="bg-brand-teal text-white rounded-lg py-2 text-center text-[10px] font-semibold">
          Agendar Aula
        </div>
      </div>
    ),
  },
  {
    label: 'Painel do Instrutor',
    description: 'Agenda e confirmações',
    bg: 'bg-white',
    preview: (
      <div className="p-4 space-y-2.5">
        <p className="text-xs font-semibold text-slate-700 mb-1">Agenda de hoje</p>
        {[
          { time: '08:00', student: 'João Silva', status: 'Confirmado', color: 'bg-green-100 text-green-700' },
          { time: '09:30', student: 'Maria S.', status: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
          { time: '11:00', student: 'Pedro L.', status: 'Confirmado', color: 'bg-green-100 text-green-700' },
        ].map((item) => (
          <div key={item.time} className="flex items-center gap-2 bg-slate-50 rounded-lg px-2.5 py-2">
            <span className="text-[9px] font-bold text-slate-500 w-8">{item.time}</span>
            <span className="text-[9px] text-slate-700 flex-1">{item.student}</span>
            <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full ${item.color}`}>
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
                <div className="flex items-center gap-1 px-3 py-2 bg-slate-100 border-b border-slate-200">
                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                  <div className="w-2 h-2 rounded-full bg-slate-300" />
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
