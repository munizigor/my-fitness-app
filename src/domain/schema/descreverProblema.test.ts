import { describe, expect, it } from 'vitest'
import planoValido from '../../test/fixtures/plano-valido.json'
import { ArquivoInvalidoError } from '../errors/ArquivoInvalidoError'
import { lerArquivoDePlano } from './arquivoDePlano'
import { descreverProblema } from './descreverProblema'

/**
 * Estes testes cobrem o caso degradado: um arquivo tão quebrado que os próprios
 * nomes que usaríamos para localizar o problema estão faltando.
 *
 * É exatamente aí que a mensagem mais importa. Um profissional que esqueceu de
 * preencher metade do plano precisa de "Treino 2 · item 1", não de uma tela em
 * branco nem de um `undefined` no meio da frase.
 */
function problemasAoLer(arquivo: unknown) {
  try {
    lerArquivoDePlano(arquivo)
  } catch (erro) {
    if (erro instanceof ArquivoInvalidoError) return erro.problemas
    throw erro
  }
  throw new Error('esperava que o arquivo fosse recusado, mas ele passou')
}

function comPlanoValido(): Record<string, unknown> {
  return structuredClone(planoValido) as Record<string, unknown>
}

describe('descreverProblema quando o arquivo está muito quebrado', () => {
  it('cai na posição quando o treino não tem nome', () => {
    const arquivo = comPlanoValido()
    // @ts-expect-error navegação em JSON solto, só no teste
    delete arquivo.plano.treino.sessoes[1].rotulo
    // @ts-expect-error navegação em JSON solto, só no teste
    delete arquivo.plano.treino.sessoes[1].itens[0].series
    const problema = problemasAoLer(arquivo).find((p) => p.oQue === 'Séries')
    expect(problema!.onde).toContain('Treino 2')
  })

  it('cai na posição quando o exercício referenciado não existe no catálogo', () => {
    const arquivo = comPlanoValido()
    // @ts-expect-error navegação em JSON solto, só no teste
    arquivo.plano.treino.sessoes[0].itens[0].exercicioId = 'fantasma'
    const problema = problemasAoLer(arquivo).find((p) => p.oQue === 'Exercício')
    expect(problema!.onde).toBe('Treino A · item 1')
  })

  it('localiza problema na lista de exercícios pelo nome do exercício', () => {
    const arquivo = comPlanoValido()
    // @ts-expect-error navegação em JSON solto, só no teste
    arquivo.plano.treino.exercicios[2].gruposMusculares = []
    const [problema] = problemasAoLer(arquivo)
    expect(problema!.onde).toBe('Lista de exercícios · Prancha Lateral')
    expect(problema!.oQue).toBe('Grupos musculares')
  })

  it('cai na posição quando o exercício do catálogo não tem nome', () => {
    const arquivo = comPlanoValido()
    // @ts-expect-error navegação em JSON solto, só no teste
    delete arquivo.plano.treino.exercicios[0].nome
    const problema = problemasAoLer(arquivo).find((p) => p.oQue === 'Nome')
    expect(problema!.onde).toBe('Lista de exercícios · exercício 1')
  })

  it('usa o número da refeição quando ela não tem nome', () => {
    const arquivo = comPlanoValido()
    // @ts-expect-error navegação em JSON solto, só no teste
    delete arquivo.plano.nutricao.refeicoes[0].nome
    // @ts-expect-error navegação em JSON solto, só no teste
    delete arquivo.plano.nutricao.refeicoes[0].itens[0].macros
    const problema = problemasAoLer(arquivo).find((p) => p.onde.startsWith('Refeição'))
    expect(problema!.onde).toBe('Refeição 1 · item 1')
  })

  it('cai na posição quando a refeição não tem nome nem número', () => {
    const arquivo = comPlanoValido()
    // @ts-expect-error navegação em JSON solto, só no teste
    delete arquivo.plano.nutricao.refeicoes[1].nome
    // @ts-expect-error navegação em JSON solto, só no teste
    delete arquivo.plano.nutricao.refeicoes[1].numero
    const problema = problemasAoLer(arquivo).find((p) => p.oQue === 'Número da refeição')
    expect(problema!.onde).toBe('Refeição 2')
  })

  it('cai na posição quando a fórmula e o suplemento não têm nome', () => {
    const arquivo = comPlanoValido()
    // @ts-expect-error navegação em JSON solto, só no teste
    delete arquivo.plano.suplementacao.formulas[0].nome
    // @ts-expect-error navegação em JSON solto, só no teste
    delete arquivo.plano.suplementacao.formulas[0].itens[0].nome
    const problema = problemasAoLer(arquivo).find((p) => p.onde.includes('item 1'))
    expect(problema!.onde).toBe('Suplementos · fórmula 1 · item 1')
  })

  it('nomeia a seção quando o problema é do plano alimentar como um todo', () => {
    const arquivo = comPlanoValido()
    // @ts-expect-error navegação em JSON solto, só no teste
    delete arquivo.plano.nutricao.macrosAlvoDiario
    const [problema] = problemasAoLer(arquivo)
    expect(problema!.onde).toBe('Plano alimentar')
  })

  it('nomeia a seção quando o problema é do plano de treino como um todo', () => {
    const arquivo = comPlanoValido()
    // @ts-expect-error navegação em JSON solto, só no teste
    delete arquivo.plano.treino.descansoEntreSeries
    const [problema] = problemasAoLer(arquivo)
    expect(problema!.onde).toBe('Plano de treino')
  })

  it('nomeia a seção quando faltam as fórmulas inteiras', () => {
    const arquivo = comPlanoValido()
    // @ts-expect-error navegação em JSON solto, só no teste
    delete arquivo.plano.suplementacao.formulas
    const [problema] = problemasAoLer(arquivo)
    expect(problema!.onde).toBe('Suplementos')
  })

  it('identifica dados do aluno e do profissional', () => {
    const semAluno = comPlanoValido()
    // @ts-expect-error navegação em JSON solto, só no teste
    delete semAluno.aluno.idade
    expect(problemasAoLer(semAluno)[0]!.onde).toBe('Dados do aluno')

    const semProfissional = comPlanoValido()
    // @ts-expect-error navegação em JSON solto, só no teste
    delete semProfissional.profissional.nome
    expect(problemasAoLer(semProfissional)[0]!.onde).toBe('Dados do profissional')
  })

  it('chama de "Arquivo" o que está na raiz', () => {
    const arquivo = comPlanoValido()
    delete arquivo.formato
    const [problema] = problemasAoLer(arquivo)
    expect(problema!.onde).toBe('Arquivo')
  })

  it('descreve data mal formatada em vez de falar em regex', () => {
    const arquivo = comPlanoValido()
    arquivo.emitidoEm = '24/08/2026'
    const [problema] = problemasAoLer(arquivo)
    expect(problema!.mensagem).toBe('precisa ser uma data no formato AAAA-MM-DD')
  })

  it('descreve valor fora da lista de opções sem citar a lista inteira', () => {
    const arquivo = comPlanoValido()
    // @ts-expect-error navegação em JSON solto, só no teste
    arquivo.plano.nutricao.refeicoes[0].itens[0].opcoes[0].unidade = 'punhado'
    const [problema] = problemasAoLer(arquivo)
    expect(problema!.mensagem).toBe('não é um valor aceito aqui')
  })

  it('descreve tipo errado dizendo o que se esperava, em português', () => {
    const arquivo = comPlanoValido()
    // @ts-expect-error navegação em JSON solto, só no teste
    arquivo.plano.treino.sessoes[0].itens[0].series = 'quatro'
    const [problema] = problemasAoLer(arquivo)
    expect(problema!.mensagem).toBe('precisa ser um número')
  })

  it('descreve lista vazia e texto em branco de formas diferentes', () => {
    const listaVazia = comPlanoValido()
    // @ts-expect-error navegação em JSON solto, só no teste
    listaVazia.plano.treino.sessoes[0].itens = []
    expect(problemasAoLer(listaVazia)[0]!.mensagem).toBe('precisa ter pelo menos um item')

    const emBranco = comPlanoValido()
    // @ts-expect-error navegação em JSON solto, só no teste
    emBranco.plano.treino.sessoes[0].rotulo = '   '
    expect(problemasAoLer(emBranco)[0]!.mensagem).toBe('não pode ficar em branco')
  })

  it('descreve execução que não bate com nenhum formato aceito', () => {
    const arquivo = comPlanoValido()
    // @ts-expect-error navegação em JSON solto, só no teste
    arquivo.plano.treino.sessoes[0].itens[0].execucao = { tipo: 'distancia', metros: 100 }
    const [problema] = problemasAoLer(arquivo)
    expect(problema!.mensagem).not.toMatch(/invalid|union|discriminator/i)
  })

  it('não deixa "undefined" aparecer em nenhuma mensagem, mesmo no pior arquivo', () => {
    const arquivo = { formato: 'fitvault-plano', schemaVersion: 2, plano: { treino: {} } }
    const problemas = problemasAoLer(arquivo)
    const tudo = problemas.map((p) => `${p.onde} ${p.oQue} ${p.mensagem}`).join(' ')
    expect(tudo).not.toContain('undefined')
    expect(tudo).not.toContain('[object Object]')
  })
})

