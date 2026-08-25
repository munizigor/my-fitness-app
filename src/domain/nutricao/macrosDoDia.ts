import type { Dia } from '../dia/montarDia'
import type { RegistroDiario } from '../registro/registroDiario'
import type { Macros } from '../schema/arquivoDePlano'

/**
 * Quanto o aluno já comeu hoje, contra o que foi prescrito.
 *
 * Função pura sobre plano + registro. Nada aqui é persistido (ADR 0006): o
 * consumido é sempre recalculado, e por isso nunca fica dessincronizado do que
 * o aluno de fato marcou.
 *
 * **A alternativa escolhida não entra na conta.** As opções de um item são
 * equivalentes por construção — o profissional escolhe as quantidades
 * justamente para que 100 g de arroz e 200 g de batata deem no mesmo. Qual
 * delas o aluno comeu é informação para o profissional ler, não variável do
 * cálculo. Por isso os macros moram no item, e não na opção.
 */

export interface MacrosDoDia {
  readonly alvo: Macros
  readonly consumido: Macros
  /** Pode ficar negativo: passar do alvo é um fato, não um erro a esconder. */
  readonly restante: Macros
}

const ZERO: Macros = { proteinaG: 0, carboidratoG: 0, gorduraG: 0 }

export function macrosDoDia(dia: Dia, registro: RegistroDiario | null): MacrosDoDia {
  const porItem = new Map<string, Macros>()
  for (const item of dia.itens) {
    if (item.tipo !== 'refeicao') continue
    for (const doPlano of item.refeicao.itens) porItem.set(doPlano.id, doPlano.macros)
  }

  let consumido = ZERO
  for (const refeicao of registro?.refeicoes ?? []) {
    for (const comido of refeicao.itens) {
      // Item que o plano de hoje não tem: o aluno trocou de plano, ou o
      // profissional reemitiu o arquivo. Some da conta em vez de derrubar a tela.
      const macros = porItem.get(comido.itemDeRefeicaoId)
      if (macros) consumido = somar(consumido, macros)
    }
  }

  return {
    alvo: dia.macrosAlvoDiario,
    consumido,
    restante: subtrair(dia.macrosAlvoDiario, consumido),
  }
}

function somar(a: Macros, b: Macros): Macros {
  return {
    proteinaG: a.proteinaG + b.proteinaG,
    carboidratoG: a.carboidratoG + b.carboidratoG,
    gorduraG: a.gorduraG + b.gorduraG,
  }
}

function subtrair(a: Macros, b: Macros): Macros {
  return {
    proteinaG: a.proteinaG - b.proteinaG,
    carboidratoG: a.carboidratoG - b.carboidratoG,
    gorduraG: a.gorduraG - b.gorduraG,
  }
}
