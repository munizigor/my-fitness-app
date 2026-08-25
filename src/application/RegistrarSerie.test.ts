import { beforeEach, describe, expect, it } from 'vitest'
import { CAMINHOS } from '../domain/vault/caminhos'
import { InMemoryVaultStorage } from '../infrastructure/armazenamento/InMemoryVaultStorage'
import { CarregarHistorico } from './CarregarHistorico'
import { RegistrarSerie } from './RegistrarSerie'

describe('RegistrarSerie', () => {
  let vault: InMemoryVaultStorage
  let registrar: RegistrarSerie

  beforeEach(() => {
    vault = new InMemoryVaultStorage()
    registrar = new RegistrarSerie(vault, () => '2026-08-24T10:00:00.000Z')
  })

  async function seriesGravadas(data = '2026-08-24') {
    const bruto = await vault.ler(CAMINHOS.registro(data))
    return bruto === null ? null : (JSON.parse(bruto) as { series: unknown[] }).series
  }

  describe('grava a cada série, não ao fim do treino', () => {
    it('a primeira série já está no vault', async () => {
      await registrar.executar('2026-08-24', {
        itemDeTreinoId: 'a1',
        indice: 1,
        cargaKg: 60,
        repeticoes: 12,
      })

      // Se o app fechasse agora, esta série estaria salva.
      expect(await seriesGravadas()).toHaveLength(1)
    })

    it('acumula as séries seguintes no mesmo dia', async () => {
      await registrar.executar('2026-08-24', { itemDeTreinoId: 'a1', indice: 1, cargaKg: 60 })
      await registrar.executar('2026-08-24', { itemDeTreinoId: 'a1', indice: 2, cargaKg: 60 })
      await registrar.executar('2026-08-24', { itemDeTreinoId: 'a2', indice: 1, cargaKg: 30 })

      expect(await seriesGravadas()).toHaveLength(3)
    })

    it('grava em arquivo por dia — o caminho é o índice', async () => {
      await registrar.executar('2026-08-24', { itemDeTreinoId: 'a1', indice: 1 })
      await registrar.executar('2026-08-25', { itemDeTreinoId: 'a1', indice: 1 })

      expect(await vault.listar(CAMINHOS.registros)).toEqual([
        'vault/registros/2026-08-24.json',
        'vault/registros/2026-08-25.json',
      ])
    })

    it('grava JSON indentado — o vault é para ser lido por gente', async () => {
      await registrar.executar('2026-08-24', { itemDeTreinoId: 'a1', indice: 1 })
      expect(await vault.ler(CAMINHOS.registro('2026-08-24'))).toContain('\n  ')
    })
  })

  describe('corrigir não é duplicar', () => {
    it('reregistrar a mesma série substitui a anterior', async () => {
      await registrar.executar('2026-08-24', { itemDeTreinoId: 'a1', indice: 1, cargaKg: 60 })
      await registrar.executar('2026-08-24', { itemDeTreinoId: 'a1', indice: 1, cargaKg: 65 })

      // O aluno errou a carga e tocou de novo: está corrigindo.
      const series = (await seriesGravadas()) as { cargaKg: number }[]
      expect(series).toHaveLength(1)
      expect(series[0]!.cargaKg).toBe(65)
    })

    it('séries diferentes do mesmo exercício continuam separadas', async () => {
      await registrar.executar('2026-08-24', { itemDeTreinoId: 'a1', indice: 1, cargaKg: 60 })
      await registrar.executar('2026-08-24', { itemDeTreinoId: 'a1', indice: 2, cargaKg: 60 })
      expect(await seriesGravadas()).toHaveLength(2)
    })

    it('o mesmo índice de exercícios diferentes não colide', async () => {
      await registrar.executar('2026-08-24', { itemDeTreinoId: 'a1', indice: 1, cargaKg: 60 })
      await registrar.executar('2026-08-24', { itemDeTreinoId: 'a2', indice: 1, cargaKg: 30 })
      expect(await seriesGravadas()).toHaveLength(2)
    })
  })

  describe('formas de série', () => {
    it('grava série de tempo sem carga nem repetições', async () => {
      await registrar.executar('2026-08-24', { itemDeTreinoId: 'a3', indice: 1, segundos: 60 })
      const series = (await seriesGravadas()) as Record<string, unknown>[]
      expect(series[0]).toMatchObject({ segundos: 60 })
      expect(series[0]).not.toHaveProperty('cargaKg')
    })

    it('grava peso corporal como carga zero, que é diferente de não registrar', async () => {
      await registrar.executar('2026-08-24', { itemDeTreinoId: 'a1', indice: 1, cargaKg: 0 })
      const series = (await seriesGravadas()) as Record<string, unknown>[]
      expect(series[0]).toHaveProperty('cargaKg', 0)
    })

    it('carimba o instante da conclusão', async () => {
      await registrar.executar('2026-08-24', { itemDeTreinoId: 'a1', indice: 1 })
      const series = (await seriesGravadas()) as { concluidaEm: string }[]
      expect(series[0]!.concluidaEm).toBe('2026-08-24T10:00:00.000Z')
    })

    it('usa o relógio real quando nenhum é injetado', async () => {
      const semRelogio = new RegistrarSerie(vault)
      await semRelogio.executar('2026-08-24', { itemDeTreinoId: 'a1', indice: 1 })
      const series = (await seriesGravadas()) as { concluidaEm: string }[]
      expect(series[0]!.concluidaEm).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })
  })

  describe('registro corrompido não impede o aluno de treinar', () => {
    it('recomeça o dia quando o arquivo não é JSON', async () => {
      await vault.escrever(CAMINHOS.registro('2026-08-24'), '{ lixo')
      await registrar.executar('2026-08-24', { itemDeTreinoId: 'a1', indice: 1, cargaKg: 60 })
      expect(await seriesGravadas()).toHaveLength(1)
    })

    it('recomeça o dia quando o formato é desconhecido', async () => {
      await vault.escrever(CAMINHOS.registro('2026-08-24'), '{"schemaVersion":99}')
      await registrar.executar('2026-08-24', { itemDeTreinoId: 'a1', indice: 1, cargaKg: 60 })
      expect(await seriesGravadas()).toHaveLength(1)
    })
  })
})

