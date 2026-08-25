import { describe, expect, it } from 'vitest'
import { criarMedida } from './medida'
import { ordenarMedidas, ultimaMedida } from './historicoDeMedidas'

const agosto = criarMedida('2026-08-10', { pesoKg: 82 })
const julho = criarMedida('2026-07-10', { pesoKg: 84, circunferenciasCm: { cintura: 88 } })
const junho = criarMedida('2026-06-10', { pesoKg: 85 })

describe('ordenarMedidas', () => {
  it('põe a aferição mais recente primeiro', () => {
    const ordenadas = ordenarMedidas([junho, agosto, julho])
    expect(ordenadas.map((m) => m.data)).toEqual(['2026-08-10', '2026-07-10', '2026-06-10'])
  })

  it('não altera a lista recebida — derivado não muda a origem', () => {
    const original = [junho, agosto]
    ordenarMedidas(original)
    expect(original.map((m) => m.data)).toEqual(['2026-06-10', '2026-08-10'])
  })

  it('lida com histórico vazio', () => {
    expect(ordenarMedidas([])).toEqual([])
  })
})

describe('ultimaMedida', () => {
  it('devolve a aferição mais recente, seja qual for a ordem de entrada', () => {
    expect(ultimaMedida([junho, agosto, julho])?.data).toBe('2026-08-10')
  })

  it('devolve null quando o aluno ainda não se mediu', () => {
    expect(ultimaMedida([])).toBeNull()
  })
})
