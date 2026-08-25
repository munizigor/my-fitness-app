import { beforeEach, describe, expect, it } from 'vitest'
import {
  FORMATO_EXPORT,
  SCHEMA_VERSION_EXPORT,
  lerArquivoDeVault,
} from '../domain/schema/arquivoDeVault'
import { CAMINHOS } from '../domain/vault/caminhos'
import { InMemoryVaultStorage } from '../infrastructure/armazenamento/InMemoryVaultStorage'
import { ExportarVault, type VaultExportado } from './ExportarVault'

const AGORA = () => '2026-08-25T10:00:00.000Z'

/** O export do vault de teste, já sabendo que ele não está vazio. */
async function exportar(vault: InMemoryVaultStorage): Promise<VaultExportado> {
  const resultado = await new ExportarVault(vault, AGORA).executar()
  if (resultado === null) expect.unreachable('esperava um arquivo exportado')
  return resultado
}

describe('ExportarVault', () => {
  let vault: InMemoryVaultStorage

  beforeEach(async () => {
    vault = new InMemoryVaultStorage()
    await vault.escrever(CAMINHOS.manifest, JSON.stringify({ schemaVersion: 2 }))
    await vault.escrever(CAMINHOS.planoAtual, JSON.stringify({ formato: 'fitvault-plano' }))
    await vault.escrever(CAMINHOS.perfil, JSON.stringify({ nome: 'Aluno' }))
    await vault.escrever(CAMINHOS.medida('2026-06-01'), JSON.stringify({ data: '2026-06-01' }))
    await vault.escrever(CAMINHOS.registro('2026-08-24'), JSON.stringify({ data: '2026-08-24' }))
  })

  it('leva o vault inteiro, cada documento no caminho em que mora', async () => {
    const { arquivo } = await exportar(vault)

    expect(arquivo.formato).toBe(FORMATO_EXPORT)
    expect(arquivo.schemaVersion).toBe(SCHEMA_VERSION_EXPORT)
    expect(arquivo.exportadoEm).toBe('2026-08-25T10:00:00.000Z')
    expect(Object.keys(arquivo.documentos).sort()).toEqual([
      CAMINHOS.medida('2026-06-01'),
      CAMINHOS.perfil,
      CAMINHOS.manifest,
      CAMINHOS.planoAtual,
      CAMINHOS.registro('2026-08-24'),
    ])
  })

  it('embute o documento como JSON, não como texto escapado', async () => {
    const { conteudo } = await exportar(vault)

    // O critério do ADR 0003 é ler o arquivo num editor qualquer e entender.
    expect(conteudo).toContain('"nome": "Aluno"')
    expect(conteudo).not.toContain('\\"nome\\"')
    // Indentado, sempre: o arquivo é feito para ser lido por gente.
    expect(conteudo.split('\n').length).toBeGreaterThan(5)
  })

  it('nomeia o arquivo pelo dia, com a extensão do formato', async () => {
    const { nome } = await exportar(vault)

    expect(nome).toBe('vault-2026-08-25.fitvault.json')
  })

  it('não leva o que não é documento do vault', async () => {
    // Um arquivo estranho na pasta não pode entrar num envelope que o próprio
    // app recusaria ao restaurar — o round-trip quebraria por causa dele.
    await vault.escrever('vault/registros/rascunho.txt', 'anotação solta')

    const { arquivo } = await exportar(vault)

    expect(Object.keys(arquivo.documentos)).not.toContain('vault/registros/rascunho.txt')
  })

  it('ignora documento ilegível em vez de derrubar o export inteiro', async () => {
    await vault.escrever(CAMINHOS.registro('2026-08-20'), '{ isso não é json')

    const { arquivo } = await exportar(vault)

    expect(arquivo.documentos[CAMINHOS.registro('2026-08-20')]).toBeUndefined()
    expect(arquivo.documentos[CAMINHOS.registro('2026-08-24')]).toBeDefined()
  })

  it('num vault vazio, não inventa arquivo para o aluno baixar', async () => {
    const vazio = new ExportarVault(new InMemoryVaultStorage(), AGORA)

    expect(await vazio.executar()).toBeNull()
  })

  it('gera um arquivo que o próprio app aceita de volta', async () => {
    // A story inteira é esta linha: o que sai reentra.
    const exportado = await exportar(vault)

    expect(() => lerArquivoDeVault(JSON.parse(exportado.conteudo))).not.toThrow()
  })
})
