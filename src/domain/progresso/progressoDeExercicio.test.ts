import { describe, expect, it } from 'vitest'
import { SCHEMA_VERSION_REGISTRO } from '../registro/migracoes'
import type { RegistroDiario } from '../registro/registroDiario'
import type { ArquivoDePlano } from '../schema/arquivoDePlano'
import { progressoPorExercicio } from './progressoDeExercicio'

/**
 * Um plano mínimo de treino: dois exercícios, e a Prancha Lateral prescrita
 * duas vezes na mesma sessão — um lado em cada — que é o caso que separa
 * agregar por exercício de agregar por item prescrito.
 */
const PLANO = {
  treino: {
    descansoEntreSeries: { minSegundos: 60, maxSegundos: 70 },
    exercicios: [
      { id: 'supino', nome: 'Supino Inclinado', gruposMusculares: ['peito'] },
      { id: 'prancha', nome: 'Prancha Lateral', gruposMusculares: ['abdomen'] },
    ],
    sessoes: [
      {
        id: 'a',
        rotulo: 'Treino A',
        itens: [
          { id: 'a1', exercicioId: 'supino', series: 4, execucao: rep() },
          { id: 'a2', exercicioId: 'prancha', series: 2, execucao: tempo() },
          { id: 'a3', exercicioId: 'prancha', series: 2, execucao: tempo() },
        ],
      },
      {
        id: 'b',
        rotulo: 'Treino B',
        itens: [{ id: 'b1', exercicioId: 'supino', series: 3, execucao: rep() }],
      },
    ],
    agendaSemanal: {},
  },
} as unknown as ArquivoDePlano['plano']

function rep() {
  return { tipo: 'repeticoes', min: 10, max: 12 } as const
}

function tempo() {
  return { tipo: 'tempo', segundos: 60 } as const
}

function registro(data: string, series: RegistroDiario['series']): RegistroDiario {
  return { schemaVersion: SCHEMA_VERSION_REGISTRO, data, aguaLitros: 0, series, refeicoes: [] }
}

function serie(
  itemDeTreinoId: string,
  indice: number,
  cargaKg?: number,
  repeticoes?: number
): RegistroDiario['series'][number] {
  return {
    itemDeTreinoId,
    indice,
    ...(cargaKg === undefined ? {} : { cargaKg }),
    ...(repeticoes === undefined ? {} : { repeticoes }),
    concluidaEm: '2026-08-25T10:00:00.000Z',
  }
}

function doSupino(progresso: ReturnType<typeof progressoPorExercicio>) {
  const supino = progresso.find((p) => p.exercicioId === 'supino')
  if (!supino) throw new Error('o supino sumiu do progresso')
  return supino
}

