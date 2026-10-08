import { Building2, Car, Check, MessageCircle } from 'lucide-react'
import { WHATSAPP_URL, MSG_INSTRUTOR, whatsappLink } from '../constants'
import { Revelar } from './Revelar'

export function ParaQuemSection() {
  return (
    <section id="para-quem" className="bg-white py-20 sm:py-28 scroll-mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Revelar className="max-w-2xl">
          <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-[-0.025em] text-slate-900 leading-[1.05]">
            Feito para quem vive de dar aula de direção.
          </h2>
        </Revelar>

        <div className="mt-12 grid lg:grid-cols-2 gap-5">
          <Revelar className="rounded-3xl bg-papel ring-1 ring-slate-200 p-7 sm:p-9 flex flex-col">
            <span className="w-12 h-12 rounded-2xl bg-asfalto text-white flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </span>
            <h3 className="mt-6 font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Dono de autoescola</h3>
            <p className="mt-3 text-slate-600 leading-relaxed">
              Você precisa saber o que está acontecendo sem estar na recepção o dia inteiro.
            </p>
            <ul className="mt-6 space-y-3 text-slate-800 flex-1">
              {[
                'Agenda de todos os instrutores numa tela só',
                'Equipe com acesso limitado ao que cada um faz',
                'Vendas e créditos batendo sem conferência manual',
                'Fechamento do mês pronto para pagar os instrutores',
              ].map((t) => (
                <li key={t} className="flex gap-3"><Check className="w-5 h-5 text-brand-teal-dark shrink-0" strokeWidth={2.5} />{t}</li>
              ))}
            </ul>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-asfalto text-white font-bold hover:bg-asfalto-3 transition-colors"
            >
              <MessageCircle className="w-5 h-5" /> Quero organizar minha autoescola
            </a>
          </Revelar>

          <Revelar delay={0.08} className="relative rounded-3xl bg-asfalto p-7 sm:p-9 flex flex-col overflow-hidden">
            <div
              aria-hidden
              className="absolute left-0 right-0 bottom-0 h-1.5"
              style={{ backgroundImage: 'linear-gradient(90deg, #FACC15 0 36px, transparent 36px 64px)', backgroundSize: '64px 6px' }}
            />
            <span className="w-12 h-12 rounded-2xl bg-faixa text-asfalto flex items-center justify-center">
              <Car className="w-6 h-6" />
            </span>
            <h3 className="mt-6 font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">Instrutor autônomo</h3>
            <p className="mt-3 text-white/65 leading-relaxed">
              Você dá a aula, responde aluno, cobra e anota tudo. Dá para tirar boa parte disso das suas costas.
            </p>
            <ul className="mt-6 space-y-3 text-white/90 flex-1">
              {[
                'Link próprio para seus alunos marcarem aula',
                'Créditos de cada aluno sempre atualizados',
                'Aula finalizada no celular com KM e assinatura',
                'Pacotes vendidos por Pix sem você parar a aula',
              ].map((t) => (
                <li key={t} className="flex gap-3"><Check className="w-5 h-5 text-faixa shrink-0" strokeWidth={2.5} />{t}</li>
              ))}
            </ul>
            <a
              href={whatsappLink(MSG_INSTRUTOR)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-faixa text-asfalto font-bold hover:brightness-95 transition"
            >
              <MessageCircle className="w-5 h-5" /> Sou instrutor, quero saber mais
            </a>
          </Revelar>
        </div>
      </div>
    </section>
  )
}
