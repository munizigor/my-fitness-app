const FORMATO = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Uma data do vault (`AAAA-MM-DD`) como o aluno lê: `10/06/2026`.
 *
 * Monta o `Date` a partir das partes, e nunca do parser de ISO: `new
 * Date('2026-06-10')` é meia-noite **UTC**, que em São Paulo é 21h do dia 9 —
 * e o histórico inteiro apareceria um dia atrasado para quem mora a oeste de
 * Greenwich. É a mesma armadilha que `domain/dia/dataLocal` evita do lado de lá.
 */
export function formatarData(data: string): string {
  const casou = FORMATO.exec(data)
  if (!casou) return data

  const [, ano, mes, dia] = casou
  return new Date(Number(ano), Number(mes) - 1, Number(dia)).toLocaleDateString('pt-BR')
}
