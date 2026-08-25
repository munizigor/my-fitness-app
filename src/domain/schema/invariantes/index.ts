import type { ArquivoDePlano } from '../arquivoDePlano'
import { integridadeReferencial } from './integridadeReferencial'
import type { Invariante, ProblemaDeInvariante } from './tipos'

/**
 * As regras que só existem **entre** campos, e que a validação de tipo nunca
 * pegaria. Um plano que aponta para um treino inexistente passa em toda
 * checagem de formato e mesmo assim quebra na tela do aluno numa terça-feira.
 *
 * Cada invariante é uma função pura, com arquivo e teste próprios. A adaptação
 * para o formato de erro do Zod acontece num lugar só — no `superRefine` da
 * raiz do schema —, de modo que acrescentar uma regra de negócio não seja
 * acrescentar código de validação.
 *
 * **Nem toda regra de negócio mora aqui, e isso é decisão, não esquecimento.**
 * Regras locais a um objeto — "o mínimo não pode ser maior que o máximo" —
 * ficam no `.refine()` do próprio campo, porque é lá que o caminho do erro cai
 * certo, e é o caminho que `descreverProblema` usa para dizer ao profissional
 * onde corrigir. Trazê-las para cá produziria dois erros para um mesmo engano.
 */

export type { Invariante, ProblemaDeInvariante, Relatar } from './tipos'

export const INVARIANTES: readonly Invariante[] = [integridadeReferencial]

/** Roda todas e devolve o que cada uma encontrou, na ordem em que rodaram. */
export function conferirInvariantes(arquivo: ArquivoDePlano): ProblemaDeInvariante[] {
  const problemas: ProblemaDeInvariante[] = []
  for (const invariante of INVARIANTES) invariante(arquivo, (p) => problemas.push(p))
  return problemas
}
