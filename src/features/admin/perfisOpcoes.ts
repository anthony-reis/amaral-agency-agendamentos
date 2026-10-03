import 'server-only'

import { getAutoescolaFeatures } from '@/lib/features.server'
import { AREAS, AREA_KEYS, PERFIS_PADRAO, PERFIL_PADRAO_CODIGOS, type Area } from '@/lib/permissoes'
import type { FeatureKey } from '@/lib/features'
import { listarPerfisPersonalizados, type PerfilPersonalizado } from './actions/painelPerfis'
import type { PerfilOpcao } from './components/PermissoesUi'

/** Perfis prontos + personalizados da autoescola, no formato das telas do /admin. */
export async function carregarPerfisAdmin(autoescola_id: string): Promise<{
  opcoes: PerfilOpcao[]
  personalizados: PerfilPersonalizado[]
  areasDesligadas: Area[]
}> {
  const [personalizados, features] = await Promise.all([
    listarPerfisPersonalizados(autoescola_id),
    getAutoescolaFeatures(autoescola_id),
  ])
  const opcoes: PerfilOpcao[] = [
    ...PERFIL_PADRAO_CODIGOS.map((id) => ({
      id,
      nome: PERFIS_PADRAO[id].nome,
      descricao: PERFIS_PADRAO[id].descricao,
      indicadoPara: PERFIS_PADRAO[id].indicadoPara,
      permissoes: PERFIS_PADRAO[id].permissoes,
      personalizado: false,
    })),
    ...personalizados.map((p) => ({
      id: p.id,
      nome: p.nome,
      descricao: p.descricao,
      permissoes: p.permissoes,
      personalizado: true,
    })),
  ]
  const areasDesligadas = AREA_KEYS.filter((a) => {
    const feature = (AREAS[a] as { feature?: FeatureKey }).feature
    return feature && !features[feature]
  })
  return { opcoes, personalizados, areasDesligadas }
}
