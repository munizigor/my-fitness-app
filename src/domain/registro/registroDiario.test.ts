import { describe, expect, it } from 'vitest'
import { SCHEMA_VERSION_REGISTRO } from './migracoes'
import { lerRegistroDiario, registroVazio } from './registroDiario'

const VALIDO = {
  schemaVersion: SCHEMA_VERSION_REGISTRO,
  data: '2026-08-24',
  aguaLitros: 1.5,
  series: [
    {
      itemDeTreinoId: 'a1',
      indice: 1,
      cargaKg: 60,
      repeticoes: 12,
      concluidaEm: '2026-08-24T10:00:00.000Z',
    },
  ],
  refeicoes: [
    {
      refeicaoId: '1',
      itens: [{ itemDeRefeicaoId: 'r1i1', alimento: 'Arroz' }],
      registradaEm: '2026-08-24T08:00:00.000Z',
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

  it('lê a água do dia', () => {
    expect(lerRegistroDiario(VALIDO)?.aguaLitros).toBe(1.5)
  })

  it('lê a refeição consumida com a alternativa que o aluno escolheu', () => {
    const refeicao = lerRegistroDiario(VALIDO)?.refeicoes[0]
    expect(refeicao?.refeicaoId).toBe('1')
    // Pelo nome do alimento, e não pelo índice da opção: o profissional pode
    // reordenar as alternativas no próximo plano, e o que o aluno comeu
    // ontem não pode mudar de significado por causa disso. Também é o que
    // deixa o arquivo legível para quem o abrir num editor.
    expect(refeicao?.itens[0]).toEqual({ itemDeRefeicaoId: 'r1i1', alimento: 'Arroz' })
  })

  it('lê o registro da versão anterior, que não sabia de água nem refeição', () => {
    const v2 = { schemaVersion: 2, data: '2026-08-24', series: VALIDO.series }
    const registro = lerRegistroDiario(v2)

    // Quem treinou ontem não perde o treino de ontem porque o app mudou.
    expect(registro?.series).toHaveLength(1)
    expect(registro?.aguaLitros).toBe(0)
    expect(registro?.refeicoes).toEqual([])
  })

  describe('nunca deixa um registro ilegível derrubar o treino', () => {
    it.each([
      ['nulo', null],
      ['texto solto', 'nada'],
      ['sem data', { schemaVersion: SCHEMA_VERSION_REGISTRO, series: [] }],
      [
        'data malformada',
        { schemaVersion: SCHEMA_VERSION_REGISTRO, data: '24/08/2026', series: [] },
      ],
      ['versão futura', { ...VALIDO, schemaVersion: 99 }],
      [
        'série sem exercício',
        { ...VALIDO, series: [{ indice: 1, concluidaEm: '2026-08-24T10:00:00.000Z' }] },
      ],
      ['água negativa', { ...VALIDO, aguaLitros: -1 }],
    ])('devolve null para registro %s', (_caso, entrada) => {
      // O aluno está no meio da série. Melhor recomeçar o registro do dia do que
      // ver o app quebrar segurando a barra.
      expect(lerRegistroDiario(entrada)).toBeNull()
    })
  })
})

describe('registroVazio', () => {
  it('começa o dia sem nada registrado', () => {
    const registro = registroVazio('2026-08-24')
    expect(registro.data).toBe('2026-08-24')
    expect(registro.series).toEqual([])
    expect(registro.refeicoes).toEqual([])
    expect(registro.aguaLitros).toBe(0)
  })

  it('recusa data inválida em vez de criar um registro órfão', () => {
    // O caminho do arquivo é a data. Uma data inválida corromperia o índice.
    expect(() => registroVazio('24/08/2026')).toThrow()
  })
})
