import { describe, expect, it } from 'vitest'
import { SCHEMA_VERSION_REGISTRO } from '../registro/migracoes'
import type { RegistroDiario } from '../registro/registroDiario'
import type { ItemDeTreino } from '../schema/arquivoDePlano'
import { sugerirCarga } from './sugerirCarga'

const ITEM: ItemDeTreino = {
  id: 'a1',
  exercicioId: 'supino',
  series: 4,
  execucao: { tipo: 'repeticoes', min: 10, max: 12 },
}

const ITEM_COM_ALVO: ItemDeTreino = { ...ITEM, id: 'a2', cargaAlvoKg: 40 }

function registro(data: string, series: RegistroDiario['series']): RegistroDiario {
  return {
    schemaVersion: SCHEMA_VERSION_REGISTRO,
    data,
    aguaLitros: 0,
    series,
    refeicoes: [],
  }
}

function serie(itemDeTreinoId: string, indice: number, cargaKg?: number) {
  return { itemDeTreinoId, indice, cargaKg, repeticoes: 10, concluidaEm: `${data(indice)}` }
}

function data(n: number) {
  return `2026-08-${String(10 + n).padStart(2, '0')}T10:00:00.000Z`
}

describe('sugerirCarga', () => {
  describe('a cascata: o padrão já é a resposta certa', () => {
    it('usa a última carga que o aluno de fato registrou', () => {
      const historico = [
        registro('2026-08-17', [serie('a1', 1, 60), serie('a1', 2, 62.5)]),
        registro('2026-08-10', [serie('a1', 1, 55)]),
      ]
      // Na academia o aluno confirma, não digita.
      expect(sugerirCarga(historico, ITEM)).toBe(62.5)
    })

    it('cai para a carga que o profissional prescreveu quando não há histórico', () => {
      expect(sugerirCarga([], ITEM_COM_ALVO)).toBe(40)
    })

    it('devolve undefined quando não há histórico nem prescrição', () => {
      // Melhor campo vazio que número inventado: carga errada machuca.
      expect(sugerirCarga([], ITEM)).toBeUndefined()
    })

    it('o histórico do aluno vence a prescrição do profissional', () => {
      const historico = [registro('2026-08-17', [serie('a2', 1, 50)])]
      // O profissional prescreveu 40; o aluno já está levantando 50.
      expect(sugerirCarga(historico, ITEM_COM_ALVO)).toBe(50)
    })
  })

  describe('não mistura o que não deve', () => {
    it('ignora séries de outro exercício', () => {
      const historico = [registro('2026-08-17', [serie('outro', 1, 100), serie('a1', 1, 60)])]
      expect(sugerirCarga(historico, ITEM)).toBe(60)
    })

    it('separa duas prescrições do mesmo exercício — os dois lados da prancha', () => {
      // Prancha Lateral aparece duas vezes na sessão, com ids distintos. Se a
      // sugestão casasse pelo exercício, os lados se contaminariam.
      const direito: ItemDeTreino = { ...ITEM, id: 'a3', exercicioId: 'prancha' }
      const esquerdo: ItemDeTreino = { ...ITEM, id: 'a4', exercicioId: 'prancha' }
      const historico = [registro('2026-08-17', [serie('a3', 1, 10), serie('a4', 1, 8)])]

      expect(sugerirCarga(historico, direito)).toBe(10)
      expect(sugerirCarga(historico, esquerdo)).toBe(8)
    })

    it('ignora séries sem carga, como as de tempo', () => {
      const historico = [
        registro('2026-08-17', [serie('a1', 1, undefined)]),
        registro('2026-08-10', [serie('a1', 1, 55)]),
      ]
      expect(sugerirCarga(historico, ITEM)).toBe(55)
    })
  })

  describe('ordem no tempo', () => {
    it('a mais recente vence, mesmo se o histórico vier desordenado', () => {
      const historico = [
        registro('2026-08-10', [serie('a1', 1, 55)]),
        registro('2026-08-17', [serie('a1', 1, 60)]),
        registro('2026-08-03', [serie('a1', 1, 50)]),
      ]
      expect(sugerirCarga(historico, ITEM)).toBe(60)
    })

    it('dentro do mesmo dia, a última série vence', () => {
      const historico = [
        registro('2026-08-17', [serie('a1', 1, 60), serie('a1', 2, 62.5), serie('a1', 3, 65)]),
      ]
      expect(sugerirCarga(historico, ITEM)).toBe(65)
    })

    it('aguenta histórico vazio sem quebrar', () => {
      expect(sugerirCarga([], ITEM)).toBeUndefined()
    })
  })
})
