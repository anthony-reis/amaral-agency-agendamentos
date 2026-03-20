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
    title: 'Aluno se cadastra e agenda',
    description:
      'O aluno acessa o sistema, informa seu CPF ou CNH, verifica os créditos disponíveis e escolhe o horário ideal.',
  },
  {
    number: 2,
    icon: 'CheckCircle',
    title: 'Instrutor confirma',
    description:
      'O instrutor recebe a notificação, confirma o agendamento e a aula fica registrada na agenda do dia.',
  },
  {
    number: 3,
    icon: 'ClipboardCheck',
    title: 'Aula realizada com registro digital',
    description:
      'Durante a aula, o instrutor registra a presença, tira foto e coleta a assinatura digital do aluno.',
  },
  {
    number: 4,
    icon: 'BarChart3',
    title: 'Autoescola acompanha tudo',
    description:
      'A gestão tem visão completa de todas as aulas, créditos consumidos, desempenho e histórico em tempo real.',
  },
]
