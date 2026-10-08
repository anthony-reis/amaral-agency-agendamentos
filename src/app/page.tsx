import type { Metadata } from 'next'
import { fonteTitulos } from '@/features/landing/fonts'
import { Header } from '@/features/landing/components/Header'
import { HeroSection } from '@/features/landing/components/HeroSection'
import { AntesDepoisSection } from '@/features/landing/components/AntesDepoisSection'
import { PlataformaSection } from '@/features/landing/components/PlataformaSection'
import { AppsSection } from '@/features/landing/components/AppsSection'
import { ParaQuemSection } from '@/features/landing/components/ParaQuemSection'
import { CalculadoraSection } from '@/features/landing/components/CalculadoraSection'
import { ImplantacaoSection } from '@/features/landing/components/ImplantacaoSection'
import { PricingSection } from '@/features/landing/components/PricingSection'
import { FaqSection } from '@/features/landing/components/FaqSection'
import { FinalCtaSection } from '@/features/landing/components/FinalCtaSection'
import { Footer } from '@/features/landing/components/Footer'
import { WhatsappFlutuante } from '@/features/landing/components/WhatsappFlutuante'

export const metadata: Metadata = {
  title: 'AmaralPro: sistema de gestão para autoescolas e instrutores',
  description:
    'Agenda online, app do aluno e do instrutor, créditos, vendas com Pix, exames e financeiro num sistema só. Implantação em até 48h e suporte pelo WhatsApp.',
}

export default function HomePage() {
  return (
    <div className={`${fonteTitulos.variable} bg-white text-slate-900`}>
      <Header />
      <main>
        <HeroSection />
        <AntesDepoisSection />
        <PlataformaSection />
        <AppsSection />
        <ParaQuemSection />
        <CalculadoraSection />
        <ImplantacaoSection />
        <PricingSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <Footer />
      <WhatsappFlutuante />
    </div>
  )
}
