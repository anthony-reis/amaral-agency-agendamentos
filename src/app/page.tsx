import type { Metadata } from 'next'
import { fonteLanding } from '@/features/landing/fonts'
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
import { Estrada } from '@/features/landing/components/Estrada'

const BRANCO = '#FFFFFF'
const PAPEL = '#F5F7FA'

export const metadata: Metadata = {
  title: 'AmaralPro: sistema de gestão para autoescolas e instrutores',
  description:
    'Agenda online, app do aluno e do instrutor, créditos, vendas com Pix, exames e financeiro num sistema só. Implantação em até 48h e suporte pelo WhatsApp.',
}

export default function HomePage() {
  return (
    <div className={`${fonteLanding.variable} font-display bg-white text-slate-900`}>
      <Header />
      <main>
        <HeroSection />
        <AntesDepoisSection />
        <Estrada de={BRANCO} para={PAPEL} tracado={0} veiculo="carro" placa={{ tipo: 'curva', x: 560, y: 122 }} />
        <PlataformaSection />
        <AppsSection />
        <ParaQuemSection />
        <CalculadoraSection />
        <ImplantacaoSection />
        <Estrada
          de={BRANCO}
          para={PAPEL}
          tracado={1}
          veiculo="onibus"
          sentido="volta"
          placa={{ tipo: 'indicacao', x: 640, y: 12, linhas: ['Planos', 'e preços'] }}
        />
        <PricingSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <Footer />
      <WhatsappFlutuante />
    </div>
  )
}
