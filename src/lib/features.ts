// Módulos (feature flags) por autoescola, ligados/desligados pela equipe
// AmaralPro em /admin → Clientes → Editar → Módulos. Guardados em
// `autoescolas.features` (jsonb). Chave ausente = desligado.
//
// Este arquivo é importável no client (formulário do admin). A leitura do
// banco fica em `features.server.ts`.

export const FEATURES = {
  vendas: {
    label: 'Vendas e Loja',
    descricao:
      'Catálogo, vendas, loja do aluno (checkout exige Mercado Pago ativo em Pagamentos), venda no cadastro do aluno e adicionar crédito como venda.',
  },
  financeiro: {
    label: 'Financeiro',
    descricao: 'Tela Financeiro e valores de hora/aula e banca por instrutor (fechamento e estatísticas).',
  },
  exames: {
    label: 'Exames',
    descricao: 'Datas de exame, agendamento de exame (individual e em massa), tipo aula/banca e Aprov./Reprov.',
  },
  solicitacoes: {
    label: 'Solicitações do aluno',
    descricao: 'Aluno solicita exame/legislação pelo app; painel recebe com badge e alerta.',
  },
  reserva_pos_pacote: {
    label: 'Reserva pós-pacote',
    descricao: 'Opção de bloquear os próximos horários do instrutor no agendamento em massa.',
  },
  dashboard_aluno: {
    label: 'Dashboard do aluno',
    descricao: 'Tela inicial do aluno com resumo. Desligado: após identificar, vai direto para Agendar.',
  },
  login_senha_aluno: {
    label: 'Login do aluno com senha',
    descricao:
      'Aluno cria/usa senha após o CPF. Desligado: entra só com CPF/CNH. Atenção: ao ligar, todos os alunos criam senha no próximo acesso.',
  },
} as const satisfies Record<string, { label: string; descricao: string }>

export type FeatureKey = keyof typeof FEATURES
export type AutoescolaFeatures = Partial<Record<FeatureKey, boolean>>

export const FEATURE_KEYS = Object.keys(FEATURES) as FeatureKey[]

export function hasFeature(features: unknown, key: FeatureKey): boolean {
  if (!features || typeof features !== 'object') return false
  return (features as Record<string, unknown>)[key] === true
}

/** Normaliza o jsonb do banco para um objeto só com chaves conhecidas. */
export function normalizarFeatures(features: unknown): Record<FeatureKey, boolean> {
  return Object.fromEntries(FEATURE_KEYS.map((k) => [k, hasFeature(features, k)])) as Record<
    FeatureKey,
    boolean
  >
}
