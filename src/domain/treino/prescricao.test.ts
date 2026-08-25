import { describe, expect, it } from 'vitest'
import { PrescricaoInvalidaError } from '../errors/PrescricaoInvalidaError'
import { analisarPrescricao } from './prescricao'

describe('analisarPrescricao', () => {
  describe('casos reais da planilha', () => {
    // Extraídos da planilha de assessoria esportiva em uso. São a única
    // definição de "correto" que existe: se o parser falhar aqui, o aluno
    // vê o treino errado.
    it.each([
      ['3x10a12', 3, 10, 12],
      ['4x10a12', 4, 10, 12],
    ])('%s são %i séries de %i a %i repetições', (texto, series, min, max) => {
      const p = analisarPrescricao(texto)
      expect(p).toEqual({
        tipo: 'repeticoes',
        series,
        repeticoes: { min, max },
        textoOriginal: texto,
      })
    })

    it.each([
      ['2x60', 2, 60],
      ['3x60', 3, 60],
    ])("%s' são %i séries de %i segundos", (base, series, segundos) => {
      const texto = `${base}'`
      const p = analisarPrescricao(texto)
      expect(p).toEqual({ tipo: 'tempo', series, segundos, textoOriginal: texto })
    })
  })

  describe('tolerância ao que um humano digita numa planilha', () => {
    it('aceita espaços em volta dos separadores', () => {
      expect(analisarPrescricao(' 3 x 10 a 12 ')).toMatchObject({
        tipo: 'repeticoes',
        series: 3,
        repeticoes: { min: 10, max: 12 },
      })
    })

    it('aceita maiúsculas', () => {
      expect(analisarPrescricao('3X10A12')).toMatchObject({
        tipo: 'repeticoes',
        series: 3,
        repeticoes: { min: 10, max: 12 },
      })
    })

    it('aceita repetição fixa como faixa degenerada', () => {
      expect(analisarPrescricao('3x12')).toMatchObject({
        tipo: 'repeticoes',
        series: 3,
        repeticoes: { min: 12, max: 12 },
      })
    })

    it('aceita o apóstrofo tipográfico, que corretores automáticos inserem', () => {
      expect(analisarPrescricao('2x60’')).toMatchObject({ tipo: 'tempo', segundos: 60 })
    })
  })

  describe('falha explicitamente, nunca em silêncio', () => {
    it.each([
      ['', 'texto vazio'],
      ['   ', 'só espaços'],
      ['DESCER ATÉ O TALO', 'técnica avançada na coluna errada'],
      ['2 cada lado', 'qualificador de execução, não prescrição'],
      ['3x', 'repetições ausentes'],
      ['x10a12', 'séries ausentes'],
      ['3x10a', 'limite superior ausente'],
      ['abc', 'lixo'],
    ])('rejeita %j (%s)', (texto) => {
      expect(() => analisarPrescricao(texto)).toThrow(PrescricaoInvalidaError)
    })

    it('rejeita zero séries — não existe exercício de zero séries', () => {
      expect(() => analisarPrescricao('0x10a12')).toThrow(PrescricaoInvalidaError)
    })

    it('rejeita faixa invertida — 12 a 10 é erro de digitação do profissional', () => {
      expect(() => analisarPrescricao('3x12a10')).toThrow(PrescricaoInvalidaError)
    })

    it('rejeita tempo zero', () => {
      expect(() => analisarPrescricao("3x0'")).toThrow(PrescricaoInvalidaError)
    })

    it('carrega o texto ofensivo no erro, para o import apontar o campo', () => {
      expect(() => analisarPrescricao('abc')).toThrow(
        expect.objectContaining({ textoOriginal: 'abc' })
      )
    })
  })

  describe('preserva a prescrição do profissional', () => {
    it('guarda o texto original — a prescrição é dele, não nossa interpretação', () => {
      expect(analisarPrescricao('3 x 10 a 12').textoOriginal).toBe('3 x 10 a 12')
    })
  })
})
