import type { Descanso } from '../dia/montarDia'
import type { ArquivoDePlano } from '../schema/arquivoDePlano'

/**
 * O plano em números, para o aluno conferir que recebeu o certo.
 *
 * Não é a consulta ao plano completo — é o cartão que aparece logo depois de
 * importar, onde o aluno reconhece o profissional e a ordem de grandeza do que
 * foi prescrito.
 *
 * Existe como função pura para que a tela não precise conhecer o formato do
 * arquivo. Contar sessões e somar suplementos é regra, não apresentação: uma
 * mudança no formato do plano tem que parar aqui, e não atravessar até o JSX.
 */

export interface ResumoDoPlano {
  /** Um plano pode ter mais de um responsável técnico — treinador e nutricionista. */
  readonly prescritoPor: readonly string[]
  readonly emitidoEm: string
  readonly sessoes: number
  readonly exercicios: number
  readonly descansoPadrao: Descanso
  readonly refeicoes: number
  readonly hidratacaoAlvoLitros: number
  readonly suplementos: number
  /** Como o profissional agrupou os suplementos — o raciocínio clínico dele. */
  readonly formulas: number
}

export function resumoDoPlano(arquivo: ArquivoDePlano): ResumoDoPlano {
  const { treino, nutricao, suplementacao } = arquivo.plano

  return {
    prescritoPor: [arquivo.profissional.nome],
    emitidoEm: arquivo.emitidoEm,
    sessoes: treino.sessoes.length,
    exercicios: treino.exercicios.length,
    descansoPadrao: treino.descansoEntreSeries,
    refeicoes: nutricao.refeicoes.length,
    hidratacaoAlvoLitros: nutricao.hidratacaoDiariaLitros,
    // O agrupamento por fórmula é o raciocínio clínico do profissional; o que o
    // aluno quer saber aqui é quantos suplementos vai tomar.
    suplementos: suplementacao.formulas.reduce((total, f) => total + f.itens.length, 0),
    formulas: suplementacao.formulas.length,
  }
}
