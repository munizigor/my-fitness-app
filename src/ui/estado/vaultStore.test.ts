import { beforeEach, describe, expect, it } from 'vitest'
import { ExportarVault } from '../../application/ExportarVault'
import { ImportarPlano } from '../../application/ImportarPlano'
import { RegistrarMedida } from '../../application/RegistrarMedida'
import type {
  ArquivoParaSalvar,
  FileTransfer,
  ResultadoDeSalvar,
} from '../../domain/ports/FileTransfer'
import { FORMATO_EXPORT, SCHEMA_VERSION_EXPORT } from '../../domain/schema/arquivoDeVault'
import { CAMINHOS } from '../../domain/vault/caminhos'
import { InMemoryVaultStorage } from '../../infrastructure/armazenamento/InMemoryVaultStorage'
import planoValido from '../../test/fixtures/plano-valido.json'
import { usarTransferencia, usarVault, useVault } from './vaultStore'

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

describe('vaultStore.importar', () => {
  let vault: InMemoryVaultStorage

  beforeEach(() => {
    vault = new InMemoryVaultStorage()
    usarVault(vault)
    useVault.setState({ arquivo: null, carregando: false, problemas: null, aviso: null })
  })

  it('reconhece um export do próprio app e restaura o vault inteiro', async () => {
    // Um input de import só: o aluno escolhe o arquivo que tem na mão e o app
    // descobre se é a prescrição do profissional ou o backup dele mesmo.
    const original = new InMemoryVaultStorage()
    await new ImportarPlano(original).executar(JSON.stringify(planoValido))
    await new RegistrarMedida(original).executar('2026-06-01', { pesoKg: 82.4 })
    const exportado = await new ExportarVault(original).executar()

    await useVault.getState().importar(exportado!.conteudo)

    expect(useVault.getState().arquivo?.profissional.nome).toBe('Ana Ribeiro')
    expect(useVault.getState().aviso).toBe('restaurado')
    expect(await vault.ler(CAMINHOS.medida('2026-06-01'))).toContain('82.4')
  })

  it('backup corrompido falha como backup, não como culpa do profissional', async () => {
    await useVault.getState().importar(
      JSON.stringify({
        formato: FORMATO_EXPORT,
        schemaVersion: SCHEMA_VERSION_EXPORT,
        exportadoEm: '2026-08-25T10:00:00.000Z',
        documentos: { '../fora.json': {} },
      })
    )

    const problemas = useVault.getState().problemas
    expect(problemas?.[0]?.onde).toContain('Backup')
    expect(useVault.getState().arquivo).toBeNull()
  })
})

describe('vaultStore.exportar', () => {
  let vault: InMemoryVaultStorage
  let entregues: ArquivoParaSalvar[]

  function transferencia(resultado: ResultadoDeSalvar = 'salvo'): FileTransfer {
    return {
      salvar: (arquivo) => {
        entregues.push(arquivo)
        return Promise.resolve(resultado)
      },
    }
  }

  beforeEach(async () => {
    vault = new InMemoryVaultStorage()
    usarVault(vault)
    entregues = []
    useVault.setState({ arquivo: null, carregando: false, problemas: null, aviso: null })
    await new ImportarPlano(vault).executar(JSON.stringify(planoValido))
  })

  it('entrega o vault ao aluno, com nome de arquivo e conteúdo legível', async () => {
    usarTransferencia(transferencia())

    await useVault.getState().exportar()

    expect(entregues).toHaveLength(1)
    expect(entregues[0]?.nome).toMatch(/^vault-\d{4}-\d{2}-\d{2}\.fitvault\.json$/)
    expect(JSON.parse(entregues[0]!.conteudo)).toMatchObject({ formato: FORMATO_EXPORT })
    expect(useVault.getState().aviso).toBe('exportado')
  })

  it('desistir de salvar não vira mensagem de sucesso', async () => {
    usarTransferencia(transferencia('cancelado'))

    await useVault.getState().exportar()

    expect(useVault.getState().aviso).toBeNull()
  })

  it('vault vazio avisa em vez de entregar arquivo sem nada', async () => {
    usarVault(new InMemoryVaultStorage())
    usarTransferencia(transferencia())

    await useVault.getState().exportar()

    expect(entregues).toHaveLength(0)
    expect(useVault.getState().aviso).toBe('nadaParaExportar')
  })
})
