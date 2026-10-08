import { Check, MessageCircle, Settings2, Wrench } from 'lucide-react'
import { IMPLANTACAO, PLANOS, type Plano } from '../data/landing'
import { MSG_PERSONALIZADO, whatsappLink } from '../constants'
import { Revelar } from './Revelar'

function Preco({ plano, escuro }: { plano: Plano; escuro: boolean }) {
  return (
    <p className={`flex items-start gap-1 ${escuro ? 'text-white' : 'text-slate-900'}`}>
      <span className="mt-2 text-base font-semibold opacity-70">R$</span>
      <span className="font-display text-6xl font-extrabold tracking-[-0.04em] tabular-nums">{plano.reais}</span>
      <span className="mt-2 flex flex-col leading-none">
        <span className="font-display text-xl font-bold">,{plano.centavos}</span>
        <span className={`mt-1 text-xs font-medium ${escuro ? 'text-white/55' : 'text-slate-500'}`}>por mês</span>
      </span>
    </p>
  )
}

function CardPlano({ plano }: { plano: Plano }) {
  const escuro = plano.destaque
  return (
    <div
      className={`relative h-full flex flex-col rounded-3xl p-7 sm:p-8 ${
        escuro
          ? 'bg-asfalto text-white shadow-[0_40px_80px_-30px_rgba(13,22,40,0.7)] lg:-my-4 lg:py-12'
          : 'bg-white ring-1 ring-slate-200'
      }`}
    >
      {escuro && (
        <span className="absolute -top-3 left-7 rounded-full bg-faixa px-3 py-1 text-xs font-bold text-asfalto">
          Mais completo
        </span>
      )}
      <h3 className={`font-display text-2xl font-bold ${escuro ? 'text-white' : 'text-slate-900'}`}>{plano.nome}</h3>
      <p className={`mt-2 text-sm leading-relaxed min-h-[3.75rem] ${escuro ? 'text-white/65' : 'text-slate-600'}`}>{plano.resumo}</p>

      <div className="mt-6">
        <Preco plano={plano} escuro={escuro} />
        <p className={`mt-2 text-xs ${escuro ? 'text-white/50' : 'text-slate-500'}`}>
          + implantação de R$ {IMPLANTACAO.reais},{IMPLANTACAO.centavos} (pagamento único)
        </p>
      </div>

      <a
        href={plano.whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-7 inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 font-bold transition-colors ${
          escuro
            ? 'bg-brand-teal text-asfalto hover:bg-brand-teal-light shadow-[0_12px_32px_-8px_rgba(20,184,166,0.6)]'
            : 'bg-asfalto text-white hover:bg-asfalto-3'
        }`}
      >
        <MessageCircle className="w-5 h-5" />
        Quero o plano {plano.nome}
      </a>

      <div className={`mt-8 pt-7 border-t ${escuro ? 'border-white/10' : 'border-slate-200'}`}>
        {plano.incluiTudoDe && (
          <p className={`mb-4 text-sm font-semibold ${escuro ? 'text-faixa' : 'text-slate-900'}`}>
            Tudo do {plano.incluiTudoDe}, e mais:
          </p>
        )}
        <ul className="space-y-3">
          {plano.itens.map((item) => (
            <li key={item} className={`flex gap-3 text-sm leading-snug ${escuro ? 'text-white/85' : 'text-slate-700'}`}>
              <Check className={`w-4 h-4 mt-0.5 shrink-0 ${escuro ? 'text-brand-teal-light' : 'text-brand-teal-dark'}`} strokeWidth={3} />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function PricingSection() {
  return (
    <section id="planos" className="bg-papel py-24 sm:py-28 scroll-mt-16 border-t border-slate-200/70">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Revelar className="max-w-2xl">
          <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-[-0.025em] text-slate-900 leading-[1.05]">
            Planos para cada momento da autoescola.
          </h2>
          <p className="mt-5 text-lg text-slate-600 leading-relaxed">
            A contratação é feita direto com o nosso suporte, pelo WhatsApp. Escolha o plano e chame a gente.
          </p>
        </Revelar>

        <Revelar delay={0.05} className="mt-10 rounded-2xl bg-white ring-1 ring-slate-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          <span className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-faixa/25 text-asfalto flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5" />
            </span>
            <span className="font-display text-lg font-bold text-slate-900 whitespace-nowrap">
              Implantação: R$ {IMPLANTACAO.reais},{IMPLANTACAO.centavos}
            </span>
          </span>
          <span className="text-sm text-slate-600">
            Pagamento único, igual nos dois planos. Inclui a configuração da autoescola, a importação dos seus alunos e o
            treinamento da equipe.
          </span>
        </Revelar>

        <div className="mt-12 grid lg:grid-cols-3 gap-5 lg:gap-6 items-stretch">
          {PLANOS.map((p, i) => (
            <Revelar key={p.id} delay={0.05 + i * 0.07} className="h-full">
              <CardPlano plano={p} />
            </Revelar>
          ))}

          <Revelar delay={0.2} className="h-full">
            <div className="h-full flex flex-col rounded-3xl border-2 border-dashed border-slate-300 p-7 sm:p-8">
              <span className="w-11 h-11 rounded-2xl bg-white ring-1 ring-slate-200 flex items-center justify-center">
                <Settings2 className="w-5 h-5 text-brand-teal-dark" />
              </span>
              <h3 className="mt-5 font-display text-2xl font-bold text-slate-900">Personalizado</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Tem mais de uma unidade, muitos instrutores ou precisa de algo que não está nos planos? O suporte monta
                um plano com o que a sua operação usa de verdade.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-700 flex-1">
                {['Só os módulos que a sua autoescola usa', 'Valores conversados direto com o suporte'].map((t) => (
                  <li key={t} className="flex gap-3">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-brand-teal-dark" strokeWidth={3} />
                    {t}
                  </li>
                ))}
              </ul>
              <a
                href={whatsappLink(MSG_PERSONALIZADO)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 font-bold text-asfalto bg-white ring-1 ring-slate-300 hover:ring-asfalto transition"
              >
                <MessageCircle className="w-5 h-5" />
                Pedir plano personalizado
              </a>
            </div>
          </Revelar>
        </div>
      </div>
    </section>
  )
}
