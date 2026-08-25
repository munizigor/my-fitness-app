import { describe, expect, it } from 'vitest'
import planoValido from '../../test/fixtures/plano-valido.json'
import { lerArquivoDePlano } from '../schema/arquivoDePlano'
import { resumoDoPlano } from './resumoDoPlano'

const ARQUIVO = lerArquivoDePlano(planoValido)

describe('resumoDoPlano', () => {
  it('conta o que o aluno confere de relance ao receber o plano', () => {
    // Não é a consulta ao plano completo: é o suficiente para o aluno saber que
    // recebeu o plano certo, de quem esperava.
    expect(resumoDoPlano(ARQUIVO)).toEqual({
      prescritoPor: ['Ana Ribeiro'],
      emitidoEm: '2026-08-24',
      sessoes: 2,
      exercicios: 5,
      descansoPadrao: { minSegundos: 60, maxSegundos: 70 },
      refeicoes: 3,
      hidratacaoAlvoLitros: 4,
      suplementos: 4,
      formulas: 2,
    })
  })

  it('soma os suplementos de todas as fórmulas, não conta as fórmulas', () => {
    // O agrupamento por fórmula é o raciocínio clínico do profissional; o que o
    // aluno quer saber é quantos frascos vai tomar.
    expect(resumoDoPlano(ARQUIVO).suplementos).toBe(4)
  })
})
