export interface Feature {
  icon: string
  title: string
  description: string
}

export const features: Feature[] = [
  {
    icon: 'Calendar',
    title: 'Agendamentos em tempo real',
    description:
      'Alunos agendam suas aulas diretamente pelo sistema, com disponibilidade atualizada em tempo real.',
  },
  {
    icon: 'LayoutDashboard',
    title: 'Painel Administrativo',
    description:
      'Visão completa da operação: instrutores, alunos, veículos e horários em um único painel.',
  },
  {
    icon: 'UserCheck',
    title: 'Credenciamento intuitivo',
    description:
      'Cadastro simplificado de alunos com validação por CPF ou CNH e controle de créditos por categoria.',
  },
  {
    icon: 'User',
    title: 'Perfil do Instrutor',
    description:
      'Cada instrutor tem acesso ao próprio painel com agenda, confirmações e histórico de aulas.',
  },
  {
    icon: 'FileDigit',
    title: 'Controle digital',
    description:
      'Registro de presença, assinaturas digitais e fotos das aulas práticas diretamente no app.',
  },
  {
    icon: 'MessageSquare',
    title: 'Integração WhatsApp',
    description:
      'Notificações e confirmações automáticas via WhatsApp para alunos e instrutores.',
  },
  {
    icon: 'RefreshCw',
    title: 'Manutenção e integrações',
    description:
      'Plataforma em constante evolução com atualizações automáticas e integrações futuras sem custo adicional.',
  },
  {
    icon: 'GraduationCap',
    title: 'Treinamento para alunos',
    description:
      'Guia de uso integrado para que os alunos aprendam a usar o sistema de forma autônoma e rápida.',
  },
]
