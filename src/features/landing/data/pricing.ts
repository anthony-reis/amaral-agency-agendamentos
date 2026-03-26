export interface PricingPlan {
  id: string
  name: string
  price: string
  period: string
  description: string
  features: string[]
  cta: string
  highlighted: boolean
  badge?: string
}

export const pricingPlans: PricingPlan[] = [
  {
    id: 'pro',
    name: 'Plano Evolution',
    price: 'R$ 997',
    period: '+ R$ 497/mês',
    description: 'A solução completa para digitalizar sua autoescola com suporte total e evolução contínua.',
    features: [
      'Implantação assistida em 48h',
      'Painel administrativo ilimitado',
      'Agendamentos automáticos',
      'Assinaturas e presenças digitais',
      'Suporte prioritário via WhatsApp',
      'Novas funcionalidades mensais',
    ],
    cta: 'Começar agora',
    highlighted: true,
    badge: 'Melhor Custo-Benefício',
  },
]
