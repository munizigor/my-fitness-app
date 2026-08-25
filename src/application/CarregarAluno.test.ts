import { beforeEach, describe, expect, it } from 'vitest'
import { CAMINHOS } from '../domain/vault/caminhos'
import { InMemoryVaultStorage } from '../infrastructure/armazenamento/InMemoryVaultStorage'
import { CarregarAluno } from './CarregarAluno'
import { RegistrarMedida } from './RegistrarMedida'

describe('CarregarAluno', () => {
  let vault: InMemoryVaultStorage
  let carregar: CarregarAluno

  beforeEach(() => {
    vault = new InMemoryVaultStorage()
    carregar = new CarregarAluno(vault)
  })

  it('devolve estado vazio no vault recém-criado, sem lançar', async () => {
    expect(await carregar.executar()).toEqual({ perfil: null, medidas: [] })
  })

  it('lê o perfil que o import semeou', async () => {
    await vault.escrever(
      CAMINHOS.perfil,
      JSON.stringify({ nome: 'Aluno Exemplo', idade: 30, alturaMetros: 1.75 })
    )
    expect((await carregar.executar()).perfil).toEqual({
      nome: 'Aluno Exemplo',
      idade: 30,
      alturaMetros: 1.75,
    })
  })

  it('devolve o histórico com a aferição mais recente primeiro', async () => {
    const registrar = new RegistrarMedida(vault)
    await registrar.executar('2026-06-10', { pesoKg: 85 })
    await registrar.executar('2026-08-10', { pesoKg: 82.4 })
    await registrar.executar('2026-07-10', { pesoKg: 84 })

    const { medidas } = await carregar.executar()
    expect(medidas.map((m) => m.data)).toEqual(['2026-08-10', '2026-07-10', '2026-06-10'])
  })

  it('uma aferição ilegível não leva o histórico inteiro junto', async () => {
    // Mesma escolha do registro diário: dado do aluno corrompido é problema
    // nosso, e o resto do histórico continua útil.
    await new RegistrarMedida(vault).executar('2026-08-10', { pesoKg: 82.4 })
    await vault.escrever(CAMINHOS.medida('2026-07-10'), 'isto não é json')

    const { medidas } = await carregar.executar()
    expect(medidas.map((m) => m.data)).toEqual(['2026-08-10'])
  })

  it('perfil ilegível não impede ler o histórico', async () => {
    await vault.escrever(CAMINHOS.perfil, '{"nome":"Sem idade"}')
    await new RegistrarMedida(vault).executar('2026-08-10', { pesoKg: 82.4 })

    const { perfil, medidas } = await carregar.executar()
    expect(perfil).toBeNull()
    expect(medidas).toHaveLength(1)
  })
})
