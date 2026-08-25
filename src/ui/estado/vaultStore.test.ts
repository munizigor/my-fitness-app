import { beforeEach, describe, expect, it } from 'vitest'
import { CAMINHOS } from '../../domain/vault/caminhos'
import { InMemoryVaultStorage } from '../../infrastructure/armazenamento/InMemoryVaultStorage'
import planoValido from '../../test/fixtures/plano-valido.json'
import { usarVault, useVault } from './vaultStore'

describe('vaultStore.carregarDoVault', () => {
  let vault: InMemoryVaultStorage

  beforeEach(() => {
    vault = new InMemoryVaultStorage()
    usarVault(vault)
    useVault.setState({ arquivo: null, carregando: true, problemas: null })
  })

  it('vault vazio é estado normal, não erro', async () => {
    await useVault.getState().carregarDoVault()
    expect(useVault.getState()).toMatchObject({ arquivo: null, carregando: false })
  })

  it('recupera o plano gravado — é o que faz o app sobreviver a recarregar', async () => {
    await vault.escrever(CAMINHOS.planoAtual, JSON.stringify(planoValido))

    await useVault.getState().carregarDoVault()

    expect(useVault.getState().arquivo?.profissional.nome).toBe('Ana Ribeiro')
    expect(useVault.getState().carregando).toBe(false)
  })

  it('vault gravado por uma versão que não sabemos ler cai no estado vazio', async () => {
    // Melhor o aluno ver "nenhum plano" e reimportar do que ver meio treino
    // renderizado no meio da série.
    const futuro = structuredClone(planoValido) as Record<string, unknown>
    futuro.schemaVersion = 999
    await vault.escrever(CAMINHOS.planoAtual, JSON.stringify(futuro))

    await useVault.getState().carregarDoVault()

    expect(useVault.getState()).toMatchObject({ arquivo: null, carregando: false })
  })

  it('vault com JSON corrompido também cai no estado vazio, sem quebrar o app', async () => {
    await vault.escrever(CAMINHOS.planoAtual, '{ não é json')

    await useVault.getState().carregarDoVault()

    expect(useVault.getState()).toMatchObject({ arquivo: null, carregando: false })
  })
})
