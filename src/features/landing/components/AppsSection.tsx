'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, GraduationCap, Car, Check, CalendarPlus, Wallet, Clock, MapPin, PenLine, Gauge, ShoppingBag,
} from 'lucide-react'
import { Revelar } from './Revelar'

type Aba = 'painel' | 'aluno' | 'instrutor'

const ABAS: { id: Aba; rotulo: string; icone: typeof LayoutDashboard; titulo: string; texto: string; itens: string[] }[] = [
  {
    id: 'painel',
    rotulo: 'Painel da equipe',
    icone: LayoutDashboard,
    titulo: 'Para quem toca a autoescola',
    texto: 'Recepção, vendas e financeiro trabalham no mesmo painel, cada um com o acesso que você liberar.',
    itens: [
      'Calendário do mês com todas as aulas e exames',
      'Cadastro de alunos com créditos e venda no balcão',
      'Horários e bloqueios por instrutor',
      'Fechamento mensal e auditoria de cada ação',
    ],
  },
  {
    id: 'aluno',
    rotulo: 'App do aluno',
    icone: GraduationCap,
    titulo: 'Para o aluno resolver sozinho',
    texto: 'Ele entra com CPF e senha pelo link da sua autoescola, no navegador do celular.',
    itens: [
      'Vê os créditos de cada categoria',
      'Escolhe dia, instrutor e horário livre',
      'Remarca dentro das regras que você definiu',
      'Compra pacotes com Pix ou cartão (plano Pro)',
    ],
  },
  {
    id: 'instrutor',
    rotulo: 'App do instrutor',
    icone: Car,
    titulo: 'Para o instrutor focar na aula',
    texto: 'A agenda do dia na mão, sem precisar ligar para a recepção.',
    itens: [
      'Aulas do dia e mapa da semana',
      'Inicia e finaliza a aula com KM e assinatura',
      'Registra falta do aluno',
      'Acompanha as próprias estatísticas',
    ],
  },
]

function Celular({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-[270px] rounded-[38px] bg-asfalto p-2.5 shadow-[0_40px_80px_-24px_rgba(13,22,40,0.55)]">
      <div className="rounded-[30px] bg-papel overflow-hidden h-[520px] relative">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 rounded-full bg-asfalto" />
        <div className="pt-10 px-4 pb-4 h-full">{children}</div>
      </div>
    </div>
  )
}

function TelaAluno() {
  return (
    <Celular>
      <p className="text-[11px] text-slate-500">Olá, Ana</p>
      <p className="font-display text-lg font-bold text-slate-900">Seus créditos</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-asfalto p-3 text-white">
          <p className="text-[10px] text-white/50">Carro</p>
          <p className="font-display text-2xl font-bold">12</p>
        </div>
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-3">
          <p className="text-[10px] text-slate-500">Moto</p>
          <p className="font-display text-2xl font-bold text-slate-900">4</p>
        </div>
      </div>
      <p className="mt-5 text-[11px] font-semibold text-slate-500">Quinta, 14 de novembro</p>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {['08:00', '09:00', '10:30', '14:00', '15:00', '16:30'].map((h, i) => (
          <span
            key={h}
            className={`rounded-lg py-2 text-center text-xs font-semibold ${
              i === 3 ? 'bg-brand-teal text-asfalto' : i === 1 ? 'bg-slate-200 text-slate-400 line-through' : 'bg-white ring-1 ring-slate-200 text-slate-700'
            }`}
          >
            {h}
          </span>
        ))}
      </div>
      <button className="mt-4 w-full rounded-xl bg-asfalto py-3 text-sm font-bold text-white flex items-center justify-center gap-2" tabIndex={-1}>
        <CalendarPlus className="w-4 h-4" /> Confirmar aula às 14:00
      </button>
      <div className="mt-3 rounded-xl bg-white ring-1 ring-slate-200 p-3 flex items-center gap-3">
        <ShoppingBag className="w-4 h-4 text-brand-teal-dark" />
        <span className="text-xs text-slate-700 flex-1">Pacote 10 aulas</span>
        <span className="text-[10px] font-bold text-brand-teal-dark">Comprar</span>
      </div>
    </Celular>
  )
}

function TelaInstrutor() {
  return (
    <Celular>
      <p className="text-[11px] text-slate-500">Hoje, 4 aulas</p>
      <p className="font-display text-lg font-bold text-slate-900">Bom dia, Marcos</p>
      <div className="mt-3 rounded-2xl bg-asfalto p-4 text-white">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-brand-teal-light">Em andamento</span>
          <span className="text-[10px] text-white/50">09:00</span>
        </div>
        <p className="mt-1 font-semibold">Rafael Lima</p>
        <p className="text-[11px] text-white/55 flex items-center gap-1"><MapPin className="w-3 h-3" /> Cat. B</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <span className="rounded-lg bg-white/10 px-2 py-1.5 flex items-center gap-1"><Gauge className="w-3 h-3" /> KM 12.480</span>
          <span className="rounded-lg bg-white/10 px-2 py-1.5 flex items-center gap-1"><PenLine className="w-3 h-3" /> Assinatura</span>
        </div>
        <button className="mt-3 w-full rounded-xl bg-brand-teal py-2.5 text-xs font-bold text-asfalto" tabIndex={-1}>Finalizar aula</button>
      </div>
      <div className="mt-3 space-y-2">
        {[['10:30', 'Bianca Rocha'], ['14:00', 'Lucas Prado'], ['16:30', 'Ana Paula']].map(([h, n]) => (
          <div key={h} className="flex items-center gap-3 rounded-xl bg-white ring-1 ring-slate-200 px-3 py-2.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 tabular-nums">{h}</span>
            <span className="text-xs text-slate-800">{n}</span>
          </div>
        ))}
      </div>
    </Celular>
  )
}

