import { whatsappLink } from '../constants'

// ─── Planos ────────────────────────────────────────────────────────────────
// Implantação é única para os dois planos. O que entra em cada um segue os
// módulos do sistema (src/lib/features.ts): Pro = Basic + vendas, financeiro,
// exames, solicitações, dashboard do aluno e reserva pós-pacote.

export const IMPLANTACAO = { reais: '997', centavos: '00' }

export interface Plano {
  id: 'basic' | 'pro'
  nome: string
  resumo: string
  reais: string
  centavos: string
  destaque: boolean
  incluiTudoDe?: string
  itens: string[]
  whatsapp: string
}

export const PLANOS: Plano[] = [
  {
    id: 'basic',
    nome: 'Basic',
    resumo: 'Para tirar a agenda do caderno e do WhatsApp e organizar alunos, instrutores e créditos.',
    reais: '497',
    centavos: '90',
    destaque: false,
    itens: [
      'Agenda online: o aluno marca e remarca sozinho',
      'App do aluno com CPF e senha',
      'App do instrutor com aulas do dia, faltas e KM',
      'Créditos de aula por categoria (A, B, D, E)',
      'Agendamento em massa de pacotes de aulas',
      'Horários, bloqueios e regras de reagendamento',
      'Fechamento mensal por instrutor',
      'Comunicados para alunos e instrutores',
      'Importação de alunos por planilha',
      'Perfis de acesso, auditoria e termos LGPD',
    ],
    whatsapp: whatsappLink(
      'Olá! Quero contratar o plano Basic do AmaralPro (R$ 497,90 por mês + implantação de R$ 997,00). Como fazemos?'
    ),
  },
  {
    id: 'pro',
    nome: 'Pro',
    resumo: 'Para vender pacotes online, acompanhar o dinheiro entrando e cuidar dos exames no mesmo sistema.',
    reais: '797',
    centavos: '90',
    destaque: true,
    incluiTudoDe: 'Basic',
    itens: [
      'Loja online com Pix, cartão e boleto (Mercado Pago)',
      'Crédito de aula liberado assim que o pagamento é aprovado',
      'Catálogo de pacotes e registro de vendas no balcão',
      'Painel financeiro e valores de hora/aula por instrutor',
      'Exames: datas, mutirão de bancas e Aprov./Reprov.',
      'Solicitações do aluno com selfie e assinatura',
      'Tela inicial do aluno com resumo das aulas',
      'Reserva dos próximos horários após a venda do pacote',
    ],
    whatsapp: whatsappLink(
      'Olá! Quero contratar o plano Pro do AmaralPro (R$ 797,90 por mês + implantação de R$ 997,00). Como fazemos?'
    ),
  },
]

// ─── Notificações do hero (eventos reais do sistema) ───────────────────────

export type TipoEvento = 'agenda' | 'pix' | 'km' | 'exame' | 'credito' | 'falta'

export interface EventoAoVivo {
  tipo: TipoEvento
  titulo: string
  detalhe: string
}

export const EVENTOS: EventoAoVivo[] = [
  { tipo: 'agenda', titulo: 'Ana Paula agendou uma aula', detalhe: 'Carro, quinta às 14h com o instrutor Marcos' },
  { tipo: 'pix', titulo: 'Pix aprovado: Pacote 10 aulas', detalhe: 'Créditos liberados para Rafael na hora' },
  { tipo: 'km', titulo: 'Aula finalizada pelo instrutor', detalhe: 'Moto, 18 km rodados, assinatura do aluno salva' },
  { tipo: 'exame', titulo: 'Bianca foi aprovada na banca', detalhe: 'Resultado lançado em Exames' },
  { tipo: 'credito', titulo: 'Agendamento em massa concluído', detalhe: '12 aulas marcadas para o Lucas de uma vez' },
  { tipo: 'falta', titulo: 'Falta registrada às 09h', detalhe: 'O crédito foi descontado conforme a sua regra' },
]

// ─── Antes / depois ────────────────────────────────────────────────────────

export const ANTES_DEPOIS: { antes: string; depois: string }[] = [
  {
    antes: 'Aluno chama no WhatsApp para marcar aula e alguém precisa responder um por um.',
    depois: 'O aluno abre o link da sua autoescola e marca no horário livre, a qualquer hora.',
  },
  {
    antes: 'Crédito de aula anotado em caderno ou planilha, com conta que nunca bate.',
    depois: 'Cada aula desconta o crédito da categoria certa, e o aluno vê o saldo no celular.',
  },
  {
    antes: 'Pacote vendido no fim de semana espera alguém abrir a autoescola para ser liberado.',
    depois: 'O aluno paga por Pix ou cartão na loja e o crédito entra na mesma hora.',
  },
  {
    antes: 'No fim do mês, você soma aula por aula para pagar cada instrutor.',
    depois: 'O fechamento mensal já mostra quantas aulas cada instrutor deu e quanto pagar.',
  },
  {
    antes: 'Ninguém sabe quem desmarcou, quem deu crédito ou quem mexeu na agenda.',
    depois: 'Cada ação fica registrada na auditoria com nome, data e hora.',
  },
]

// ─── Perguntas frequentes ──────────────────────────────────────────────────

export const FAQ: { pergunta: string; resposta: string }[] = [
  {
    pergunta: 'Preciso instalar alguma coisa?',
    resposta:
      'Não. O AmaralPro funciona no navegador do computador e do celular. Sua equipe usa o painel, e alunos e instrutores entram pelo link da sua autoescola.',
  },
  {
    pergunta: 'Consigo trazer os alunos que já tenho?',
    resposta:
      'Sim. O sistema importa alunos e agendamentos de planilhas em Excel ou CSV, e a gente faz isso junto com você na implantação.',
  },
  {
    pergunta: 'O que está incluído na implantação de R$ 997,00?',
    resposta:
      'É um pagamento único. Configuramos sua autoescola, horários e instrutores, importamos seus alunos e treinamos sua equipe para usar o painel.',
  },
  {
    pergunta: 'Como o aluno paga os pacotes?',
    resposta:
      'No plano Pro, sua autoescola ganha uma loja online ligada à sua conta Mercado Pago. O aluno paga por Pix, cartão ou boleto e o crédito entra assim que o pagamento é aprovado. O dinheiro vai direto para a sua conta.',
  },
  {
    pergunta: 'Dá para limitar o que cada funcionário vê?',
    resposta:
      'Dá. Cada usuário do painel recebe perfis como secretaria, vendas ou financeiro, e só enxerga as áreas liberadas. Reembolso é uma permissão separada, e tudo o que é feito fica na auditoria.',
  },
  {
    pergunta: 'Sou instrutor autônomo. Serve para mim?',
    resposta:
      'Serve. Você tem a sua agenda online, o controle de créditos dos seus alunos e o app para finalizar as aulas, sem precisar de recepção.',
  },
  {
    pergunta: 'Tem fidelidade?',
    resposta: 'Não. Você paga a mensalidade enquanto fizer sentido para a sua autoescola.',
  },
  {
    pergunta: 'E se eu precisar de algo que não está nos planos?',
    resposta:
      'Fale com o nosso suporte pelo WhatsApp. Montamos um plano personalizado com o que a sua operação precisa.',
  },
]
