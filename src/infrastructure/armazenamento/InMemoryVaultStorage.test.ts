import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryVaultStorage } from './InMemoryVaultStorage'

describe('InMemoryVaultStorage', () => {
  let vault: InMemoryVaultStorage

  beforeEach(() => {
    vault = new InMemoryVaultStorage()
  })

  it('devolve null para caminho inexistente, em vez de lançar', async () => {
    // O vault vazio é o estado inicial normal do app, não um erro.
    await expect(vault.ler('vault/planos/atual.json')).resolves.toBeNull()
  })

  it('lê de volta o que escreveu, sem alterar o conteúdo', async () => {
    const json = '{\n  "a": 1\n}'
    await vault.escrever('vault/manifest.json', json)
    await expect(vault.ler('vault/manifest.json')).resolves.toBe(json)
  })

  it('sobrescreve o caminho existente', async () => {
    await vault.escrever('vault/x.json', 'antes')
    await vault.escrever('vault/x.json', 'depois')
    await expect(vault.ler('vault/x.json')).resolves.toBe('depois')
  })

  it('lista por prefixo, em ordem — o caminho é o índice do vault', async () => {
    await vault.escrever('vault/registros/2026-08-03.json', '{}')
    await vault.escrever('vault/registros/2026-08-01.json', '{}')
    await vault.escrever('vault/planos/atual.json', '{}')
    await expect(vault.listar('vault/registros/')).resolves.toEqual([
      'vault/registros/2026-08-01.json',
      'vault/registros/2026-08-03.json',
    ])
  })

  it('lista vazio quando nada casa com o prefixo', async () => {
    await vault.escrever('vault/planos/atual.json', '{}')
    await expect(vault.listar('vault/registros/')).resolves.toEqual([])
  })

  it('remove o caminho', async () => {
    await vault.escrever('vault/x.json', '{}')
    await vault.remover('vault/x.json')
    await expect(vault.ler('vault/x.json')).resolves.toBeNull()
  })

  it('remover caminho inexistente não é erro', async () => {
    await expect(vault.remover('vault/nunca-existiu.json')).resolves.toBeUndefined()
  })
})
