import type { RegistroDiario } from '../registro/registroDiario'
import type { ArquivoDePlano } from '../schema/arquivoDePlano'
import { variacaoEntre, type Variacao } from './variacao'

/**
 * A trajetória de cada exercício ao longo do tempo.
 *
 * É a função que ataca a causa-raiz do produto: o aluno abandona porque **não
 * sente evolução**. Ele levanta 6 kg a mais que em agosto e não sabe — a
 * planilha guardava o último número e apagava o anterior. Aqui o histórico
 * inteiro já está no vault, e transformá-lo em trajetória é uma conta pura.
 *
 * Duas decisões de agregação que o resto do domínio já anunciava:
 *
 * - **A unidade é a sessão, não a série.** Comparar séries soltas mediria a
 *   fadiga dentro do treino, não a evolução entre treinos.
 * - **Agrega por exercício, não por item prescrito.** É o oposto de
 *   `sugerirCarga`, e de propósito: lá os dois lados da Prancha Lateral não
 *   podem se contaminar, porque a sugestão vai para o campo de um lado só. Aqui
 *   o aluno quer saber se a prancha melhorou — e o supino do Treino A e o do
 *   Treino B são o mesmo supino.
 *
 * Tudo derivado, nada persistido (ADR 0006).
 */

export interface SessaoDoExercicio {
  readonly data: string
  /** A maior carga do dia. `undefined` quando nenhuma série registrou carga. */
  readonly cargaMaxKg: number | undefined
  /** Σ carga × repetições do dia. É o que cresce quando a carga fica igual. */
  readonly volumeKg: number
  readonly series: number
}

export interface ProgressoDeExercicio {
  readonly exercicioId: string
  readonly nome: string
  /** Cronológico, da mais antiga para a mais recente: é uma trajetória. */
  readonly sessoes: readonly SessaoDoExercicio[]
  /** `null` com menos de duas sessões comparáveis — um ponto não é evolução. */
  readonly carga: Variacao | null
  readonly volume: Variacao | null
}

export function progressoPorExercicio(
  plano: ArquivoDePlano['plano'],
  historico: readonly RegistroDiario[]
): ProgressoDeExercicio[] {
  const exercicioDoItem = indexarItens(plano)
  const porExercicio = new Map<string, Map<string, SessaoEmConstrucao>>()

  for (const registro of historico) {
    for (const serie of registro.series) {
      // Série apontando para item que o plano atual não tem: o aluno trocou de
      // plano, ou o profissional reemitiu o arquivo. Some da conta em vez de
      // virar uma trajetória sem nome.
      const exercicioId = exercicioDoItem.get(serie.itemDeTreinoId)
      if (!exercicioId) continue

      const dias = porExercicio.get(exercicioId) ?? new Map<string, SessaoEmConstrucao>()
      porExercicio.set(exercicioId, dias)

      const sessao = dias.get(registro.data) ?? { cargaMaxKg: undefined, volumeKg: 0, series: 0 }
      sessao.series += 1
      if (serie.cargaKg !== undefined) {
        sessao.cargaMaxKg = Math.max(sessao.cargaMaxKg ?? serie.cargaKg, serie.cargaKg)
        sessao.volumeKg += serie.cargaKg * (serie.repeticoes ?? 0)
      }
      dias.set(registro.data, sessao)
    }
  }

  const nomes = new Map(plano.treino.exercicios.map((e) => [e.id, e.nome]))

  return [...porExercicio.entries()]
    .map(([exercicioId, dias]) => montar(exercicioId, nomes.get(exercicioId) ?? exercicioId, dias))
    .sort(maisRecentePrimeiro)
}

type SessaoEmConstrucao = { cargaMaxKg: number | undefined; volumeKg: number; series: number }

function montar(
  exercicioId: string,
  nome: string,
  dias: Map<string, SessaoEmConstrucao>
): ProgressoDeExercicio {
  // Ordenar por texto é ordenar no tempo, porque a data é `AAAA-MM-DD`.
  const sessoes: SessaoDoExercicio[] = [...dias.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([data, sessao]) => ({ data, ...sessao }))

  return {
    exercicioId,
    nome,
    sessoes,
    carga: variacao(sessoes, (s) => s.cargaMaxKg),
    volume: variacao(sessoes, (s) => (s.volumeKg > 0 ? s.volumeKg : undefined)),
  }
}

/**
 * Os pontos da série, contando só as sessões **em que houve o que medir**.
 *
 * Um dia sem carga registrada — a série de prancha, o treino que o aluno só
 * marcou como feito — não pode entrar como zero e virar "você caiu 100%".
 */
function variacao(
  sessoes: readonly SessaoDoExercicio[],
  valorDe: (sessao: SessaoDoExercicio) => number | undefined
): Variacao | null {
  return variacaoEntre(
    sessoes.flatMap((sessao) => {
      const valor = valorDe(sessao)
      return valor === undefined ? [] : [{ data: sessao.data, valor }]
    })
  )
}

/**
 * O que ele treinou ontem vem antes do que largou em maio — a tela responde
 * "eu evoluí?" sobre o treino que está fazendo agora.
 */
function maisRecentePrimeiro(a: ProgressoDeExercicio, b: ProgressoDeExercicio): number {
  const ultima = (p: ProgressoDeExercicio) => p.sessoes[p.sessoes.length - 1]?.data ?? ''
  return ultima(b).localeCompare(ultima(a)) || a.nome.localeCompare(b.nome, 'pt-BR')
}

/**
 * De qual exercício é cada item prescrito, olhando o plano inteiro.
 *
 * O registro do aluno guarda o item, não o exercício (é o que separa os dois
 * lados da prancha na hora de sugerir carga). Reconstruir o caminho de volta é
 * o que permite somar as duas prescrições numa trajetória só.
 */
function indexarItens(plano: ArquivoDePlano['plano']): Map<string, string> {
  const porItem = new Map<string, string>()
  for (const sessao of plano.treino.sessoes) {
    for (const item of sessao.itens) porItem.set(item.id, item.exercicioId)
  }
  return porItem
}
