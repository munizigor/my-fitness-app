import { describe, expect, it } from 'vitest'
import { SCHEMA_VERSION_REGISTRO } from '../registro/migracoes'
import type { RegistroDiario } from '../registro/registroDiario'
import type { ArquivoDePlano } from '../schema/arquivoDePlano'
import { recordesDoDia } from './recorde'

const PLANO = {
  treino: {
    exercicios: [
      { id: 'supino', nome: 'Supino Inclinado', gruposMusculares: ['peito'] },
      { id: 'remada', nome: 'Remada Curvada', gruposMusculares: ['costas'] },
    ],
    sessoes: [
      {
        id: 'a',
        rotulo: 'Treino A',
        itens: [
          { id: 'a1', exercicioId: 'supino', series: 4, execucao: { tipo: 'tempo', segundos: 60 } },
          { id: 'a2', exercicioId: 'remada', series: 4, execucao: { tipo: 'tempo', segundos: 60 } },
        ],
      },
    ],
    agendaSemanal: {},
  },
} as unknown as ArquivoDePlano['plano']

function registro(data: string, series: RegistroDiario['series']): RegistroDiario {
  return { schemaVersion: SCHEMA_VERSION_REGISTRO, data, aguaLitros: 0, series, refeicoes: [] }
}

function serie(itemDeTreinoId: string, indice: number, cargaKg?: number) {
  return {
    itemDeTreinoId,
    indice,
    ...(cargaKg === undefined ? {} : { cargaKg }),
    repeticoes: 10,
    concluidaEm: '2026-08-25T10:00:00.000Z',
  }
}

describe('recordesDoDia', () => {
  describe('o que é recorde', () => {
    it('a carga de hoje passou tudo o que ele já levantou', () => {
      const historico = [
        registro('2026-08-11', [serie('a1', 1, 60)]),
        registro('2026-08-18', [serie('a1', 1, 62.5)]),
        registro('2026-08-25', [serie('a1', 1, 65)]),
      ]

      expect(recordesDoDia(PLANO, historico, '2026-08-25')).toEqual([
        { exercicioId: 'supino', nome: 'Supino Inclinado', cargaKg: 65, anteriorKg: 62.5 },
      ])
    })

    it('empatar com a melhor marca não é recorde', () => {
      const historico = [
        registro('2026-08-18', [serie('a1', 1, 62.5)]),
        registro('2026-08-25', [serie('a1', 1, 62.5)]),
      ]
      // Um marco que acontece toda semana deixa de ser marco.
      expect(recordesDoDia(PLANO, historico, '2026-08-25')).toEqual([])
    })

    it('a primeira vez que ele faz o exercício não é recorde', () => {
      const historico = [registro('2026-08-25', [serie('a1', 1, 60)])]
      // Sem passado não há o que superar, e "recorde!" no primeiro dia de todos
      // os exercícios do treino é confete, não evidência.
      expect(recordesDoDia(PLANO, historico, '2026-08-25')).toEqual([])
    })

    it('a maior carga do dia é a que conta, não a última', () => {
      const historico = [
        registro('2026-08-18', [serie('a1', 1, 60)]),
        registro('2026-08-25', [serie('a1', 1, 65), serie('a1', 2, 62.5)]),
      ]
      // Cair na série seguinte é normal; o recorde já aconteceu.
      expect(recordesDoDia(PLANO, historico, '2026-08-25')[0]?.cargaKg).toBe(65)
    })

    it('compara com a maior de todas, não com a do último treino', () => {
      const historico = [
        registro('2026-06-02', [serie('a1', 1, 70)]),
        registro('2026-08-18', [serie('a1', 1, 60)]),
        registro('2026-08-25', [serie('a1', 1, 65)]),
      ]
      // Voltar de uma pausa e superar o treino passado não é recorde pessoal.
      expect(recordesDoDia(PLANO, historico, '2026-08-25')).toEqual([])
    })

    it('reconhece mais de um recorde no mesmo dia', () => {
      const historico = [
        registro('2026-08-18', [serie('a1', 1, 60), serie('a2', 1, 40)]),
        registro('2026-08-25', [serie('a1', 1, 65), serie('a2', 1, 45)]),
      ]

      expect(recordesDoDia(PLANO, historico, '2026-08-25').map((r) => r.exercicioId)).toEqual([
        'supino',
        'remada',
      ])
    })
  })

  describe('o que não conta', () => {
    it('dia sem treino não tem recorde', () => {
      const historico = [registro('2026-08-18', [serie('a1', 1, 60)])]
      expect(recordesDoDia(PLANO, historico, '2026-08-25')).toEqual([])
    })

    it('série sem carga não vira recorde', () => {
      const historico = [
        registro('2026-08-18', [serie('a1', 1, 60)]),
        registro('2026-08-25', [serie('a1', 1, undefined)]),
      ]
      expect(recordesDoDia(PLANO, historico, '2026-08-25')).toEqual([])
    })

    it('carga registrada depois do dia não estraga o recorde de hoje', () => {
      // O histórico é lido inteiro, e o vault pode ter o registro de amanhã se
      // o aluno mexeu no relógio ou viajou de fuso.
      const historico = [
        registro('2026-08-18', [serie('a1', 1, 60)]),
        registro('2026-08-25', [serie('a1', 1, 65)]),
        registro('2026-08-26', [serie('a1', 1, 70)]),
      ]
      expect(recordesDoDia(PLANO, historico, '2026-08-25')[0]?.cargaKg).toBe(65)
    })

    it('aguenta histórico vazio', () => {
      expect(recordesDoDia(PLANO, [], '2026-08-25')).toEqual([])
    })
  })
})
