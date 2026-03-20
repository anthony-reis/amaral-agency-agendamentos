import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'AmaralPro — Sistema de Gestão para Autoescolas',
  description:
    'Automatize, agende e gerencie suas aulas de direção com um clique. Sistema completo para autoescolas com agendamentos inteligentes e integração WhatsApp.',
  keywords: 'autoescola, agendamento de aulas, gestão autoescola, sistema autoescola, CNH',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="scroll-smooth" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
