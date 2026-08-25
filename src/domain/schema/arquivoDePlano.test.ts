import { describe, expect, it } from 'vitest'
import planoValido from '../../test/fixtures/plano-valido.json'
import { ArquivoInvalidoError } from '../errors/ArquivoInvalidoError'
import { SCHEMA_VERSION_ATUAL, lerArquivoDePlano } from './arquivoDePlano'

/** Clona o fixture para cada teste poder corrompê-lo sem afetar os outros. */
function comPlanoValido(): Record<string, unknown> {
  return structuredClone(planoValido) as Record<string, unknown>
}

describe('lerArquivoDePlano', () => {
  describe('arquivo válido', () => {
    it('aceita o arquivo que o profissional envia', () => {
      expect(() => lerArquivoDePlano(comPlanoValido())).not.toThrow()
    })

    it('preserva a atribuição ao profissional — a prescrição é dele', () => {
      const arquivo = lerArquivoDePlano(comPlanoValido())
      expect(arquivo.profissional.nome).toBe('Ana Ribeiro')
    })

    it('interpreta a prescrição de cada exercício na leitura, não na tela', () => {
      const arquivo = lerArquivoDePlano(comPlanoValido())
      const sessaoA = arquivo.plano.treino.sessoes[0]!
      expect(sessaoA.exercicios[0]!.prescricao).toMatchObject({
        tipo: 'repeticoes',
        series: 4,
        repeticoes: { min: 10, max: 12 },
      })
      expect(sessaoA.exercicios[2]!.prescricao).toMatchObject({ tipo: 'tempo', segundos: 60 })
    })

    it('mantém a técnica avançada junto do exercício', () => {
      const arquivo = lerArquivoDePlano(comPlanoValido())
      const agachamento = arquivo.plano.treino.sessoes[1]!.exercicios[0]!
      expect(agachamento.tecnicaAvancada).toBe('Descer até o talo')
    })

    it('entende dia de descanso como ausência, não como sessão especial', () => {
      const arquivo = lerArquivoDePlano(comPlanoValido())
      expect(arquivo.plano.treino.agendaSemanal.qui.musculacao).toBeNull()
      expect(arquivo.plano.treino.agendaSemanal.qui.aerobico).toBeNull()
    })

    it('lê as alternativas "OU" de cada item de refeição', () => {
      const arquivo = lerArquivoDePlano(comPlanoValido())
      const arrozOuBatata = arquivo.plano.nutricao.refeicoes[2]!.itens[1]!
      expect(arrozOuBatata.alternativas).toEqual(['100 g de arroz', '200 g de batata'])
    })

    it('lê a posologia como âncora temporal, não como rótulo', () => {
      const arquivo = lerArquivoDePlano(comPlanoValido())
      const formulas = arquivo.plano.suplementacao.formulas
      expect(formulas[0]!.itens[0]!.posologia.ancora).toEqual({
        tipo: 'apos-refeicao',
        refeicao: 1,
      })
      expect(formulas[1]!.itens[1]!.posologia.ancora).toEqual({ tipo: 'antes-do-treino' })
    })
  })

  describe('integridade referencial', () => {
    it('rejeita agenda que aponta para sessão inexistente', () => {
      const arquivo = comPlanoValido()
      // @ts-expect-error navegação em JSON solto, só no teste
      arquivo.plano.treino.agendaSemanal.seg.musculacao = 'Z'
      expect(() => lerArquivoDePlano(arquivo)).toThrow(ArquivoInvalidoError)
    })

    it('rejeita suplemento ancorado numa refeição que o plano não tem', () => {
      const arquivo = comPlanoValido()
      // @ts-expect-error navegação em JSON solto, só no teste
      arquivo.plano.suplementacao.formulas[0].itens[0].posologia.ancora.refeicao = 9
      expect(() => lerArquivoDePlano(arquivo)).toThrow(ArquivoInvalidoError)
    })

    it('rejeita identificadores de sessão repetidos', () => {
      const arquivo = comPlanoValido()
      // @ts-expect-error navegação em JSON solto, só no teste
      arquivo.plano.treino.sessoes[1].id = 'A'
      expect(() => lerArquivoDePlano(arquivo)).toThrow(ArquivoInvalidoError)
    })
  })

  describe('falha apontando o campo, sem adivinhar', () => {
    it('rejeita arquivo que não é do formato', () => {
      const arquivo = comPlanoValido()
      arquivo.formato = 'outra-coisa'
      expect(() => lerArquivoDePlano(arquivo)).toThrow(ArquivoInvalidoError)
    })

    it('rejeita versão de schema desconhecida em vez de tentar adivinhar', () => {
      const arquivo = comPlanoValido()
      arquivo.schemaVersion = SCHEMA_VERSION_ATUAL + 1
      expect(() => lerArquivoDePlano(arquivo)).toThrow(ArquivoInvalidoError)
    })

    it('aponta o caminho exato do campo inválido', () => {
      const arquivo = comPlanoValido()
      // @ts-expect-error navegação em JSON solto, só no teste
      arquivo.plano.treino.sessoes[0].exercicios[0].prescricao = 'abc'
      let capturado: ArquivoInvalidoError | undefined
      try {
        lerArquivoDePlano(arquivo)
      } catch (erro) {
        capturado = erro as ArquivoInvalidoError
      }
      expect(capturado).toBeInstanceOf(ArquivoInvalidoError)
      expect(capturado!.problemas[0]!.campo).toBe('plano.treino.sessoes.0.exercicios.0.prescricao')
      expect(capturado!.problemas[0]!.mensagem).toContain('3x10a12')
    })

    it('relata todos os problemas de uma vez, não um por vez', () => {
      const arquivo = comPlanoValido()
      // @ts-expect-error navegação em JSON solto, só no teste
      arquivo.plano.treino.sessoes[0].exercicios[0].prescricao = 'abc'
      // @ts-expect-error navegação em JSON solto, só no teste
      delete arquivo.plano.nutricao.hidratacaoLitros
      let capturado: ArquivoInvalidoError | undefined
      try {
        lerArquivoDePlano(arquivo)
      } catch (erro) {
        capturado = erro as ArquivoInvalidoError
      }
      // Quem corrige o arquivo é o profissional. Um erro por vez seria
      // devolver o arquivo cinco vezes até ficar certo.
      expect(capturado!.problemas.length).toBeGreaterThanOrEqual(2)
    })

    it.each([
      ['não é objeto', 'texto solto'],
      ['é nulo', null],
      ['é lista', []],
    ])('rejeita entrada que %s', (_caso, entrada) => {
      expect(() => lerArquivoDePlano(entrada)).toThrow(ArquivoInvalidoError)
    })

    it('escreve as mensagens em português, não nas do Zod em inglês', () => {
      // Quem lê é o profissional que vai corrigir o arquivo. Um diagnóstico
      // metade em inglês não serve para ele.
      const arquivo = comPlanoValido()
      // @ts-expect-error navegação em JSON solto, só no teste
      delete arquivo.plano.nutricao.hidratacaoLitros
      let capturado: ArquivoInvalidoError | undefined
      try {
        lerArquivoDePlano(arquivo)
      } catch (erro) {
        capturado = erro as ArquivoInvalidoError
      }
      const mensagens = capturado!.problemas.map((p) => p.mensagem).join(' ')
      expect(mensagens).not.toMatch(/Invalid|Required|Expected|Unrecognized/i)
    })

    it('rejeita refeição sem nenhum item', () => {
      const arquivo = comPlanoValido()
      // @ts-expect-error navegação em JSON solto, só no teste
      arquivo.plano.nutricao.refeicoes[0].itens = []
      expect(() => lerArquivoDePlano(arquivo)).toThrow(ArquivoInvalidoError)
    })

    it('rejeita item de refeição sem nenhuma alternativa', () => {
      const arquivo = comPlanoValido()
      // @ts-expect-error navegação em JSON solto, só no teste
      arquivo.plano.nutricao.refeicoes[0].itens[0].alternativas = []
      expect(() => lerArquivoDePlano(arquivo)).toThrow(ArquivoInvalidoError)
    })

    it('rejeita intervalo entre séries invertido', () => {
      const arquivo = comPlanoValido()
      // @ts-expect-error navegação em JSON solto, só no teste
      arquivo.plano.treino.intervaloEntreSeriesSegundos = { min: 70, max: 60 }
      expect(() => lerArquivoDePlano(arquivo)).toThrow(ArquivoInvalidoError)
    })
  })
})
