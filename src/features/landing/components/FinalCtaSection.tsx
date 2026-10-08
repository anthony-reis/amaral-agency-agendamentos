import { MessageCircle } from 'lucide-react'
import { WHATSAPP_URL } from '../constants'
import { Revelar } from './Revelar'
import { PlacaPare } from './Placas'

export function FinalCtaSection() {
  return (
    <section className="relative bg-asfalto overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[5px] motion-safe:animate-faixa"
        style={{ backgroundImage: 'linear-gradient(90deg, #FACC15 0 36px, transparent 36px 64px)', backgroundSize: '64px 5px' }}
      />
      <div aria-hidden className="absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[420px] rounded-full bg-brand-teal/15 blur-[120px]" />
      <Revelar className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-28 text-center">
        <PlacaPare tamanho={84} className="mx-auto mb-8 w-fit" />
        <h2 className="font-display text-4xl sm:text-6xl font-extrabold tracking-[-0.035em] text-white leading-[1.04] [text-wrap:balance]">
          Pare de marcar aula pelo WhatsApp.
        </h2>
        <p className="mt-6 text-lg text-white/65 leading-relaxed max-w-xl mx-auto">
          Na semana que vem, seus alunos já podem marcar sozinhos. Chame a gente, conte como a sua autoescola funciona e
          veja o sistema rodando com a sua rotina.
        </p>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-10 inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-brand-teal text-asfalto font-bold text-lg hover:bg-brand-teal-light transition-colors shadow-[0_16px_40px_-10px_rgba(20,184,166,0.7)]"
        >
          <MessageCircle className="w-5 h-5" />
          Falar com a gente agora
        </a>
        <p className="mt-5 text-sm text-white/45">Implantação em até 48h. Sem fidelidade.</p>
      </Revelar>
    </section>
  )
}
