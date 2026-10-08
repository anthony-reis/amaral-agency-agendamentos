// Permissões do painel da autoescola, por área e nível (nenhum / ver / editar).
//
// Cada usuário do painel tem um ou mais perfis (users_painel.perfis): códigos
// dos perfis prontos abaixo ou ids (uuid) de perfis personalizados da
// autoescola (tabela painel_perfis). A permissão efetiva é o maior nível entre
// os perfis, limitado pelos módulos ligados na autoescola.
//
// Arquivo importável no client (telas do /admin). A resolução no servidor
// fica em permissoes.server.ts.

import type { FeatureKey } from '@/lib/features'

export const AREAS = {
  dashboard: { label: 'Dashboard', descricao: 'Indicadores e desempenho dos instrutores' },
  agendamentos: { label: 'Agendamentos', descricao: 'Calendário, agendamento em massa, lista, histórico de atividades e conflitos' },
  exames: { label: 'Exames', descricao: 'Datas de exame, agendar exame, tipo banca e Aprov./Reprov.', feature: 'exames' },
  cadastros: { label: 'Cadastros', descricao: 'Alunos e instrutores' },
  operacao: { label: 'Operação', descricao: 'Horários, bloqueios, fechamento e importação' },
  vendas: { label: 'Vendas', descricao: 'Catálogo, vendas e venda de créditos (reembolso é permissão individual, à parte)', feature: 'vendas' },
  financeiro: { label: 'Financeiro', descricao: 'Tela financeira e valores de hora/aula e banca', feature: 'financeiro' },
  solicitacoes: { label: 'Solicitações', descricao: 'Solicitações dos alunos e histórico de solicitações', feature: 'solicitacoes' },
  sistema: { label: 'Sistema', descricao: 'Comunicados, auditoria, reagendamento e configurações' },
} as const satisfies Record<string, { label: string; descricao: string; feature?: FeatureKey }>

export type Area = keyof typeof AREAS
export const AREA_KEYS = Object.keys(AREAS) as Area[]

export type Nivel = 'nenhum' | 'ver' | 'editar'
export const NIVEIS: Nivel[] = ['nenhum', 'ver', 'editar']
export const NIVEL_LABEL: Record<Nivel, string> = { nenhum: 'Sem acesso', ver: 'Ver', editar: 'Editar' }

export type Permissoes = Record<Area, Nivel>

const ORDEM: Record<Nivel, number> = { nenhum: 0, ver: 1, editar: 2 }

export function permite(atual: Nivel | undefined, exigido: Exclude<Nivel, 'nenhum'>): boolean {
  return ORDEM[atual ?? 'nenhum'] >= ORDEM[exigido]
}

function tudo(nivel: Nivel): Permissoes {
  return Object.fromEntries(AREA_KEYS.map((a) => [a, nivel])) as Permissoes
}

export interface PerfilPadrao {
  nome: string
  descricao: string
  /** Cargos típicos de autoescola para quem atribuir este perfil (ajuda no /admin). */
  indicadoPara: string
  permissoes: Partial<Permissoes>
}

