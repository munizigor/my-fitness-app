import type { ArquivoDePlano } from '../arquivoDePlano'

/**
 * O contrato de uma invariante de negócio.
 *
 * Desacoplado do Zod de propósito. Uma invariante devolve `{caminho, mensagem}`
 * — que é o que o profissional precisa para achar e corrigir o campo — e não um
 * objeto de erro da biblioteca de validação. Assim o teste de cada regra
 * assere sobre a regra, e não sobre internals do Zod.
 *
 * Mora em arquivo próprio, separado do `index`, para que as invariantes possam
 * importar o tipo sem depender do módulo que as agrega.
 */

export interface ProblemaDeInvariante {
  /** Onde, no documento. Vira o `path` do erro, que `descreverProblema` traduz. */
  readonly caminho: readonly (string | number)[]
  /** O que está errado, na linguagem de quem vai corrigir — o profissional. */
  readonly mensagem: string
}

export type Relatar = (problema: ProblemaDeInvariante) => void

export type Invariante = (arquivo: ArquivoDePlano, relatar: Relatar) => void