describe('progressoPorExercicio', () => {
  describe('a sessão como unidade', () => {
    it('resume cada dia treinado em carga máxima, volume e número de séries', () => {
      const historico = [
        registro('2026-08-04', [serie('a1', 1, 60, 12), serie('a1', 2, 60, 10)]),
      ]

      const [supino] = progressoPorExercicio(PLANO, historico)

      expect(supino?.sessoes).toEqual([
        { data: '2026-08-04', cargaMaxKg: 60, volumeKg: 60 * 12 + 60 * 10, series: 2 },
      ])
    })

    it('ordena as sessões da mais antiga para a mais recente, venha como vier', () => {
      const historico = [
        registro('2026-09-01', [serie('a1', 1, 70, 10)]),
        registro('2026-08-04', [serie('a1', 1, 60, 10)]),
      ]

      const datas = doSupino(progressoPorExercicio(PLANO, historico)).sessoes.map((s) => s.data)
      // A leitura é uma trajetória: começa onde ele começou.
      expect(datas).toEqual(['2026-08-04', '2026-09-01'])
    })

    it('junta num só dia as duas prescrições do mesmo exercício', () => {
      // Os dois lados da prancha são itens diferentes, mas um exercício só: no
      // histórico de evolução eles não podem virar duas trajetórias.
      const historico = [registro('2026-08-04', [serie('a2', 1, 10, 30), serie('a3', 1, 8, 30)])]

      const prancha = progressoPorExercicio(PLANO, historico).find(
        (p) => p.exercicioId === 'prancha'
      )
      expect(prancha?.sessoes[0]).toEqual({
        data: '2026-08-04',
        cargaMaxKg: 10,
        volumeKg: 10 * 30 + 8 * 30,
        series: 2,
      })
    })

    it('junta o mesmo exercício prescrito em treinos diferentes', () => {
      // Supino no Treino A e no Treino B é a mesma trajetória de carga.
      const historico = [
        registro('2026-08-04', [serie('a1', 1, 60, 10)]),
        registro('2026-08-07', [serie('b1', 1, 62.5, 10)]),
      ]

      expect(doSupino(progressoPorExercicio(PLANO, historico)).sessoes).toHaveLength(2)
    })
  })

  describe('o que não dá para contar', () => {
    it('série sem carga não inventa carga máxima', () => {
      const historico = [registro('2026-08-04', [serie('a2', 1, undefined, 60)])]

      const prancha = progressoPorExercicio(PLANO, historico).find(
        (p) => p.exercicioId === 'prancha'
      )
      expect(prancha?.sessoes[0]?.cargaMaxKg).toBeUndefined()
      // Sem carga não há volume levantado — e zero é um número honesto aqui.
      expect(prancha?.sessoes[0]?.volumeKg).toBe(0)
      expect(prancha?.sessoes[0]?.series).toBe(1)
    })

    it('ignora série que aponta para um item que o plano de hoje não tem', () => {
      // O aluno trocou de plano; o registro antigo continua no vault.
      const historico = [registro('2026-08-04', [serie('sumiu', 1, 60, 10)])]
      expect(progressoPorExercicio(PLANO, historico)).toEqual([])
    })

    it('não devolve exercício que o aluno nunca registrou', () => {
      const historico = [registro('2026-08-04', [serie('a1', 1, 60, 10)])]
      expect(progressoPorExercicio(PLANO, historico).map((p) => p.exercicioId)).toEqual(['supino'])
    })

    it('aguenta histórico vazio', () => {
      expect(progressoPorExercicio(PLANO, [])).toEqual([])
    })
  })

  describe('a variação, que é o que vira frase', () => {
    it('com duas sessões, compara a primeira com a última', () => {
      const historico = [
        registro('2026-08-04', [serie('a1', 1, 50, 10)]),
        registro('2026-09-01', [serie('a1', 1, 56, 10)]),
      ]

      expect(doSupino(progressoPorExercicio(PLANO, historico)).carga).toEqual({
        de: 50,
        para: 56,
        diferenca: 6,
        percentual: 12,
        desde: '2026-08-04',
        semanas: 4,
      })
    })

    it('mede o volume da mesma forma que a carga', () => {
      const historico = [
        registro('2026-08-04', [serie('a1', 1, 50, 10)]),
        registro('2026-08-18', [serie('a1', 1, 50, 10), serie('a1', 2, 50, 10)]),
      ]

      expect(doSupino(progressoPorExercicio(PLANO, historico)).volume).toMatchObject({
        de: 500,
        para: 1000,
        diferenca: 500,
        percentual: 100,
        semanas: 2,
      })
    })

    it('com uma sessão só, não há variação para mostrar', () => {
      const historico = [registro('2026-08-04', [serie('a1', 1, 60, 10)])]

      const supino = doSupino(progressoPorExercicio(PLANO, historico))
      expect(supino.carga).toBeNull()
      expect(supino.volume).toBeNull()
      // A sessão isolada continua lá: é o ponto de partida dele.
      expect(supino.sessoes).toHaveLength(1)
    })

    it('cair de carga também é variação, e aparece negativa', () => {
      const historico = [
        registro('2026-08-04', [serie('a1', 1, 60, 10)]),
        registro('2026-08-11', [serie('a1', 1, 54, 10)]),
      ]
      // Esconder a queda seria mentir para quem voltou de uma lesão.
      expect(doSupino(progressoPorExercicio(PLANO, historico)).carga).toMatchObject({
        diferenca: -6,
        percentual: -10,
      })
    })

    it('compara só as sessões em que houve carga', () => {
      const historico = [
        registro('2026-08-04', [serie('a1', 1, 50, 10)]),
        registro('2026-08-11', [serie('a1', 1, undefined, 10)]),
        registro('2026-08-18', [serie('a1', 1, 60, 10)]),
      ]
      // O dia sem carga registrada não pode virar "você caiu para zero".
      expect(doSupino(progressoPorExercicio(PLANO, historico)).carga).toMatchObject({
        de: 50,
        para: 60,
        semanas: 2,
      })
    })

    it('sem percentual quando a origem é zero, mas com a diferença', () => {
      // Peso corporal registrado como 0 kg: dividir por zero daria Infinity na
      // tela. A diferença absoluta continua sendo verdade.
      const historico = [
        registro('2026-08-04', [serie('a1', 1, 0, 10)]),
        registro('2026-08-11', [serie('a1', 1, 10, 10)]),
      ]

      expect(doSupino(progressoPorExercicio(PLANO, historico)).carga).toMatchObject({
        de: 0,
        para: 10,
        diferenca: 10,
        percentual: null,
      })
    })

    it('não arrasta dízima para a tela', () => {
      const historico = [
        registro('2026-08-04', [serie('a1', 1, 30, 10)]),
        registro('2026-08-11', [serie('a1', 1, 32.5, 10)]),
      ]
      // 8,333…% viraria "8.333333333333332%" em qualquer formatação ingênua.
      expect(doSupino(progressoPorExercicio(PLANO, historico)).carga?.percentual).toBe(8.3)
    })
  })

  describe('a ordem em que a tela lê', () => {
    it('o exercício treinado mais recentemente vem primeiro', () => {
      const historico = [
        registro('2026-08-04', [serie('a2', 1, 10, 30)]),
        registro('2026-09-01', [serie('a1', 1, 60, 10)]),
      ]

      expect(progressoPorExercicio(PLANO, historico).map((p) => p.exercicioId)).toEqual([
        'supino',
        'prancha',
      ])
    })

    it('leva o nome do exercício junto, que é o que o aluno lê', () => {
      const historico = [registro('2026-08-04', [serie('a1', 1, 60, 10)])]
      expect(doSupino(progressoPorExercicio(PLANO, historico)).nome).toBe('Supino Inclinado')
    })
  })
})
