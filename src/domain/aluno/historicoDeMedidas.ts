import type { Medida } from './medida'

/**
 * A série temporal do corpo do aluno.
 *
 * Tudo aqui é **derivado** e nunca vai ao disco (ADR 0006): o vault guarda uma
 * aferição por arquivo, e ordem, última medida e — na story de Evolução —
 * variação são funções puras sobre essa lista.
 *
 * Ordenar por texto funciona porque a data é `AAAA-MM-DD`: nesse formato a
 * ordem alfabética **é** a cronológica, que é metade da razão de o vault usá-lo
 * como nome de arquivo.
 */

/** Mais recente primeiro: é assim que o aluno lê o próprio histórico. */
export function ordenarMedidas(medidas: readonly Medida[]): Medida[] {
  return [...medidas].sort((a, b) => b.data.localeCompare(a.data))
}

/**
 * A última aferição, que é o padrão da próxima: quem se pesa de novo confirma
 * ou ajusta um número que já está na tela, em vez de digitar tudo outra vez
 * (princípio 2 da interface).
 */
export function ultimaMedida(medidas: readonly Medida[]): Medida | null {
  return ordenarMedidas(medidas)[0] ?? null
}
