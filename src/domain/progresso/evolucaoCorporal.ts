import { CIRCUNFERENCIAS, type Circunferencia, type Medida } from '../aluno/medida'
import { variacaoEntre, type Ponto, type Variacao } from './variacao'

/**
 * Como o corpo do aluno mudou entre a primeira e a última aferição.
 *
 * A contraparte da carga: o aluno que não vê progresso na barra às vezes o tem
 * na fita métrica, e vice-versa. A planilha sobrescrevia o peso e essa
 * trajetória não existia — aqui cada aferição é um ponto datado no vault, e o
 * delta é conta pura sobre eles (ADR 0006).
 *
 * **Cada medida é uma série independente.** Quem pesou três vezes e mediu a
 * cintura uma tem trajetória de peso e não tem de cintura; forçá-las ao mesmo
 * par de datas inventaria um delta zero que ninguém aferiu.
 */

/** O peso e a gordura ao lado das partes: nenhum rótulo colide, e a tela lê um só. */
export type MetricaCorporal = 'peso' | 'gordura' | Circunferencia

export type UnidadeCorporal = 'kg' | '%' | 'cm'

export interface DeltaCorporal {
  readonly metrica: MetricaCorporal
  readonly unidade: UnidadeCorporal
  readonly variacao: Variacao
}

/** A ordem do formulário do Perfil: o aluno não reaprende a lista aqui. */
const SERIES: readonly { metrica: MetricaCorporal; unidade: UnidadeCorporal; valorDe: Ler }[] = [
  { metrica: 'peso', unidade: 'kg', valorDe: (m) => m.pesoKg },
  { metrica: 'gordura', unidade: '%', valorDe: (m) => m.percentualGordura },
  ...CIRCUNFERENCIAS.map((parte) => ({
    metrica: parte,
    unidade: 'cm' as const,
    valorDe: (m: Medida) => m.circunferenciasCm?.[parte],
  })),
]

type Ler = (medida: Medida) => number | undefined

export function evolucaoCorporal(medidas: readonly Medida[]): DeltaCorporal[] {
  return SERIES.flatMap(({ metrica, unidade, valorDe }) => {
    const variacao = variacaoEntre(pontosDe(medidas, valorDe))
    // Menos de duas aferições daquela medida: ainda não é trajetória.
    return variacao ? [{ metrica, unidade, variacao }] : []
  })
}

function pontosDe(medidas: readonly Medida[], valorDe: Ler): Ponto[] {
  return medidas.flatMap((medida) => {
    const valor = valorDe(medida)
    return valor === undefined ? [] : [{ data: medida.data, valor }]
  })
}
