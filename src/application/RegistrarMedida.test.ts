import { beforeEach, describe, expect, it } from 'vitest'
import { MedidaInvalidaError } from '../domain/errors/MedidaInvalidaError'
import { CAMINHOS } from '../domain/vault/caminhos'
import { InMemoryVaultStorage } from '../infrastructure/armazenamento/InMemoryVaultStorage'
import { RegistrarMedida } from './RegistrarMedida'

describe('RegistrarMedida', () => {
  let vault: InMemoryVaultStorage
  let registrar: RegistrarMedida

  beforeEach(() => {
    vault = new InMemoryVaultStorage()
    registrar = new RegistrarMedida(vault)
  })

  it('grava a aferição no arquivo do dia dela', async () => {
    await registrar.executar('2026-08-10', { pesoKg: 82.4 })

    const gravada = JSON.parse((await vault.ler(CAMINHOS.medida('2026-08-10')))!)
    expect(gravada).toMatchObject({ data: '2026-08-10', pesoKg: 82.4 })
  })

  it('uma aferição nova não sobrescreve a anterior — é série temporal', async () => {
    // O coração da story: a planilha sobrescrevia o peso e a evolução do corpo
    // sumia junto com o número velho.
    await registrar.executar('2026-06-10', { pesoKg: 85 })
    await registrar.executar('2026-08-10', { pesoKg: 82.4 })

    expect(await vault.listar(CAMINHOS.medidas)).toEqual([
      CAMINHOS.medida('2026-06-10'),
      CAMINHOS.medida('2026-08-10'),
    ])
    expect(JSON.parse((await vault.ler(CAMINHOS.medida('2026-06-10')))!).pesoKg).toBe(85)
  })

  it('medir de novo no mesmo dia corrige o ponto daquele dia, sem criar outro', async () => {
    // Errar o número na balança e corrigir em seguida é uma correção, não uma
    // segunda aferição.
    await registrar.executar('2026-08-10', { pesoKg: 28.4 })
    await registrar.executar('2026-08-10', { pesoKg: 82.4 })

    expect(await vault.listar(CAMINHOS.medidas)).toHaveLength(1)
    expect(JSON.parse((await vault.ler(CAMINHOS.medida('2026-08-10')))!).pesoKg).toBe(82.4)
  })

  it('grava JSON indentado — o vault é feito para ser lido por gente', async () => {
    await registrar.executar('2026-08-10', { pesoKg: 82.4 })
    expect(await vault.ler(CAMINHOS.medida('2026-08-10'))).toContain('\n  ')
  })

  it('devolve a aferição gravada, para a UI não precisar reler o vault', async () => {
    const medida = await registrar.executar('2026-08-10', {
      pesoKg: 82.4,
      circunferenciasCm: { cintura: 84 },
    })
    expect(medida.circunferenciasCm).toEqual({ cintura: 84 })
  })

  it('não escreve nada quando a aferição não tem nenhum valor', async () => {
    await expect(registrar.executar('2026-08-10', {})).rejects.toBeInstanceOf(MedidaInvalidaError)
    expect(await vault.listar('')).toEqual([])
  })
})
