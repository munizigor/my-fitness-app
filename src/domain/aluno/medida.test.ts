import { describe, expect, it } from 'vitest'
import { DataInvalidaError } from '../errors/DataInvalidaError'
import { MedidaInvalidaError } from '../errors/MedidaInvalidaError'
import { SCHEMA_VERSION_MEDIDA, criarMedida, lerMedida } from './medida'

const VALIDA = {
  schemaVersion: SCHEMA_VERSION_MEDIDA,
  data: '2026-08-10',
  pesoKg: 82.4,
  percentualGordura: 18,
  circunferenciasCm: { cintura: 84, braco: 38 },
}

describe('criarMedida', () => {
  it('cria uma aferição datada com o que foi medido', () => {
    const medida = criarMedida('2026-08-10', { pesoKg: 82.4 })
    expect(medida).toEqual({
      schemaVersion: SCHEMA_VERSION_MEDIDA,
      data: '2026-08-10',
      pesoKg: 82.4,
    })
  })

  it('guarda só o que foi medido — campo em branco não vira zero', () => {
    // Não medir a cintura é diferente de medir zero: o valor ausente some do
    // arquivo em vez de virar um ponto falso na série de Evolução.
    const medida = criarMedida('2026-08-10', { pesoKg: 82.4, circunferenciasCm: { cintura: 84 } })
    expect(medida.percentualGordura).toBeUndefined()
    expect(medida.circunferenciasCm).toEqual({ cintura: 84 })
  })

  it('recusa aferição sem nenhum valor — não é ponto na série', () => {
    expect(() => criarMedida('2026-08-10', {})).toThrow(MedidaInvalidaError)
  })

  it('recusa aferição cujas circunferências vieram todas vazias', () => {
    expect(() => criarMedida('2026-08-10', { circunferenciasCm: {} })).toThrow(MedidaInvalidaError)
  })

  it('recusa peso negativo', () => {
    expect(() => criarMedida('2026-08-10', { pesoKg: -1 })).toThrow(MedidaInvalidaError)
  })

  it('recusa data que não existe no calendário — o caminho do arquivo é a data', () => {
    expect(() => criarMedida('2026-02-30', { pesoKg: 82 })).toThrow(DataInvalidaError)
  })
})

describe('lerMedida', () => {
  it('lê uma aferição gravada pelo próprio app', () => {
    expect(lerMedida(VALIDA)).toEqual(VALIDA)
  })

  it('devolve null para o que não reconhece, sem lançar', () => {
    // Mesma escolha do registro diário: uma medida ilegível é problema nosso,
    // e não pode derrubar a tela inteira do aluno.
    expect(lerMedida({ schemaVersion: 99, data: '2026-08-10' })).toBeNull()
    expect(lerMedida('nada disso')).toBeNull()
    expect(lerMedida(null)).toBeNull()
  })

  it('devolve null para aferição com data impossível', () => {
    expect(lerMedida({ ...VALIDA, data: '2026-02-30' })).toBeNull()
  })

  it('ignora circunferência de vocabulário desconhecido em vez de aceitar qualquer rótulo', () => {
    // O vocabulário é controlado porque Evolução agrega por ele: "braço",
    // "Braço" e "braco" como três séries diferentes tornariam a soma inútil.
    const medida = lerMedida({
      ...VALIDA,
      circunferenciasCm: { cintura: 84, pescoco: 40 },
    })
    expect(medida?.circunferenciasCm).toEqual({ cintura: 84 })
  })
})