describe('descreverProblema como contrato, independente do schema atual', () => {
  it('traduz limite máximo, que o schema de hoje ainda não usa', () => {
    // O schema atual não tem nenhum `.max()`, então este ramo não é alcançável
    // por um arquivo. Testá-lo direto garante que, no dia em que alguém puser
    // um limite, a mensagem já saia em português em vez de vazar jargão.
    const problema = descreverProblema(
      {
        code: 'too_big',
        origin: 'number',
        maximum: 120,
        path: ['aluno', 'idade'],
        message: 'Too big',
        input: 999,
      } as never,
      { aluno: { idade: 999 } }
    )
    expect(problema.onde).toBe('Dados do aluno')
    expect(problema.oQue).toBe('Idade')
    expect(problema.mensagem).toBe('precisa ser no máximo 120')
  })

  it('traduz lista com mínimo maior que um', () => {
    const problema = descreverProblema(
      {
        code: 'too_small',
        origin: 'array',
        minimum: 3,
        path: ['plano', 'treino', 'sessoes'],
        message: 'Too small',
        input: [],
      } as never,
      {}
    )
    expect(problema.mensagem).toBe('precisa ter pelo menos 3 itens')
  })

  it('traduz mínimo numérico diferente de zero', () => {
    const problema = descreverProblema(
      {
        code: 'too_small',
        origin: 'number',
        minimum: 2,
        path: ['plano', 'treino', 'sessoes', 0, 'itens', 0, 'series'],
        message: 'Too small',
        input: 1,
      } as never,
      {}
    )
    expect(problema.mensagem).toBe('precisa ser no mínimo 2')
  })

  it('traduz formato desconhecido sem citar a expressão regular', () => {
    const problema = descreverProblema(
      {
        code: 'invalid_format',
        format: 'email',
        path: ['profissional', 'contato'],
        message: 'Invalid email',
        input: 'x',
      } as never,
      {}
    )
    expect(problema.mensagem).toBe('está num formato que não reconheço')
  })

  it('cai no rótulo genérico quando o campo não tem nome de negócio', () => {
    const problema = descreverProblema(
      { code: 'custom', path: ['campoDesconhecido'], message: 'algo deu errado' } as never,
      {}
    )
    expect(problema.oQue).toBe('Conteúdo')
    expect(problema.mensagem).toBe('algo deu errado')
  })

  it('sobrevive a um dia da semana fora do vocabulário', () => {
    const problema = descreverProblema(
      {
        code: 'custom',
        path: ['plano', 'treino', 'agendaSemanal', 'octa', 'sessaoId'],
        message: 'dia inexistente',
      } as never,
      {}
    )
    expect(problema.onde).toBe('Agenda da semana · octa')
  })

  it('sobrevive a um item de treino que nem objeto é', () => {
    const problema = descreverProblema(
      {
        code: 'invalid_type',
        expected: 'object',
        path: ['plano', 'treino', 'sessoes', 0, 'itens', 0, 'series'],
        message: 'Invalid',
      } as never,
      { plano: { treino: { sessoes: [{ rotulo: 'Treino A', itens: ['isto não é objeto'] }] } } }
    )
    expect(problema.onde).toBe('Treino A · item 1')
  })
})
