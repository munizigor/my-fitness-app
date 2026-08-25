import type { RegistroDiario } from '../registro/registroDiario'
import type { ArquivoDePlano } from '../schema/arquivoDePlano'
import { exercicioPorItem, progressoPorExercicio } from './progressoDeExercicio'

/**
 * Os recordes pessoais que aconteceram num dia.
 *
 * Princípio 3 da interface — **o app age; o usuário não precisa lembrar**. O eu
 * afetivo não vai abrir a aba Evolução para procurar prova de que está
 * melhorando; a prova tem que chegar até ele, no dia em que acontece. Por isso
 * existe uma função para "o que de notável houve hoje", separada da trajetória
 * completa: Hoje pergunta isso, e Hoje é onde o aluno já está.
 *
 * Três decisões que protegem o marco de virar confete:
 *
 * - **Empatar não é recorde.** Marco que acontece toda semana deixa de ser marco.
 * - **A primeira vez não é recorde.** Sem passado não há o que superar, e o
 *   primeiro treino do plano marcaria todos os exercícios de uma vez.
 * - **Compara com a melhor de todas**, não com a do último treino: voltar de
 *   uma pausa e superar a semana passada ainda é estar abaixo de si mesmo.
 */

export interface Recorde {
  readonly exercicioId: string
  readonly nome: string
  readonly cargaKg: number
  /** A marca que caiu. É o que dá tamanho ao recorde na frase. */
  readonly anteriorKg: number
}

export function recordesDoDia(
  plano: ArquivoDePlano['plano'],
  historico: readonly RegistroDiario[],
  data: string
): Recorde[] {
  const progresso = new Map(
    progressoPorExercicio(plano, historico).map((p) => [p.exercicioId, p])
  )

  return exerciciosNaOrdemDoDia(plano, historico, data).flatMap((exercicioId) => {
    const trajetoria = progresso.get(exercicioId)
    /* c8 ignore next -- quem entrou na ordem do dia treinou; a guarda é do tipo */
    if (!trajetoria) return []
    const { nome, sessoes } = trajetoria

    // Só o que veio antes conta como marca a superar — o vault pode ter dias
    // posteriores, e o recorde de hoje não deixa de ter acontecido por causa
    // deles.
    const anteriores = sessoes.filter((s) => s.data < data)
    const hoje = sessoes.find((s) => s.data === data)

    const cargaKg = hoje?.cargaMaxKg
    if (cargaKg === undefined) return []

    const cargas = anteriores.flatMap((s) => (s.cargaMaxKg === undefined ? [] : [s.cargaMaxKg]))
    if (cargas.length === 0) return []

    const anteriorKg = Math.max(...cargas)
    return cargaKg > anteriorKg ? [{ exercicioId, nome, cargaKg, anteriorKg }] : []
  })
}

/**
 * Os exercícios do dia na ordem em que o aluno os fez.
 *
 * Dois recordes no mesmo dia aparecem na ordem em que aconteceram, e não em
 * ordem alfabética: a sequência do treino é a única que significa algo para
 * quem acabou de sair da academia.
 */
function exerciciosNaOrdemDoDia(
  plano: ArquivoDePlano['plano'],
  historico: readonly RegistroDiario[],
  data: string
): string[] {
  const porItem = exercicioPorItem(plano)
  const ordem: string[] = []

  for (const serie of historico.find((r) => r.data === data)?.series ?? []) {
    const exercicioId = porItem.get(serie.itemDeTreinoId)
    if (exercicioId && !ordem.includes(exercicioId)) ordem.push(exercicioId)
  }
  return ordem
}
