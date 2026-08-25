import { beforeEach, describe, expect, it } from 'vitest'
import { CAMINHOS } from '../domain/vault/caminhos'
import { InMemoryVaultStorage } from '../infrastructure/armazenamento/InMemoryVaultStorage'
import { RegistrarAgua } from './RegistrarAgua'
import { RegistrarSerie } from './RegistrarSerie'

const HOJE = '2026-08-24'

describe('RegistrarAgua', () => {
  let vault: InMemoryVaultStorage
  let registrar: RegistrarAgua

  beforeEach(() => {
    vault = new InMemoryVaultStorage()
    registrar = new RegistrarAgua(vault)
  })

  async function gravado(data = HOJE) {
    const bruto = await vault.ler(CAMINHOS.registro(data))
    return bruto === null ? null : (JSON.parse(bruto) as Record<string, unknown>)
  }

  it('grava o total do dia, e não um evento por copo', async () => {
    // Água é um contador, não uma linha do tempo. Quem errou o total corrige o
    // total; guardar cada gole viraria um histórico que ninguém quer ler.
    await registrar.executar(HOJE, 1.5)
    expect((await gravado())?.aguaLitros).toBe(1.5)
  })

  it('substitui o valor anterior, para o aluno poder corrigir para menos', async () => {
    await registrar.executar(HOJE, 1.5)
    await registrar.executar(HOJE, 1.25)

    // É a reclamação que originou isto: dava para somar, não dava para tirar.
    expect((await gravado())?.aguaLitros).toBe(1.25)
  })

  it('aceita voltar a zero', async () => {
    await registrar.executar(HOJE, 1)
    await registrar.executar(HOJE, 0)
    expect((await gravado())?.aguaLitros).toBe(0)
  })

  it('recusa total negativo em vez de gravar um dia impossível', async () => {
    await expect(registrar.executar(HOJE, -0.25)).rejects.toThrow()
  })

  it('não apaga as séries já registradas no mesmo dia', async () => {
    await new RegistrarSerie(vault, () => '2026-08-24T10:00:00.000Z').executar(HOJE, {
      itemDeTreinoId: 'a1',
      indice: 1,
      cargaKg: 60,
    })
    await registrar.executar(HOJE, 2)

    const registro = await gravado()
    expect(registro?.series).toHaveLength(1)
    expect(registro?.aguaLitros).toBe(2)
  })

  it('recusa data inválida em vez de corromper o índice do vault', async () => {
    await expect(registrar.executar('24/08/2026', 1)).rejects.toThrow()
  })
})
