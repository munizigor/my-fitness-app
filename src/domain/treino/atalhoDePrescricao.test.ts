import { describe, expect, it } from 'vitest'
import { PrescricaoInvalidaError } from '../errors/PrescricaoInvalidaError'
import { interpretarAtalhoDePrescricao } from './atalhoDePrescricao'

describe('interpretarAtalhoDePrescricao', () => {
  describe('a notação que profissionais já usam nas planilhas', () => {
    it.each([
      ['3x10a12', 3, 10, 12],
      ['4x10a12', 4, 10, 12],
    ])('%s vira %i séries de %i a %i repetições', (atalho, series, min, max) => {
      expect(interpretarAtalhoDePrescricao(atalho)).toEqual({
        series,
        execucao: { tipo: 'repeticoes', min, max },
        textoOriginal: atalho,
      })
    })

    it.each([
      ['2x60', 2, 60],
      ['3x60', 3, 60],
    ])("%s' vira %i séries de %i segundos", (base, series, segundos) => {
      const atalho = `${base}'`
      expect(interpretarAtalhoDePrescricao(atalho)).toEqual({
        series,
        execucao: { tipo: 'tempo', segundos },
        textoOriginal: atalho,
      })
    })
  })

  describe('tolerância ao que um humano varia sem querer', () => {
    it('aceita espaços em volta dos separadores', () => {
      expect(interpretarAtalhoDePrescricao(' 3 x 10 a 12 ')).toMatchObject({
        series: 3,
        execucao: { tipo: 'repeticoes', min: 10, max: 12 },
      })
    })

    it('aceita maiúsculas', () => {
      expect(interpretarAtalhoDePrescricao('3X10A12')).toMatchObject({ series: 3 })
    })

    it('aceita repetição fixa como faixa degenerada', () => {
      expect(interpretarAtalhoDePrescricao('3x12')).toMatchObject({
        execucao: { tipo: 'repeticoes', min: 12, max: 12 },
      })
    })

    it('aceita o apóstrofo tipográfico, que corretores automáticos inserem', () => {
      expect(interpretarAtalhoDePrescricao('2x60’')).toMatchObject({
        execucao: { tipo: 'tempo', segundos: 60 },
      })
    })
  })

  describe('recusa o que não entende, para o profissional corrigir na hora', () => {
    it.each([
      ['', 'texto vazio'],
      ['   ', 'só espaços'],
      ['DESCER ATÉ O TALO', 'observação, não prescrição'],
      ['2 cada lado', 'observação de execução, não prescrição'],
      ['3x', 'repetições ausentes'],
      ['x10a12', 'séries ausentes'],
      ['3x10a', 'limite superior ausente'],
      ['abc', 'lixo'],
    ])('rejeita %j (%s)', (atalho) => {
      expect(() => interpretarAtalhoDePrescricao(atalho)).toThrow(PrescricaoInvalidaError)
    })

    it('rejeita zero séries — não existe exercício de zero séries', () => {
      expect(() => interpretarAtalhoDePrescricao('0x10a12')).toThrow(PrescricaoInvalidaError)
    })

    it('rejeita faixa invertida — 12 a 10 é erro de digitação', () => {
      expect(() => interpretarAtalhoDePrescricao('3x12a10')).toThrow(PrescricaoInvalidaError)
    })

    it('rejeita tempo zero', () => {
      expect(() => interpretarAtalhoDePrescricao("3x0'")).toThrow(PrescricaoInvalidaError)
    })

    it('devolve o texto ofensivo, para o editor destacar o campo', () => {
      expect(() => interpretarAtalhoDePrescricao('abc')).toThrow(
        expect.objectContaining({ textoOriginal: 'abc' })
      )
    })
  })

  it('devolve o que foi digitado, para o editor conseguir repor no campo', () => {
    expect(interpretarAtalhoDePrescricao('3 x 10 a 12').textoOriginal).toBe('3 x 10 a 12')
  })
})
