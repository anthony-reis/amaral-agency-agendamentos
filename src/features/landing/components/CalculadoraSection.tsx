'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Revelar } from './Revelar'

const SEMANAS_POR_MES = 4.33

function Controle({
  id, rotulo, valor, min, max, passo, sufixo, onChange,
}: {
  id: string; rotulo: string; valor: number; min: number; max: number; passo: number; sufixo: string
  onChange: (v: number) => void
}) {
  const pct = ((valor - min) / (max - min)) * 100
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <label htmlFor={id} className="text-sm font-medium text-white/75 max-w-[60%]">{rotulo}</label>
        <span className="font-display text-2xl font-bold text-white tabular-nums whitespace-nowrap">
          {valor} <span className="text-sm font-medium text-white/50">{sufixo}</span>
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={passo}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 w-full h-2 rounded-full appearance-none cursor-pointer accent-brand-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-faixa"
        style={{ background: `linear-gradient(90deg, #14B8A6 ${pct}%, rgba(255,255,255,0.12) ${pct}%)` }}
      />
    </div>
  )
}

export function CalculadoraSection() {
  const [agendamentos, setAgendamentos] = useState(60)
  const [minutos, setMinutos] = useState(4)

  const horasMes = (agendamentos * minutos * SEMANAS_POR_MES) / 60
  const horasTexto = horasMes >= 10 ? Math.round(horasMes).toString() : horasMes.toFixed(1).replace('.', ',')
  const dias = Math.round(horasMes / 8)

  return (
    <section className="bg-asfalto py-20 sm:py-28 relative overflow-hidden">
      <div aria-hidden className="absolute -bottom-40 -left-20 w-[520px] h-[520px] rounded-full bg-brand-teal/10 blur-[110px]" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
        <Revelar>
          <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-[-0.025em] text-white leading-[1.05]">
            Faça a conta do tempo que vai para o WhatsApp.
          </h2>
          <p className="mt-5 text-lg text-white/65 leading-relaxed max-w-lg">
            Ajuste com os números da sua autoescola: quantos agendamentos e remarcações vocês fazem por semana e
            quanto tempo leva cada conversa até a aula ficar marcada.
          </p>
        </Revelar>

        <Revelar delay={0.08} className="rounded-3xl bg-white/[0.04] ring-1 ring-white/10 p-6 sm:p-8">
          <div className="space-y-8">
            <Controle
              id="calc-agendamentos"
              rotulo="Agendamentos e remarcações por semana"
              valor={agendamentos}
              min={10}
              max={300}
              passo={5}
              sufixo="por semana"
              onChange={setAgendamentos}
            />
            <Controle
              id="calc-minutos"
              rotulo="Minutos de conversa por agendamento"
              valor={minutos}
              min={1}
              max={15}
              passo={1}
              sufixo="min"
              onChange={setMinutos}
            />
          </div>

          <div className="mt-8 rounded-2xl bg-white p-6">
            <p className="text-sm text-slate-600">Sua equipe passa por mês</p>
            <motion.p
              key={horasTexto}
              initial={{ opacity: 0.4, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-5xl sm:text-6xl font-extrabold text-slate-900 tracking-tight tabular-nums"
            >
              {horasTexto} horas
            </motion.p>
            <p className="mt-1 text-sm text-slate-600">
              só marcando aula
              {dias >= 1 && `, o mesmo que ${dias} ${dias > 1 ? 'dias inteiros' : 'dia inteiro'} de trabalho`}. Com a
              agenda online, quem marca é o aluno.
            </p>
          </div>
        </Revelar>
      </div>
    </section>
  )
}
