import { beforeEach, describe, expect, it } from 'vitest'
import type { RegistroDiario } from '../domain/registro/registroDiario'
import { CAMINHOS } from '../domain/vault/caminhos'
import { InMemoryVaultStorage } from '../infrastructure/armazenamento/InMemoryVaultStorage'
import { RegistrarAgua } from './RegistrarAgua'
import { RegistrarConsumo } from './RegistrarConsumo'

const HOJE = '2026-08-24'

describe('RegistrarConsumo', () => {
  let vault: InMemoryVaultStorage
  let registrar: RegistrarConsumo

  beforeEach(() => {
    vault = new InMemoryVaultStorage()
    registrar = new RegistrarConsumo(vault, () => '2026-08-24T08:00:00.000Z')
  })

  async function refeicoes(data = HOJE): Promise<RegistroDiario['refeicoes']> {
    const bruto = await vault.ler(CAMINHOS.registro(data))
    return bruto === null ? [] : (JSON.parse(bruto) as RegistroDiario).refeicoes
  }

  it('grava o alimento que o aluno escolheu entre as alternativas', async () => {
    await registrar.executar(HOJE, { refeicaoId: '1', itemDeRefeicaoId: 'r1i1', alimento: 'Arroz' })

    expect(await refeicoes()).toEqual([
      {
        refeicaoId: '1',
        itens: [{ itemDeRefeicaoId: 'r1i1', alimento: 'Arroz' }],
        registradaEm: '2026-08-24T08:00:00.000Z',
      },
    ])
  })

  it('acumula os itens da mesma refeição num registro só', async () => {
    await registrar.executar(HOJE, { refeicaoId: '1', itemDeRefeicaoId: 'r1i1', alimento: 'Arroz' })
    await registrar.executar(HOJE, {
      refeicaoId: '1',
      itemDeRefeicaoId: 'r1i2',
      alimento: 'Frango',
    })

    const [primeira, ...resto] = await refeicoes()
    expect(resto).toEqual([])
    expect(primeira?.itens).toHaveLength(2)
  })

  it('separa refeições diferentes', async () => {
    await registrar.executar(HOJE, { refeicaoId: '1', itemDeRefeicaoId: 'r1i1', alimento: 'Arroz' })
    await registrar.executar(HOJE, {
      refeicaoId: '2',
      itemDeRefeicaoId: 'r2i1',
      alimento: 'Iogurte',
    })

    expect((await refeicoes()).map((r) => r.refeicaoId)).toEqual(['1', '2'])
  })

  it('trocar de alternativa substitui, em vez de registrar duas', async () => {
    await registrar.executar(HOJE, { refeicaoId: '1', itemDeRefeicaoId: 'r1i1', alimento: 'Arroz' })
    await registrar.executar(HOJE, {
      refeicaoId: '1',
      itemDeRefeicaoId: 'r1i1',
      alimento: 'Batata',
    })

    // O aluno mudou de ideia; ele não comeu os dois.
    const [primeira] = await refeicoes()
    expect(primeira?.itens).toEqual([{ itemDeRefeicaoId: 'r1i1', alimento: 'Batata' }])
  })

  it('desmarcar tira o item — quem tocou por engano precisa poder desfazer', async () => {
    await registrar.executar(HOJE, { refeicaoId: '1', itemDeRefeicaoId: 'r1i1', alimento: 'Arroz' })
    await registrar.executar(HOJE, {
      refeicaoId: '1',
      itemDeRefeicaoId: 'r1i2',
      alimento: 'Frango',
    })
    await registrar.executar(HOJE, { refeicaoId: '1', itemDeRefeicaoId: 'r1i1', alimento: null })

    const [primeira] = await refeicoes()
    expect(primeira?.itens).toEqual([{ itemDeRefeicaoId: 'r1i2', alimento: 'Frango' }])
  })

  it('desmarcar o último item apaga a refeição, em vez de deixar casca vazia', async () => {
    await registrar.executar(HOJE, { refeicaoId: '1', itemDeRefeicaoId: 'r1i1', alimento: 'Arroz' })
    await registrar.executar(HOJE, { refeicaoId: '1', itemDeRefeicaoId: 'r1i1', alimento: null })

    expect(await refeicoes()).toEqual([])
  })

  it('não apaga a água já registrada no mesmo dia', async () => {
    await new RegistrarAgua(vault).executar(HOJE, 1.5)
    await registrar.executar(HOJE, { refeicaoId: '1', itemDeRefeicaoId: 'r1i1', alimento: 'Arroz' })

    const bruto = await vault.ler(CAMINHOS.registro(HOJE))
    expect(JSON.parse(bruto!)).toMatchObject({ aguaLitros: 1.5 })
  })

  it('recusa data inválida em vez de corromper o índice do vault', async () => {
    await expect(
      registrar.executar('24/08/2026', {
        refeicaoId: '1',
        itemDeRefeicaoId: 'r1i1',
        alimento: 'Arroz',
      })
    ).rejects.toThrow()
  })
})
