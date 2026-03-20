import { Header } from '@/features/landing/components/Header'
import { HeroSection } from '@/features/landing/components/HeroSection'
import { FeaturesSection } from '@/features/landing/components/FeaturesSection'
import { InterfaceSection } from '@/features/landing/components/InterfaceSection'
import { HowItWorksSection } from '@/features/landing/components/HowItWorksSection'
import { PricingSection } from '@/features/landing/components/PricingSection'
import { TestimonialsSection } from '@/features/landing/components/TestimonialsSection'
import { FinalCtaSection } from '@/features/landing/components/FinalCtaSection'
import { Footer } from '@/features/landing/components/Footer'

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <InterfaceSection />
        <HowItWorksSection />
        <PricingSection />
        <TestimonialsSection />
        <FinalCtaSection />
      </main>
      <Footer />
    </>
  )
}
