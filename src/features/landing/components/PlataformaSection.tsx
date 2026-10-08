import {
  CalendarDays, Wallet, QrCode, Gauge, Award, ShieldCheck, Megaphone, Layers, Check, Lock, ScrollText, Activity,
} from 'lucide-react'
import { Revelar } from './Revelar'

function SeloPro() {
  return (
    <span className="ml-auto shrink-0 rounded-full bg-asfalto px-2 py-0.5 text-[10px] font-bold text-faixa">
      Plano Pro
    </span>
  )
}

function Titulo({ icone: Icone, children, pro, claro }: { icone: typeof CalendarDays; children: React.ReactNode; pro?: boolean; claro?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${claro ? 'bg-white/10 text-brand-teal-light' : 'bg-brand-teal/10 text-brand-teal-dark'}`}>
        <Icone className="w-[18px] h-[18px]" />
      </span>
      <h3 className={`font-display text-lg font-bold tracking-tight ${claro ? 'text-white' : 'text-slate-900'}`}>{children}</h3>
      {pro && <SeloPro />}
    </div>
  )
}

const SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']
// [dia, linha inicial, altura, tipo]
const BLOCOS: [number, number, number, 'aula' | 'exame' | 'bloqueio'][] = [
  [0, 0, 2, 'aula'], [0, 3, 1, 'aula'], [1, 1, 2, 'aula'], [1, 4, 1, 'bloqueio'],
  [2, 0, 1, 'aula'], [2, 2, 2, 'exame'], [3, 0, 3, 'aula'], [3, 4, 1, 'aula'],
  [4, 1, 1, 'aula'], [4, 3, 2, 'aula'],
]
const COR_BLOCO = {
  aula: 'bg-brand-teal/25 ring-brand-teal/40',
  exame: 'bg-faixa/25 ring-faixa/50',
  bloqueio: 'bg-white/5 ring-white/10 [background-image:repeating-linear-gradient(45deg,transparent_0_5px,rgba(255,255,255,0.08)_5px_10px)]',
}

export function PlataformaSection() {
  return (
    <section id="sistema" className="bg-papel pt-8 pb-20 sm:pt-10 sm:pb-24 scroll-mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Revelar className="max-w-2xl">
          <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-[-0.025em] text-slate-900 leading-[1.05]">
            Tudo o que a sua autoescola faz, num painel só.
          </h2>
          <p className="mt-5 text-lg text-slate-600 leading-relaxed">
            Cada área conversa com a outra. A aula marcada desconta o crédito, a venda libera o crédito, a aula
            finalizada entra no fechamento do instrutor.
          </p>
        </Revelar>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Agenda */}
          <Revelar className="md:col-span-4 rounded-3xl bg-asfalto p-6 sm:p-7 text-white">
            <Titulo icone={CalendarDays} claro>Agenda online</Titulo>
            <p className="mt-3 text-sm text-white/65 max-w-md leading-relaxed">
              O aluno marca e remarca no horário livre. O sistema respeita bloqueios, feriados, regras de antecedência e
              avisa quando dois agendamentos batem. Pacotes inteiros entram de uma vez com o agendamento em massa.
            </p>
            <div className="mt-6 grid grid-cols-5 gap-2">
              {SEMANA.map((d, i) => (
                <div key={d}>
                  <p className="text-[11px] text-white/45 mb-1.5 text-center">{d}</p>
                  <div className="relative h-36 rounded-xl bg-white/[0.03] ring-1 ring-white/5">
                    {BLOCOS.filter((b) => b[0] === i).map(([, linha, altura, tipo], k) => (
                      <div
                        key={k}
                        className={`absolute inset-x-1 rounded-md ring-1 ${COR_BLOCO[tipo]}`}
                        style={{ top: `${linha * 20 + 4}%`, height: `${altura * 20 - 4}%` }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-white/55">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-brand-teal/60" /> Aula</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-faixa/70" /> Exame</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-white/20" /> Bloqueio</span>
            </div>
          </Revelar>

          {/* Créditos */}
          <Revelar delay={0.05} className="md:col-span-2 rounded-3xl bg-white p-6 ring-1 ring-slate-200">
            <Titulo icone={Layers}>Créditos</Titulo>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              Saldo por categoria, descontado a cada aula e visível para o aluno.
            </p>
            <div className="mt-5 space-y-2">
              {[['A', 'Moto', 4], ['B', 'Carro', 12], ['D', 'Ônibus', 0]].map(([cat, nome, n]) => (
                <div key={cat} className="flex items-center gap-3 rounded-xl bg-papel px-3 py-2.5">
                  <span className="w-7 h-7 rounded-lg bg-asfalto text-white text-xs font-bold flex items-center justify-center">{cat}</span>
                  <span className="text-sm text-slate-700 flex-1">{nome}</span>
                  <span className={`font-display text-lg font-bold tabular-nums ${n === 0 ? 'text-slate-300' : 'text-slate-900'}`}>{n}</span>
                </div>
              ))}
            </div>
          </Revelar>

          {/* Vendas e loja */}
          <Revelar className="md:col-span-3 rounded-3xl bg-brand-teal/[0.08] p-6 sm:p-7 ring-1 ring-brand-teal/20">
            <Titulo icone={QrCode} pro>Loja online e vendas</Titulo>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed max-w-sm">
              O aluno compra o pacote pelo celular com Pix, cartão ou boleto. O dinheiro cai na conta Mercado Pago da
              autoescola e o crédito entra assim que o pagamento é aprovado.
            </p>
            <div className="mt-5 rounded-2xl bg-white ring-1 ring-slate-200 p-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-asfalto flex items-center justify-center shrink-0">
                <QrCode className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">Pacote 10 aulas de carro</p>
                <p className="text-xs text-slate-500">Pago com Pix</p>
              </div>
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-full">
                <Check className="w-3.5 h-3.5" /> +10 créditos
              </span>
            </div>
          </Revelar>

          {/* Financeiro e fechamento */}
          <Revelar delay={0.05} className="md:col-span-3 rounded-3xl bg-white p-6 sm:p-7 ring-1 ring-slate-200">
            <Titulo icone={Wallet}>Fechamento e financeiro</Titulo>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed max-w-sm">
              Quantas aulas e bancas cada instrutor fez no mês, prontas para o pagamento. No Pro, o painel financeiro
              mostra as vendas e os valores de hora/aula.
            </p>
            <div className="mt-5 space-y-2.5">
              {[['Marcos', 42], ['Júlia', 35], ['Carla', 27]].map(([nome, n]) => (
                <div key={nome} className="flex items-center gap-3">
                  <span className="w-14 text-sm text-slate-700">{nome}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-papel overflow-hidden">
                    <div className="h-full rounded-full bg-brand-teal" style={{ width: `${(Number(n) / 42) * 100}%` }} />
                  </div>
                  <span className="w-16 text-right text-xs font-semibold text-slate-500 tabular-nums">{n} aulas</span>
                </div>
              ))}
            </div>
          </Revelar>

          {/* KM */}
          <Revelar className="md:col-span-2 rounded-3xl bg-white p-6 ring-1 ring-slate-200">
            <Titulo icone={Gauge}>KM por aula</Titulo>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              O instrutor registra o KM inicial e final. Aula sem KM não fecha, e o sistema aponta números estranhos.
            </p>
            <div className="mt-5 flex items-center justify-between rounded-xl bg-papel px-4 py-3 font-display tabular-nums">
              <span className="text-slate-900 font-bold">12.480</span>
              <span className="flex-1 mx-3 border-t-2 border-dashed border-slate-300" />
              <span className="text-slate-900 font-bold">12.498</span>
            </div>
            <p className="mt-2 text-xs text-slate-500 text-center">18 km nesta aula</p>
          </Revelar>

          {/* Exames */}
          <Revelar delay={0.05} className="md:col-span-2 rounded-3xl bg-white p-6 ring-1 ring-slate-200">
            <Titulo icone={Award} pro>Exames</Titulo>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              Datas de banca, mutirão de alunos, resultado Aprov./Reprov. e aviso quando o aluno já tem exame marcado.
            </p>
            <div className="mt-5 flex gap-2">
              <span className="flex-1 rounded-xl bg-emerald-500/10 py-2.5 text-center text-sm font-bold text-emerald-700">6 aprov.</span>
              <span className="flex-1 rounded-xl bg-rose-500/10 py-2.5 text-center text-sm font-bold text-rose-700">2 reprov.</span>
            </div>
          </Revelar>

          {/* Equipe e segurança */}
          <Revelar delay={0.1} className="md:col-span-2 rounded-3xl bg-white p-6 ring-1 ring-slate-200">
            <Titulo icone={ShieldCheck}>Equipe sob controle</Titulo>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
              <li className="flex gap-2.5"><Lock className="w-4 h-4 mt-0.5 text-brand-teal-dark shrink-0" /> Perfis de acesso: cada funcionário vê só a área dele</li>
              <li className="flex gap-2.5"><Activity className="w-4 h-4 mt-0.5 text-brand-teal-dark shrink-0" /> Auditoria de tudo o que foi feito, por quem e quando</li>
              <li className="flex gap-2.5"><ScrollText className="w-4 h-4 mt-0.5 text-brand-teal-dark shrink-0" /> Termos de uso e privacidade aceitos pelo aluno (LGPD)</li>
            </ul>
          </Revelar>

          {/* Comunicação */}
          <Revelar className="md:col-span-6 rounded-3xl bg-white p-6 sm:p-7 ring-1 ring-slate-200 flex flex-col md:flex-row md:items-center gap-5">
            <div className="md:w-1/3">
              <Titulo icone={Megaphone}>Comunicados e solicitações</Titulo>
            </div>
            <p className="md:flex-1 text-sm text-slate-600 leading-relaxed">
              Mande um aviso e ele aparece para alunos e instrutores na próxima vez que abrirem o app. No Pro, o aluno
              pede exame ou aula de legislação pelo app, com selfie e assinatura, e a equipe recebe o pedido no painel.
            </p>
          </Revelar>
        </div>
      </div>
    </section>
  )
}