describe('CarregarHistorico', () => {
  let vault: InMemoryVaultStorage

  beforeEach(() => {
    vault = new InMemoryVaultStorage()
  })

  async function semear(datas: string[]) {
    const registrar = new RegistrarSerie(vault, () => '2026-08-24T10:00:00.000Z')
    for (const data of datas) {
      await registrar.executar(data, { itemDeTreinoId: 'a1', indice: 1, cargaKg: 60 })
    }
  }

  it('vault vazio devolve histórico vazio, não erro', async () => {
    await expect(new CarregarHistorico(vault).executar()).resolves.toEqual([])
  })

  it('traz os registros existentes', async () => {
    await semear(['2026-08-10', '2026-08-17'])
    const historico = await new CarregarHistorico(vault).executar()
    expect(historico.map((r) => r.data).sort()).toEqual(['2026-08-10', '2026-08-17'])
  })

  it('limita quantos dias olha para trás', async () => {
    await semear(['2026-08-10', '2026-08-17', '2026-08-24'])
    const historico = await new CarregarHistorico(vault).executar(2)
    // Os mais recentes, porque o caminho é a data e ordenar nomes basta.
    expect(historico.map((r) => r.data).sort()).toEqual(['2026-08-17', '2026-08-24'])
  })

  it('um registro ilegível não invalida os outros', async () => {
    await semear(['2026-08-17'])
    await vault.escrever(CAMINHOS.registro('2026-08-18'), '{ lixo')

    const historico = await new CarregarHistorico(vault).executar()
    expect(historico.map((r) => r.data)).toEqual(['2026-08-17'])
  })

  it('ignora registro de formato desconhecido sem derrubar o resto', async () => {
    await semear(['2026-08-17'])
    await vault.escrever(CAMINHOS.registro('2026-08-18'), '{"schemaVersion":99,"series":[]}')

    expect(await new CarregarHistorico(vault).executar()).toHaveLength(1)
  })
})