/** Perfis prontos (iguais para todas as autoescolas; mudar exige deploy). */
export const PERFIS_PADRAO = {
  gestor: {
    nome: 'Gestor',
    descricao: 'Acesso total ao painel: agenda, cadastros, vendas, financeiro, exames, solicitações e configurações.',
    indicadoPara: 'Dono(a) ou sócio(a) da autoescola, diretor(a) e gerente geral.',
    permissoes: tudo('editar'),
  },
  secretaria: {
    nome: 'Secretaria',
    descricao: 'Agenda aulas e exames, cadastra alunos e instrutores, cuida de horários, bloqueios e das solicitações dos alunos. Não vê vendas nem financeiro.',
    indicadoPara: 'Secretária(o), recepcionista, atendente de balcão e coordenação de agenda.',
    permissoes: {
      dashboard: 'ver',
      agendamentos: 'editar',
      exames: 'editar',
      cadastros: 'editar',
      operacao: 'editar',
      solicitacoes: 'editar',
      sistema: 'ver',
    },
  },
  vendas: {
    nome: 'Vendas',
    descricao: 'Cuida do catálogo de planos e registra vendas e créditos dos alunos. Não vê o financeiro. Reembolso é liberado à parte, por usuário.',
    indicadoPara: 'Consultor(a) de vendas, atendente comercial e quem fecha matrículas.',
    permissoes: { dashboard: 'ver', vendas: 'editar', cadastros: 'editar' },
  },
  financeiro: {
    nome: 'Financeiro',
    descricao: 'Acompanha o financeiro e as vendas e consulta o fechamento mensal com os valores a pagar aos instrutores. Não altera a agenda nem os cadastros.',
    indicadoPara: 'Responsável financeiro, tesouraria e contador(a).',
    permissoes: { dashboard: 'ver', financeiro: 'editar', vendas: 'ver', operacao: 'ver' },
  },
  exames: {
    nome: 'Exames',
    descricao: 'Configura datas de exame, monta o mutirão, agenda bancas, registra Aprov./Reprov. e responde as solicitações de exame. Consulta a agenda e os alunos.',
    indicadoPara: 'Responsável por exames e Detran, despachante interno e coordenação de bancas.',
    permissoes: { dashboard: 'ver', exames: 'editar', solicitacoes: 'editar', agendamentos: 'ver', cadastros: 'ver' },
  },
  visualizador: {
    nome: 'Visualizador',
    descricao: 'Vê as áreas operacionais sem alterar nada. Não vê vendas nem financeiro.',
    indicadoPara: 'Estagiário(a), sócio(a) que só acompanha a operação e auditoria interna.',
    permissoes: { ...tudo('ver'), vendas: 'nenhum', financeiro: 'nenhum' },
  },
} as const satisfies Record<string, PerfilPadrao>

export type PerfilPadraoCodigo = keyof typeof PERFIS_PADRAO
export const PERFIL_PADRAO_CODIGOS = Object.keys(PERFIS_PADRAO) as PerfilPadraoCodigo[]

export function ehPerfilPadrao(id: string): id is PerfilPadraoCodigo {
  return id in PERFIS_PADRAO
}

/** Normaliza o jsonb do banco/entrada do form para Permissoes completas. */
export function normalizarPermissoes(valor: unknown): Permissoes {
  const obj = (valor && typeof valor === 'object' ? valor : {}) as Record<string, unknown>
  return Object.fromEntries(
    AREA_KEYS.map((a) => [a, NIVEIS.includes(obj[a] as Nivel) ? (obj[a] as Nivel) : 'nenhum'])
  ) as Permissoes
}

/** Maior nível por área entre vários perfis. */
export function combinarPermissoes(lista: Partial<Permissoes>[]): Permissoes {
  const out = tudo('nenhum')
  for (const p of lista) {
    for (const a of AREA_KEYS) {
      const n = p[a]
      if (n && ORDEM[n] > ORDEM[out[a]]) out[a] = n
    }
  }
  return out
}

/** Áreas de módulos desligados na autoescola ficam sem acesso para todos. */
export function aplicarModulos(p: Permissoes, features: Partial<Record<FeatureKey, boolean>>): Permissoes {
  const out = { ...p }
  for (const a of AREA_KEYS) {
    const feature = (AREAS[a] as { feature?: FeatureKey }).feature
    if (feature && !features[feature]) out[a] = 'nenhum'
  }
  return out
}

/** Usuários antigos (sem perfis): deriva do campo legado role. */
export function perfisDoRoleLegado(role: string | null | undefined): string[] {
  return role === 'visualizador' ? ['visualizador'] : ['gestor']
}

/** role legado gravado junto (exibição e compatibilidade). */
export function roleLegadoDosPerfis(perfis: string[]): string {
  if (perfis.includes('gestor')) return 'admin'
  if (perfis.length > 0 && perfis.every((p) => p === 'visualizador')) return 'visualizador'
  return 'operador'
}

/** Rota de cada área no painel — usada para levar o usuário à primeira área permitida. */
export const ROTA_INICIAL_AREA: Record<Area, string> = {
  dashboard: 'dashboard',
  agendamentos: 'calendario',
  exames: 'datas-exame',
  cadastros: 'alunos',
  operacao: 'horarios',
  vendas: 'vendas',
  financeiro: 'financeiro',
  solicitacoes: 'solicitacoes',
  sistema: 'comunicados',
}
