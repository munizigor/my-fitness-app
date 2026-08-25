import { describe, expect, it } from 'vitest'
import { lerRegistroDiario, registroVazio } from './registroDiario'

const VALIDO = {
  schemaVersion: 2,
  data: '2026-08-24',
  series: [
    {
      itemDeTreinoId: 'a1',
      indice: 1,
      cargaKg: 60,
      repeticoes: 12,
      concluidaEm: '2026-08-24T10:00:00.000Z',
    },
  ],
}

describe('lerRegistroDiario', () => {
  it('lê um registro gravado pelo próprio app', () => {
    const registro = lerRegistroDiario(VALIDO)
    expect(registro?.series[0]).toMatchObject({ itemDeTreinoId: 'a1', cargaKg: 60, repeticoes: 12 })
  })

  it('aceita série de tempo, sem repetições nem carga', () => {
    const registro = lerRegistroDiario({
      ...VALIDO,
      series: [
        { itemDeTreinoId: 'a3', indice: 1, segundos: 60, concluidaEm: '2026-08-24T10:05:00.000Z' },
      ],
    })
    expect(registro?.series[0]).toMatchObject({ segundos: 60 })
  })

  describe('nunca deixa um registro ilegível derrubar o treino', () => {
    it.each([
      ['nulo', null],
      ['texto solto', 'nada'],
      ['sem data', { schemaVersion: 2, series: [] }],
      ['data malformada', { schemaVersion: 2, data: '24/08/2026', series: [] }],
      ['versão futura', { ...VALIDO, schemaVersion: 99 }],
      [
        'série sem exercício',
        { ...VALIDO, series: [{ indice: 1, concluidaEm: '2026-08-24T10:00:00.000Z' }] },
      ],
    ])('devolve null para registro %s', (_caso, entrada) => {
      // O aluno está no meio da série. Melhor recomeçar o registro do dia do que
      // ver o app quebrar segurando a barra.
      expect(lerRegistroDiario(entrada)).toBeNull()
    })
  })
})

describe('registroVazio', () => {
  it('começa o dia sem nenhuma série', () => {
    const registro = registroVazio('2026-08-24')
    expect(registro.data).toBe('2026-08-24')
    expect(registro.series).toEqual([])
  })

  it('recusa data inválida em vez de criar um registro órfão', () => {
    // O caminho do arquivo é a data. Uma data inválida corromperia o índice.
    expect(() => registroVazio('24/08/2026')).toThrow()
  })
})
