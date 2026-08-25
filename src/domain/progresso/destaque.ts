import type { DeltaCorporal } from './evolucaoCorporal'
import type { ProgressoDeExercicio } from './progressoDeExercicio'
import type { Variacao } from './variacao'

/**
 * A única coisa que a tela de Evolução diz primeiro.
 *
 * Princípio 4 da interface — **evidência em frase, gráfico depois**. Um painel
 * com seis séries obriga o aluno a interpretar; a pergunta que ele faz é "eu
 * evoluí?", e a resposta é uma frase. Tudo o mais fica abaixo, para quem quiser
 * conferir.
 *
 * Escolher o destaque é escolher **o melhor fato verdadeiro**, nunca inventar
 * um: se nada subiu, a manchete some e a lista abaixo continua mostrando o que
 * de fato aconteceu, quedas incluídas. Dizer "+0%" em letra grande seria o
 * oposto de evidência.
 *
 * O domínio devolve o fato estruturado, não o texto: a frase é montada na UI
 * pelo i18n, e é lá que ela sabe dizer "levantou" ou "perdeu".
 */

export type Destaque =
  | { readonly tipo: 'carga'; readonly nome: string; readonly variacao: Variacao }
  | {
      readonly tipo: 'corpo'
      readonly metrica: DeltaCorporal['metrica']
      readonly unidade: DeltaCorporal['unidade']
      readonly variacao: Variacao
    }

export function destaqueDeEvolucao(
  progresso: readonly ProgressoDeExercicio[],
  corporal: readonly DeltaCorporal[]
): Destaque | null {
  return maiorSubidaDeCarga(progresso) ?? maiorMudancaDoCorpo(corporal)
}

/**
 * A carga vem primeiro porque é o que o aluno acabou de fazer — e vai fazer de
 * novo amanhã. O corpo de junho é evidência mais fria.
 *
 * Compara em percentual e não em quilos: +10 kg no agachamento pesado é menos
 * evolução do que +6 kg na rosca direta.
 */
function maiorSubidaDeCarga(progresso: readonly ProgressoDeExercicio[]): Destaque | null {
  const subiram = progresso.flatMap(({ nome, carga }) =>
    // Sem percentual (carga que saiu de zero) não há como comparar entre
    // exercícios — o fato continua na lista, só não disputa a manchete.
    carga && carga.percentual !== null && carga.percentual > 0 ? [{ nome, carga }] : []
  )

  const melhor = maiorPor(subiram, (c) => c.carga.percentual ?? 0)
  return melhor ? { tipo: 'carga', nome: melhor.nome, variacao: melhor.carga } : null
}

/**
 * No corpo, a maior mudança em **qualquer direção**: sem saber o objetivo do
 * aluno — e o plano não diz qual é —, perder 3 cm de cintura e ganhar 3 cm de
 * braço são igualmente evolução.
 */
function maiorMudancaDoCorpo(corporal: readonly DeltaCorporal[]): Destaque | null {
  const mudaram = corporal.filter((d) => d.variacao.diferenca !== 0)
  const melhor = maiorPor(mudaram, (d) => Math.abs(d.variacao.percentual ?? 0))

  return melhor
    ? { tipo: 'corpo', metrica: melhor.metrica, unidade: melhor.unidade, variacao: melhor.variacao }
    : null
}

function maiorPor<T>(itens: readonly T[], peso: (item: T) => number): T | null {
  return itens.reduce<T | null>(
    (melhor, item) => (melhor === null || peso(item) > peso(melhor) ? item : melhor),
    null
  )
}