function TelaPainel() {
  return (
    <div className="rounded-3xl bg-asfalto p-3 shadow-[0_40px_80px_-24px_rgba(13,22,40,0.55)]">
      <div className="rounded-2xl bg-papel overflow-hidden flex h-[420px]">
        <aside className="hidden sm:block w-36 bg-white border-r border-slate-200 p-3 space-y-1">
          {['Dashboard', 'Calendário', 'Alunos', 'Instrutores', 'Vendas', 'Financeiro', 'Exames', 'Auditoria'].map((m, i) => (
            <p key={m} className={`text-[11px] rounded-lg px-2 py-1.5 ${i === 1 ? 'bg-brand-teal/15 text-brand-teal-dark font-semibold' : 'text-slate-500'}`}>{m}</p>
          ))}
        </aside>
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-center justify-between">
            <p className="font-display font-bold text-slate-900">Novembro</p>
            <span className="text-[10px] rounded-full bg-white ring-1 ring-slate-200 px-2 py-1 text-slate-500">148 aulas no mês</span>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }, (_, i) => {
              const n = [0, 3, 5, 2, 6, 4, 0][i % 7] + ((i * 7) % 3)
              return (
                <div key={i} className="aspect-square rounded-md bg-white ring-1 ring-slate-200 p-1">
                  <p className="text-[8px] text-slate-400">{((i + 3) % 30) + 1}</p>
                  {i % 7 !== 0 && i % 7 !== 6 && (
                    <div className="mt-0.5 h-1 rounded-full bg-brand-teal" style={{ width: `${Math.min(100, n * 16)}%` }} />
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-3 flex gap-2">
            <span className="flex-1 rounded-xl bg-white ring-1 ring-slate-200 px-3 py-2 text-[10px] text-slate-500 flex items-center gap-1.5"><Wallet className="w-3 h-3 text-brand-teal-dark" /> Fechamento pronto</span>
            <span className="flex-1 rounded-xl bg-white ring-1 ring-slate-200 px-3 py-2 text-[10px] text-slate-500 flex items-center gap-1.5"><Check className="w-3 h-3 text-brand-teal-dark" /> Sem conflitos</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AppsSection() {
  const [aba, setAba] = useState<Aba>('aluno')
  const atual = ABAS.find((a) => a.id === aba)!

  return (
    <section id="apps" className="bg-papel py-24 sm:py-28 scroll-mt-16 border-t border-slate-200/70">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Revelar className="max-w-2xl">
          <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-[-0.025em] text-slate-900 leading-[1.05]">
            Três apps, uma autoescola.
          </h2>
          <p className="mt-5 text-lg text-slate-600 leading-relaxed">
            Equipe, aluno e instrutor veem a mesma agenda, cada um pela sua tela. Ninguém precisa instalar nada.
          </p>
        </Revelar>

        <div role="tablist" aria-label="Apps do AmaralPro" className="mt-10 flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          {ABAS.map((a) => {
            const Icone = a.icone
            const ativa = a.id === aba
            return (
              <button
                key={a.id}
                role="tab"
                aria-selected={ativa}
                onClick={() => setAba(a.id)}
                className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold ring-1 transition-colors ${
                  ativa ? 'bg-asfalto text-white ring-asfalto' : 'bg-white text-slate-600 ring-slate-200 hover:text-slate-900'
                }`}
              >
                <Icone className="w-4 h-4" />
                {a.rotulo}
              </button>
            )
          })}
        </div>

        <div className="mt-10 grid lg:grid-cols-[1fr_1.1fr] gap-12 items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={aba}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="order-2 lg:order-1"
            >
              <h3 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{atual.titulo}</h3>
              <p className="mt-3 text-slate-600 leading-relaxed">{atual.texto}</p>
              <ul className="mt-6 space-y-3">
                {atual.itens.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-slate-800">
                    <span className="mt-0.5 w-6 h-6 rounded-full bg-brand-teal/15 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 text-brand-teal-dark" strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={aba}
              initial={{ opacity: 0, scale: 0.97, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 220, damping: 26 }}
              className="order-1 lg:order-2"
            >
              {aba === 'aluno' ? <TelaAluno /> : aba === 'instrutor' ? <TelaInstrutor /> : <TelaPainel />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
