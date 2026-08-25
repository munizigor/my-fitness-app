import { describe, expect, it } from 'vitest'
import { SCHEMA_VERSION_REGISTRO, migrarRegistro } from './migracoes'

const V2 = {
  schemaVersion: 2,
  data: '2026-08-24',
  series: [
    { itemDeTreinoId: 'a1', indice: 1, cargaKg: 60, concluidaEm: '2026-08-24T10:00:00.000Z' },
  ],
}

describe('migrarRegistro', () => {
  it('traz o registro da versão 2 para a atual sem perder nenhuma série', () => {
    const migrado = migrarRegistro(V2) as Record<string, unknown>
    expect(migrado.schemaVersion).toBe(SCHEMA_VERSION_REGISTRO)
    expect(migrado.series).toEqual(V2.series)
    expect(migrado.data).toBe('2026-08-24')
  })

  it('preenche água e refeições com o que a versão 2 não sabia registrar', () => {
    // Quem já treinou ontem não pode perder o treino de ontem porque o app
    // aprendeu a contar água hoje.
    const migrado = migrarRegistro(V2) as Record<string, unknown>
    expect(migrado.aguaLitros).toBe(0)
    expect(migrado.refeicoes).toEqual([])
  })

  it('não toca no registro que já está na versão atual', () => {
    const atual = { ...V2, schemaVersion: SCHEMA_VERSION_REGISTRO, aguaLitros: 1.5, refeicoes: [] }
    expect(migrarRegistro(atual)).toBe(atual)
  })

  it('devolve intacto o que não reconhece — quem julga é o schema, não a migração', () => {
    // Uma versão do futuro tem que falhar na validação, e não ser remendada
    // aqui até parecer legível.
    const futuro = { ...V2, schemaVersion: 99 }
    expect(migrarRegistro(futuro)).toBe(futuro)
    expect(migrarRegistro(null)).toBeNull()
    expect(migrarRegistro('nada')).toBe('nada')
  })
})
