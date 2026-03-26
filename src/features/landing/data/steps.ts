export interface Step {
  number: number
  icon: string
  title: string
  description: string
}

export const steps: Step[] = [
  {
    number: 1,
    icon: 'UserPlus',
    title: 'Identificação Rápida',
    description:
      'O aluno acessa o portal, informa os dados e já visualiza instantaneamente sua carga horária e créditos.',
  },
  {
    number: 2,
    icon: 'CheckCircle',
    title: 'Agendamento Autônomo',
    description:
      'O próprio aluno escolhe o melhor horário e instrutor, respeitando as disponibilidade em tempo real.',
  },
  {
    number: 3,
    icon: 'ClipboardCheck',
    title: 'Execução com Tecnologia',
    description:
      'Sua autoescola coleta assinaturas e confirma presenças digitalmente, sem erros e sem complicação.',
  },
  {
    number: 4,
    icon: 'BarChart3',
    title: 'Monitoramento Gerencial',
    description:
      'Você acompanha o crescimento da sua autoescola com relatórios precisos do que acontece a cada segundo.',
  },
]
