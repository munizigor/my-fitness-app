import { beforeEach, describe, expect, it } from 'vitest'
import { ArquivoInvalidoError } from '../domain/errors/ArquivoInvalidoError'
import { FORMATO_EXPORT, SCHEMA_VERSION_EXPORT } from '../domain/schema/arquivoDeVault'
import { CAMINHOS } from '../domain/vault/caminhos'
import { InMemoryVaultStorage } from '../infrastructure/armazenamento/InMemoryVaultStorage'
import { ExportarVault } from './ExportarVault'
import { ImportarPlano } from './ImportarPlano'
import { RegistrarMedida } from './RegistrarMedida'
import { RegistrarSerie } from './RegistrarSerie'
import { RestaurarVault } from './RestaurarVault'
import planoValido from '../test/fixtures/plano-valido.json'

const AGORA = () => '2026-08-25T10:00:00.000Z'

function envelope(documentos: Record<string, unknown>): string {
  return JSON.stringify({
    formato: FORMATO_EXPORT,
    schemaVersion: SCHEMA_VERSION_EXPORT,
    exportadoEm: '2026-08-25T10:00:00.000Z',
    documentos,
  })
}

describe('RestaurarVault', () => {
  let vault: InMemoryVaultStorage

  beforeEach(() => {
    vault = new InMemoryVaultStorage()
  })

  it('grava cada documento no caminho que veio no envelope', async () => {
    const conteudo = envelope({
      [CAMINHOS.perfil]: { nome: 'Aluno Sintético', idade: 34, alturaMetros: 1.78 },
      [CAMINHOS.medida('2026-06-01')]: { schemaVersion: 1, data: '2026-06-01', pesoKg: 82.4 },
    })

    const restaurados = await new RestaurarVault(vault).executar(conteudo)

    expect(restaurados).toBe(2)
    expect(JSON.parse((await vault.ler(CAMINHOS.perfil))!)).toMatchObject({
      nome: 'Aluno Sintético',
    })
    expect(await vault.ler(CAMINHOS.medida('2026-06-01'))).toContain('82.4')
  })

  it('grava indentado, para o vault em disco continuar legível', async () => {
    await new RestaurarVault(vault).executar(
      envelope({ [CAMINHOS.perfil]: { nome: 'Aluno', idade: 30, alturaMetros: 1.7 } })
    )

    expect(await vault.ler(CAMINHOS.perfil)).toContain('\n  "nome"')
  })

  it('recusa o envelope inteiro antes de escrever um byte', async () => {
    await vault.escrever(CAMINHOS.perfil, '{"nome":"quem já estava aqui"}')

    const corrompido = envelope({
      [CAMINHOS.perfil]: { nome: 'Novo' },
      '../fora-do-vault.json': { qualquer: 'coisa' },
    })

    await expect(new RestaurarVault(vault).executar(corrompido)).rejects.toThrow(
      ArquivoInvalidoError
    )
    // O vault fica exatamente como estava: a mesma garantia do import do plano.
    expect(await vault.ler(CAMINHOS.perfil)).toBe('{"nome":"quem já estava aqui"}')
  })

  it('recusa conteúdo que nem JSON é, com erro de negócio', async () => {
    await expect(new RestaurarVault(vault).executar('nada disso')).rejects.toThrow(
      ArquivoInvalidoError
    )
  })

  it('não apaga o que o aluno tem e o backup não traz', async () => {
    // Restaurar é trazer de volta, não destruir o que está aqui. Um backup de
    // junho não pode levar embora a aferição de agosto.
    await vault.escrever(CAMINHOS.medida('2026-08-20'), '{"schemaVersion":1,"data":"2026-08-20"}')

    await new RestaurarVault(vault).executar(
      envelope({ [CAMINHOS.medida('2026-06-01')]: { schemaVersion: 1, data: '2026-06-01' } })
    )

    expect(await vault.ler(CAMINHOS.medida('2026-08-20'))).not.toBeNull()
  })

  it('round-trip: instalação limpa reproduz o mesmo estado', async () => {
    // O aceite da story, num teste só. O que o aluno fez — plano importado,
    // série levantada, corpo aferido — sai num arquivo e volta idêntico noutro
    // aparelho que nunca viu esse aluno.
    const original = new InMemoryVaultStorage()
    await new ImportarPlano(original, AGORA).executar(JSON.stringify(planoValido))
    await new RegistrarSerie(original).executar('2026-08-24', {
      itemDeTreinoId: 'A1',
      indice: 1,
      cargaKg: 60,
      repeticoes: 12,
    })
    await new RegistrarMedida(original).executar('2026-06-01', { pesoKg: 82.4 })
    await new RegistrarMedida(original).executar('2026-08-20', { pesoKg: 79.1 })

    const exportado = await new ExportarVault(original, AGORA).executar()
    const limpa = new InMemoryVaultStorage()
    await new RestaurarVault(limpa).executar(exportado!.conteudo)

    const antes = await new ExportarVault(original, AGORA).executar()
    const depois = await new ExportarVault(limpa, AGORA).executar()
    expect(depois!.arquivo.documentos).toEqual(antes!.arquivo.documentos)
  })
})
