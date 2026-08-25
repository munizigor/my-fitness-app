import { describe, expect, it } from 'vitest'
import planoValido from '../../test/fixtures/plano-valido.json'
import { ArquivoInvalidoError } from '../errors/ArquivoInvalidoError'
import { SCHEMA_VERSION_ATUAL, lerArquivoDePlano } from './arquivoDePlano'

/** Clona o fixture para cada teste poder corrompê-lo sem afetar os outros. */
function comPlanoValido(): Record<string, unknown> {
  return structuredClone(planoValido) as Record<string, unknown>
}

function problemasAoLer(arquivo: unknown) {
  try {
    lerArquivoDePlano(arquivo)
  } catch (erro) {
    if (erro instanceof ArquivoInvalidoError) return erro.problemas
    throw erro
  }
  throw new Error('esperava que o arquivo fosse recusado, mas ele passou')
}

describe('lerArquivoDePlano', () => {
  describe('o plano carrega significado, não a notação da planilha', () => {
    it('séries e repetições são números, não a string "4x10a12"', () => {
      const { plano } = lerArquivoDePlano(comPlanoValido())
      const puxada = plano.treino.sessoes[0]!.itens[0]!
      expect(puxada.series).toBe(4)
      expect(puxada.execucao).toEqual({ tipo: 'repeticoes', min: 10, max: 12 })
    })

    it('tempo sob tensão é segundos, não "3x60\'"', () => {
      const { plano } = lerArquivoDePlano(comPlanoValido())
      expect(plano.treino.sessoes[0]!.itens[2]!.execucao).toEqual({ tipo: 'tempo', segundos: 60 })
    })

    it('porção é alimento, quantidade e unidade, não "100 g de arroz"', () => {
      const { plano } = lerArquivoDePlano(comPlanoValido())
      expect(plano.nutricao.refeicoes[2]!.itens[1]!.opcoes[0]).toEqual({
        alimento: 'Arroz branco cozido',
        quantidade: 100,
        unidade: 'g',
      })
    })

    it('dose é quantidade e unidade, não "200 mg"', () => {
      const { plano } = lerArquivoDePlano(comPlanoValido())
      expect(plano.suplementacao.formulas[0]!.itens[0]!.dose).toEqual({
        quantidade: 200,
        unidade: 'mg',
      })
    })
  })

  describe('exercício e prescrição são coisas separadas', () => {
    it('o mesmo exercício pode ser prescrito duas vezes, distinguido pela observação', () => {
      // É assim que o profissional prescreve unilateral: repete o exercício e
      // escreve o lado na observação. Não existe "Prancha Lateral Direita".
      const { plano } = lerArquivoDePlano(comPlanoValido())
      const pranchas = plano.treino.sessoes[0]!.itens.filter(
        (i) => i.exercicioId === 'prancha-lateral'
      )
      expect(pranchas).toHaveLength(2)
      expect(pranchas.map((p) => p.observacao)).toEqual(['Lado direito', 'Lado esquerdo'])
      expect(new Set(pranchas.map((p) => p.id)).size).toBe(2)
    })

    it('os grupos musculares ficam no exercício, e servem para agregar volume', () => {
      const { plano } = lerArquivoDePlano(comPlanoValido())
      const puxada = plano.treino.exercicios.find((e) => e.id === 'puxada-frontal-pronada')
      expect(puxada?.gruposMusculares).toEqual(['costas', 'biceps'])
    })
  })

  describe('carga é opcional — o profissional pode ou não prescrever', () => {
    it('lê a carga alvo quando ela existe', () => {
      const { plano } = lerArquivoDePlano(comPlanoValido())
      expect(plano.treino.sessoes[1]!.itens[0]!.cargaAlvoKg).toBe(60)
    })

    it('aceita exercício sem carga prescrita', () => {
      const { plano } = lerArquivoDePlano(comPlanoValido())
      expect(plano.treino.sessoes[0]!.itens[0]!.cargaAlvoKg).toBeUndefined()
    })
  })

  describe('o resto do plano', () => {
    it('preserva a atribuição ao profissional — a prescrição é dele', () => {
      expect(lerArquivoDePlano(comPlanoValido()).profissional.nome).toBe('Ana Ribeiro')
    })

    it('entende dia de descanso como ausência, não como sessão especial', () => {
      const { plano } = lerArquivoDePlano(comPlanoValido())
      expect(plano.treino.agendaSemanal.qui.sessaoId).toBeNull()
      expect(plano.treino.agendaSemanal.qui.aerobico).toBeNull()
    })

    it('lê a posologia como âncora temporal, não como rótulo', () => {
      const { formulas } = lerArquivoDePlano(comPlanoValido()).plano.suplementacao
      expect(formulas[0]!.itens[0]!.posologia.ancora).toEqual({
        tipo: 'apos-refeicao',
        refeicao: 1,
      })
      expect(formulas[1]!.itens[1]!.posologia.ancora).toEqual({ tipo: 'antes-do-treino' })
    })

    it('aceita foco livre — cada profissional usa o seu vocabulário', () => {
      const arquivo = comPlanoValido()
      // @ts-expect-error navegação em JSON solto, só no teste
      arquivo.plano.treino.sessoes[0].foco = 'Push'
      expect(() => lerArquivoDePlano(arquivo)).not.toThrow()
    })
  })

  describe('integridade referencial', () => {
    it('recusa item que aponta para exercício fora da lista do plano', () => {
      const arquivo = comPlanoValido()
      // @ts-expect-error navegação em JSON solto, só no teste
      arquivo.plano.treino.sessoes[0].itens[0].exercicioId = 'nao-existe'
      const [problema] = problemasAoLer(arquivo)
      expect(problema!.mensagem).toContain('não está na lista de exercícios')
    })

    it('recusa agenda que marca um treino inexistente', () => {
      const arquivo = comPlanoValido()
      // @ts-expect-error navegação em JSON solto, só no teste
      arquivo.plano.treino.agendaSemanal.seg.sessaoId = 'Z'
      const [problema] = problemasAoLer(arquivo)
      expect(problema!.onde).toBe('Agenda da semana · segunda-feira')
      expect(problema!.mensagem).toContain('não existe no plano')
    })

    it('recusa suplemento ancorado numa refeição que o plano não tem', () => {
      const arquivo = comPlanoValido()
      // @ts-expect-error navegação em JSON solto, só no teste
      arquivo.plano.suplementacao.formulas[0].itens[0].posologia.ancora.refeicao = 9
      const [problema] = problemasAoLer(arquivo)
      expect(problema!.mensagem).toContain('o plano alimentar não tem')
    })

    it('recusa dois treinos com o mesmo identificador', () => {
      // A agenda aponta para o treino pelo id; dois iguais tornam ambíguo qual
      // treino o aluno faz na segunda-feira.
      const arquivo = comPlanoValido()
      // @ts-expect-error navegação em JSON solto, só no teste
      arquivo.plano.treino.sessoes[1].id = 'A'
      const problema = problemasAoLer(arquivo).find((p) => p.mensagem.includes('repetido'))
      expect(problema!.mensagem).toContain('dois treinos não podem ter o mesmo identificador')
    })

    it('recusa identificadores de exercício repetidos', () => {
      const arquivo = comPlanoValido()
      // @ts-expect-error navegação em JSON solto, só no teste
      arquivo.plano.treino.exercicios[1].id = 'puxada-frontal-pronada'
      expect(() => lerArquivoDePlano(arquivo)).toThrow(ArquivoInvalidoError)
    })
  })

  describe('erros que o profissional entende sem traduzir', () => {
    it('localiza o problema pelo nome do treino e do exercício', () => {
      const arquivo = comPlanoValido()
      // @ts-expect-error navegação em JSON solto, só no teste
      delete arquivo.plano.treino.sessoes[0].itens[0].series
      const [problema] = problemasAoLer(arquivo)
      expect(problema!.onde).toBe('Treino A · Puxada Frontal Pronada')
      expect(problema!.oQue).toBe('Séries')
      expect(problema!.mensagem).toBe('não foi preenchido')
    })

    it('usa a observação para distinguir duas prescrições do mesmo exercício', () => {
      const arquivo = comPlanoValido()
      // @ts-expect-error navegação em JSON solto, só no teste
      arquivo.plano.treino.sessoes[0].itens[3].series = 0
      const [problema] = problemasAoLer(arquivo)
      expect(problema!.onde).toBe('Treino A · Prancha Lateral (Lado esquerdo)')
      expect(problema!.mensagem).toBe('precisa ser maior que zero')
    })

    it('localiza problemas na refeição pelo nome dela', () => {
      const arquivo = comPlanoValido()
      // @ts-expect-error navegação em JSON solto, só no teste
      delete arquivo.plano.nutricao.refeicoes[2].itens[1].opcoes[0].quantidade
      const [problema] = problemasAoLer(arquivo)
      expect(problema!.onde).toBe('Almoço · item 2 · opção 1')
      expect(problema!.oQue).toBe('Quantidade')
    })

    it('localiza problemas do suplemento pela fórmula e pelo nome', () => {
      const arquivo = comPlanoValido()
      // @ts-expect-error navegação em JSON solto, só no teste
      delete arquivo.plano.suplementacao.formulas[1].itens[0].dose.unidade
      const [problema] = problemasAoLer(arquivo)
      expect(problema!.onde).toBe('Suplementos · Treino · Creatina')
      expect(problema!.oQue).toBe('Unidade')
    })

    it('não vaza caminho de JSON nem jargão do Zod para o usuário', () => {
      const arquivo = comPlanoValido()
      // @ts-expect-error navegação em JSON solto, só no teste
      delete arquivo.plano.nutricao.hidratacaoDiariaLitros
      // @ts-expect-error navegação em JSON solto, só no teste
      arquivo.plano.treino.sessoes[0].itens[0].series = 'muitas'
      const problemas = problemasAoLer(arquivo)

      const visivel = problemas.map((p) => `${p.onde} ${p.oQue} ${p.mensagem}`).join(' ')
      expect(visivel).not.toMatch(/plano\.|\.itens\.|\.sessoes\./)
      expect(visivel).not.toMatch(/invalid|expected|received|undefined|string|number/i)
    })

    it('guarda o caminho técnico para quem depura, fora da vista do usuário', () => {
      const arquivo = comPlanoValido()
      // @ts-expect-error navegação em JSON solto, só no teste
      delete arquivo.plano.treino.sessoes[0].itens[0].series
      const [problema] = problemasAoLer(arquivo)
      expect(problema!.caminhoTecnico).toBe('plano.treino.sessoes.0.itens.0.series')
    })

    it('relata todos os problemas de uma vez, não um por vez', () => {
      const arquivo = comPlanoValido()
      // @ts-expect-error navegação em JSON solto, só no teste
      delete arquivo.plano.treino.sessoes[0].itens[0].series
      // @ts-expect-error navegação em JSON solto, só no teste
      delete arquivo.plano.nutricao.hidratacaoDiariaLitros
      // Quem corrige é o profissional. Um erro por vez seria devolver o
      // arquivo cinco vezes até ficar certo.
      expect(problemasAoLer(arquivo).length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('recusa arquivo que não é deste app', () => {
    it('rejeita formato desconhecido', () => {
      const arquivo = comPlanoValido()
      arquivo.formato = 'outra-coisa'
      expect(() => lerArquivoDePlano(arquivo)).toThrow(ArquivoInvalidoError)
    })

    it('rejeita versão futura em vez de tentar adivinhar', () => {
      const arquivo = comPlanoValido()
      arquivo.schemaVersion = SCHEMA_VERSION_ATUAL + 1
      expect(() => lerArquivoDePlano(arquivo)).toThrow(ArquivoInvalidoError)
    })

    it.each([
      ['não é objeto', 'texto solto'],
      ['é nulo', null],
      ['é lista', []],
    ])('rejeita entrada que %s', (_caso, entrada) => {
      expect(() => lerArquivoDePlano(entrada)).toThrow(ArquivoInvalidoError)
    })
  })

  describe('recusa plano incompleto', () => {
    it('rejeita refeição sem nenhum item', () => {
      const arquivo = comPlanoValido()
      // @ts-expect-error navegação em JSON solto, só no teste
      arquivo.plano.nutricao.refeicoes[0].itens = []
      const [problema] = problemasAoLer(arquivo)
      expect(problema!.mensagem).toBe('precisa ter pelo menos um item')
    })

    it('rejeita item de refeição sem nenhuma opção', () => {
      const arquivo = comPlanoValido()
      // @ts-expect-error navegação em JSON solto, só no teste
      arquivo.plano.nutricao.refeicoes[0].itens[0].opcoes = []
      expect(() => lerArquivoDePlano(arquivo)).toThrow(ArquivoInvalidoError)
    })

    it('rejeita exercício sem grupo muscular — sem ele não há evolução por grupo', () => {
      const arquivo = comPlanoValido()
      // @ts-expect-error navegação em JSON solto, só no teste
      arquivo.plano.treino.exercicios[0].gruposMusculares = []
      expect(() => lerArquivoDePlano(arquivo)).toThrow(ArquivoInvalidoError)
    })

    it('rejeita descanso entre séries invertido', () => {
      const arquivo = comPlanoValido()
      // @ts-expect-error navegação em JSON solto, só no teste
      arquivo.plano.treino.descansoEntreSeries = { minSegundos: 70, maxSegundos: 60 }
      expect(() => lerArquivoDePlano(arquivo)).toThrow(ArquivoInvalidoError)
    })

    it('rejeita faixa de repetições invertida', () => {
      const arquivo = comPlanoValido()
      // @ts-expect-error navegação em JSON solto, só no teste
      arquivo.plano.treino.sessoes[0].itens[0].execucao = { tipo: 'repeticoes', min: 12, max: 10 }
      expect(() => lerArquivoDePlano(arquivo)).toThrow(ArquivoInvalidoError)
    })
  })
})
