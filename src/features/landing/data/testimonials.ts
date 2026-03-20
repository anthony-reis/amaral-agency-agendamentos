export interface Testimonial {
  id: string
  name: string
  role: string
  school: string
  content: string
  rating: number
  initials: string
  color: string
}

export const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Carlos Mendes',
    role: 'Diretor',
    school: 'Autoescola Central',
    content:
      'Desde que implantamos o AmaralPro, os agendamentos ficaram 100% organizados. Os alunos adoraram a praticidade de agendar pelo celular e nossa equipe parou de usar planilhas.',
    rating: 5,
    initials: 'CM',
    color: 'bg-blue-100 text-blue-700',
  },
  {
    id: '2',
    name: 'Marina Souza',
    role: 'Instrutora',
    school: 'Auto Escola Rota',
    content:
      'O painel do instrutor é muito intuitivo. Consigo ver minha agenda, confirmar aulas e registrar a presença dos alunos em segundos. Recomendo para qualquer autoescola.',
    rating: 5,
    initials: 'MS',
    color: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: '3',
    name: 'Roberto Lima',
    role: 'Proprietário',
    school: 'Escola de Condução Alfa',
    content:
      'O controle de créditos por categoria foi o que mais me impressionou. Antes eu tinha que controlar tudo em caderno. Agora é tudo automático e integrado.',
    rating: 5,
    initials: 'RL',
    color: 'bg-violet-100 text-violet-700',
  },
]
