import { DataInvalidaError } from '../errors/DataInvalidaError'
import { DIAS_DA_SEMANA, type DiaDaSemana } from '../schema/arquivoDePlano'

/**
 * Datas de domínio são `AAAA-MM-DD` no fuso do aluno.
 *
 * A armadilha que este módulo existe para evitar: `new Date('2026-08-25')` é
 * interpretado pelo JavaScript como **meia-noite UTC**. Em São Paulo (UTC-3)
 * isso é 21h do dia 24. Um aluno que abre o app às 22h veria o treino de
 * ontem — e o bug só apareceria à noite, para quem mora a oeste de Greenwich.
 *
 * Por isso toda conversão aqui usa as partes da data, nunca o parser de ISO.
 */

const FORMATO = /^(\d{4})-(\d{2})-(\d{2})$/

/** Domingo é 0 em `Date.getDay()`; a agenda do plano começa na segunda. */
const POR_INDICE_JS: readonly DiaDaSemana[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']

export function ehDataLocal(valor: string): boolean {
  return partesDe(valor) !== null
}

export function diaDaSemanaDe(data: string): DiaDaSemana {
  const partes = partesDe(data)
  if (!partes) throw new DataInvalidaError(data)

  const { ano, mes, dia } = partes
  const indice = new Date(ano, mes - 1, dia).getDay()
  const encontrado = POR_INDICE_JS[indice]
  /* c8 ignore next -- getDay() só devolve 0..6; a guarda existe para o tipo */
  if (!encontrado) throw new DataInvalidaError(data)
  return encontrado
}

/**
 * Quantos dias separam duas datas de domínio.
 *
 * É o que transforma dois pontos em uma frase: "+12% de carga **em 4 semanas**"
 * — sem o intervalo, a variação não diz se o aluno evoluiu rápido ou passou o
 * semestre parado.
 *
 * A conta é feita em UTC de propósito, mesmo tratando de datas locais. Onde há
 * horário de verão, um dos dias do intervalo tem 23 ou 25 horas, e a divisão
 * por 86.400.000 sobre datas locais devolveria 27,96 — que arredondaria "4
 * semanas" para 3.
 */
export function diferencaEmDias(de: string, ate: string): number {
  return Math.round((emUtc(ate) - emUtc(de)) / MILISSEGUNDOS_POR_DIA)
}

const MILISSEGUNDOS_POR_DIA = 86_400_000

function emUtc(data: string): number {
  const partes = partesDe(data)
  if (!partes) throw new DataInvalidaError(data)
  return Date.UTC(partes.ano, partes.mes - 1, partes.dia)
}

/** Hoje no calendário do aluno. O instante é injetável para o teste não depender do relógio. */
export function hojeLocal(instante: Date = new Date()): string {
  const ano = instante.getFullYear()
  const mes = `${instante.getMonth() + 1}`.padStart(2, '0')
  const dia = `${instante.getDate()}`.padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export { DIAS_DA_SEMANA }
export type { DiaDaSemana }

/**
 * Valida formato **e** existência no calendário: `2026-02-30` casa com a
 * expressão regular e mesmo assim não existe. O `Date` normalizaria para 2 de
 * março em silêncio, que é o tipo de correção que ninguém pediu.
 */
function partesDe(valor: string): { ano: number; mes: number; dia: number } | null {
  const casou = FORMATO.exec(valor)
  if (!casou) return null

  const ano = Number(casou[1])
  const mes = Number(casou[2])
  const dia = Number(casou[3])

  const data = new Date(ano, mes - 1, dia)
  const existe = data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia
  return existe ? { ano, mes, dia } : null
}
