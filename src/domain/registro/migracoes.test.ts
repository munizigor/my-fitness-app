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

  it('encadeia as migrações: um registro da v2 atravessa as duas', () => {
    // Um `return` por versão faria o registro mais antigo parar na primeira e
    // ser rejeitado pelo schema depois.
    expect((migrarRegistro(V2) as { schemaVersion: number }).schemaVersion).toBe(4)
  })

  describe('da v3 para a v4: a refeição passa a ser referenciada por id', () => {
    const V3 = {
      schemaVersion: 3,
      data: '2026-08-24',
      aguaLitros: 1.5,
      series: [],
      refeicoes: [
        {
          numero: 2,
          itens: [{ itemDeRefeicaoId: 'r2i1', alimento: 'Castanha de caju' }],
          registradaEm: '2026-08-24T10:00:00.000Z',
        },
      ],
    }

    it('converte o número em id sem perder o que foi comido', () => {
      const migrado = migrarRegistro(V3) as { refeicoes: Record<string, unknown>[] }
      expect(migrado.refeicoes[0]).toMatchObject({
        refeicaoId: '2',
        itens: [{ itemDeRefeicaoId: 'r2i1', alimento: 'Castanha de caju' }],
      })
      expect(migrado.refeicoes[0]).not.toHaveProperty('numero')
    })

    it('guarda o número antigo em vez de descartá-lo', () => {
      // O número sozinho não reencontra a refeição num plano que mudou de
      // formato, mas é o que permite reconectar na leitura. Apagar aqui seria
      // irreversível.
      const migrado = migrarRegistro(V3) as { refeicoes: Record<string, unknown>[] }
      expect(migrado.refeicoes[0]?.refeicaoNumeroLegado).toBe(2)
    })

    it('não mexe na água nem nas séries já registradas', () => {
      const migrado = migrarRegistro(V3) as Record<string, unknown>
      expect(migrado.aguaLitros).toBe(1.5)
      expect(migrado.series).toEqual([])
    })

    it('deixa passar refeição malformada em vez de inventar um id', () => {
      const torto = { ...V3, refeicoes: [{ itens: [] }, 'lixo'] }
      const migrado = migrarRegistro(torto) as { refeicoes: unknown[] }
      expect(migrado.refeicoes).toEqual([{ itens: [] }, 'lixo'])
    })

    it('tolera refeicoes que não é lista', () => {
      const torto = { ...V3, refeicoes: 'nada disso' }
      expect((migrarRegistro(torto) as { refeicoes: unknown[] }).refeicoes).toEqual([])
    })
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
