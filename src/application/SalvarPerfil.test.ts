import { beforeEach, describe, expect, it } from 'vitest'
import { PerfilInvalidoError } from '../domain/errors/PerfilInvalidoError'
import { CAMINHOS } from '../domain/vault/caminhos'
import { InMemoryVaultStorage } from '../infrastructure/armazenamento/InMemoryVaultStorage'
import { RegistrarMedida } from './RegistrarMedida'
import { SalvarPerfil } from './SalvarPerfil'

describe('SalvarPerfil', () => {
  let vault: InMemoryVaultStorage
  let salvar: SalvarPerfil

  beforeEach(() => {
    vault = new InMemoryVaultStorage()
    salvar = new SalvarPerfil(vault)
  })

  it('grava a correção que o aluno fez do próprio perfil', async () => {
    await salvar.executar({ nome: 'Aluno Exemplo', idade: 31, alturaMetros: 1.75 })

    const gravado = JSON.parse((await vault.ler(CAMINHOS.perfil))!)
    expect(gravado).toEqual({ nome: 'Aluno Exemplo', idade: 31, alturaMetros: 1.75 })
  })

  it('recusa perfil inválido sem tocar no que já estava gravado', async () => {
    await salvar.executar({ nome: 'Aluno Exemplo', idade: 31, alturaMetros: 1.75 })
    const antes = await vault.ler(CAMINHOS.perfil)

    await expect(
      salvar.executar({ nome: '', idade: 31, alturaMetros: 1.75 })
    ).rejects.toBeInstanceOf(PerfilInvalidoError)

    expect(await vault.ler(CAMINHOS.perfil)).toBe(antes)
  })

  it('salvar o perfil não encosta no histórico de medidas', async () => {
    await new RegistrarMedida(vault).executar('2026-08-10', { pesoKg: 82.4 })
    const historico = await vault.ler(CAMINHOS.medida('2026-08-10'))

    await salvar.executar({ nome: 'Aluno Exemplo', idade: 31, alturaMetros: 1.75 })

    expect(await vault.ler(CAMINHOS.medida('2026-08-10'))).toBe(historico)
  })
})
