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
    id: 'unica',
    name: 'Implantação Única',
    price: 'R$ 997',
    period: 'pagamento único',
    description: 'Ideal para autoescolas que querem começar com um investimento fixo e sem mensalidade.',
    features: [
      'Acesso completo à plataforma',
      'Cadastro de até 3 instrutores',
      'Agendamentos ilimitados',
      'Painel administrativo',
      'Suporte por WhatsApp',
      'Atualizações por 12 meses',
    ],
    cta: 'Começar agora',
    highlighted: false,
  },
  {
    id: 'mensal',
    name: 'Assinatura Mensal',
    price: 'R$ 497',
    period: '/mês',
    description: 'Para autoescolas que querem atualizações contínuas, suporte prioritário e novos recursos.',
    features: [
      'Tudo do plano Único',
      'Instrutores ilimitados',
      'Suporte prioritário',
      'Novas integrações incluídas',
      'Backup automático de dados',
      'Relatórios avançados',
    ],
    cta: 'Começar agora',
    highlighted: true,
    badge: 'Mais popular',
  },
]
