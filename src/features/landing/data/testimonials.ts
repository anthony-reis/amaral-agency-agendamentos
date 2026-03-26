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
    role: 'Proprietário',
    school: 'Autoescola Central',
    content:
      'O AmaralPro revolucionou nossa operação. Os alunos agendam sozinhos e nossa agenda nunca esteve tão cheia e organizada ao mesmo tempo.',
    rating: 5,
    initials: 'CM',
    color: 'bg-blue-100 text-blue-700',
  },
  {
    id: '2',
    name: 'Marina Souza',
    role: 'Gestora de Operações',
    school: 'Centro de Formação Rota',
    content:
      'Eliminamos as planilhas e o retrabalho. O controle de créditos automático e as assinaturas digitais nos deram uma segurança jurídica que não tínhamos.',
    rating: 5,
    initials: 'MS',
    color: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: '3',
    name: 'Roberto Lima',
    role: 'Diretor de Ensino',
    school: 'Autoescola Alfa',
    content:
      'Sempre buscamos modernizar nossa escola, e o AmaralPro foi a peça que faltava. O suporte é incrível e a tecnologia é de outro nível.',
    rating: 5,
    initials: 'RL',
    color: 'bg-violet-100 text-violet-700',
  },
]
