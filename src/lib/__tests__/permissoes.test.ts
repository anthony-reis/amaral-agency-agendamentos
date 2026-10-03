import { describe, expect, it } from 'vitest'
import {
  PERFIS_PADRAO,
  aplicarModulos,
  combinarPermissoes,
  normalizarPermissoes,
  perfisDoRoleLegado,
  permite,
  roleLegadoDosPerfis,
} from '../permissoes'

describe('permissoes', () => {
  it('combina vários perfis pelo maior nível de cada área', () => {
    const p = combinarPermissoes([PERFIS_PADRAO.secretaria.permissoes, PERFIS_PADRAO.vendas.permissoes])
    expect(p.agendamentos).toBe('editar') // secretaria
    expect(p.vendas).toBe('editar') // vendas
    expect(p.financeiro).toBe('nenhum') // nenhum dos dois
    expect(p.sistema).toBe('ver')
  })

  it('módulo desligado zera a área para todos, até o gestor', () => {
    const p = aplicarModulos(combinarPermissoes([PERFIS_PADRAO.gestor.permissoes]), { vendas: true, financeiro: false })
    expect(p.vendas).toBe('editar')
    expect(p.financeiro).toBe('nenhum')
    expect(p.exames).toBe('nenhum') // módulo ausente = desligado
    expect(p.cadastros).toBe('editar') // área sem módulo
  })

  it('visualizador vê tudo menos vendas e financeiro', () => {
    const p = combinarPermissoes([PERFIS_PADRAO.visualizador.permissoes])
    expect(p.agendamentos).toBe('ver')
    expect(p.sistema).toBe('ver')
    expect(p.vendas).toBe('nenhum')
    expect(p.financeiro).toBe('nenhum')
  })

  it('permite: editar inclui ver; ver não inclui editar', () => {
    expect(permite('editar', 'ver')).toBe(true)
    expect(permite('ver', 'editar')).toBe(false)
    expect(permite('nenhum', 'ver')).toBe(false)
    expect(permite(undefined, 'ver')).toBe(false)
  })

  it('normaliza entrada do banco ignorando chaves/níveis inválidos', () => {
    const p = normalizarPermissoes({ vendas: 'editar', financeiro: 'admin', foo: 'editar' })
    expect(p.vendas).toBe('editar')
    expect(p.financeiro).toBe('nenhum')
    expect(Object.keys(p)).not.toContain('foo')
  })

  it('migração do role legado e role derivado dos perfis', () => {
    expect(perfisDoRoleLegado('visualizador')).toEqual(['visualizador'])
    expect(perfisDoRoleLegado('super_admin')).toEqual(['gestor'])
    expect(perfisDoRoleLegado('operador')).toEqual(['gestor'])
    expect(roleLegadoDosPerfis(['secretaria', 'gestor'])).toBe('admin')
    expect(roleLegadoDosPerfis(['visualizador'])).toBe('visualizador')
    expect(roleLegadoDosPerfis(['secretaria'])).toBe('operador')
  })
})
