import type { Descanso, ExercicioNoDia } from '../dia/montarDia'
import {
  DIAS_DA_SEMANA,
  type Aerobico,
  type ArquivoDePlano,
  type DiaDaSemana,
  type Macros,
  type Refeicao,
  type SessaoTreino,
  type Suplemento,
} from '../schema/arquivoDePlano'

/**
 * A prescrição inteira, com todas as referências já resolvidas.
 *
 * É a contrapartida de `montarDia`: lá o plano é fatiado no momento de agir,
 * aqui ele é apresentado por inteiro para quem veio consultar. O princípio 1
 * ("um momento por vez, nunca o documento inteiro") não é violado por esta
 * função — é ela que torna a exceção possível, porque ver o plano completo é
 * ação deliberada, nunca a tela inicial.
 *
 * O que ela faz que a tela não deveria fazer: **todo join por id acontece
 * aqui**. A agenda aponta para o treino por `sessaoId`, o item aponta para o
 * exercício por `exercicioId`, e a posologia ancora numa refeição pelo número.
 * Se o JSX fosse buscar cada um desses, o formato do arquivo estaria espalhado
 * por quatro componentes, e mudá-lo custaria quatro lugares para lembrar.
 *
 * Função pura, e nada disto vai ao disco (ADR 0006): é o arquivo do
 * profissional lido de outro ângulo, não um dado novo.
 */

export interface DiaNaAgenda {
  readonly dia: DiaDaSemana
  /** `null` é dia sem musculação — não é uma sessão especial de "descanso". */
  readonly sessao: SessaoTreino | null
  readonly aerobico: Aerobico | null
  /** Nem um nem outro. Sábado só com aeróbico **não** é descanso. */
  readonly descanso: boolean
}

export interface TreinoPrescrito {
  readonly sessao: SessaoTreino
  readonly exercicios: readonly ExercicioNoDia[]
  /**
   * Os dias da semana em que este treino cai, em ordem da semana.
   *
   * É a agenda invertida: o arquivo diz "segunda tem o treino A", e quem
   * consulta pergunta "quando eu faço o treino A?". Vazio quando o profissional
   * escreveu o treino e não o agendou — acontece em plano de semana A/B, e
   * omitir o treino seria esconder prescrição do aluno.
   */
  readonly dias: readonly DiaDaSemana[]
}

/** Onde a posologia ancora, com a refeição já resolvida em vez do número dela. */
export type MomentoDaDose =
  | { readonly tipo: 'apos-refeicao'; readonly refeicao: Refeicao }
  | { readonly tipo: 'antes-do-treino' }
  | { readonly tipo: 'livre' }

export interface SuplementoPrescrito {
  readonly suplemento: Suplemento
  readonly momento: MomentoDaDose
}

export interface FormulaPrescrita {
  readonly nome: string
  readonly itens: readonly SuplementoPrescrito[]
}

export interface PrescricaoCompleta {
  /** Os sete dias, sempre, em ordem da semana. */
  readonly agenda: readonly DiaNaAgenda[]
  readonly treinos: readonly TreinoPrescrito[]
  readonly descansoEntreSeries: Descanso
  readonly refeicoes: readonly Refeicao[]
  readonly macrosAlvoDiario: Macros
  readonly hidratacaoDiariaLitros: number
  readonly vegetaisSugeridos: readonly string[]
  /** Como o profissional agrupou — o agrupamento é o raciocínio clínico dele. */
  readonly formulas: readonly FormulaPrescrita[]
}

export function prescricaoCompleta(arquivo: ArquivoDePlano): PrescricaoCompleta {
  const { treino, nutricao, suplementacao } = arquivo.plano

  const sessoesPorId = new Map(treino.sessoes.map((s) => [s.id, s]))
  const exerciciosPorId = new Map(treino.exercicios.map((e) => [e.id, e]))
  const refeicoesPorNumero = new Map(nutricao.refeicoes.map((r) => [r.numero, r]))

  const agenda = DIAS_DA_SEMANA.map((dia): DiaNaAgenda => {
    const doDia = treino.agendaSemanal[dia]
    const sessao = doDia.sessaoId ? (sessoesPorId.get(doDia.sessaoId) ?? null) : null
    return { dia, sessao, aerobico: doDia.aerobico, descanso: !sessao && !doDia.aerobico }
  })

  return {
    agenda,
    treinos: treino.sessoes.map((sessao) => ({
      sessao,
      exercicios: sessao.itens.flatMap((prescrito) => {
        const exercicio = exerciciosPorId.get(prescrito.exercicioId)
        // O schema já garante a referência. Se faltar, omitir é melhor que
        // mostrar um item sem nome no meio da consulta.
        return exercicio ? [{ prescrito, exercicio }] : []
      }),
      dias: agenda.filter((d) => d.sessao?.id === sessao.id).map((d) => d.dia),
    })),
    descansoEntreSeries: treino.descansoEntreSeries,
    // A ordem do array no arquivo não é contrato; o que o aluno lê como "o dia"
    // é a ordem dos números.
    refeicoes: [...nutricao.refeicoes].sort((a, b) => a.numero - b.numero),
    macrosAlvoDiario: nutricao.macrosAlvoDiario,
    hidratacaoDiariaLitros: nutricao.hidratacaoDiariaLitros,
    vegetaisSugeridos: nutricao.vegetaisSugeridos,
    formulas: suplementacao.formulas.map((formula) => ({
      nome: formula.nome,
      itens: formula.itens.map((suplemento) => ({
        suplemento,
        momento: momentoDa(suplemento, refeicoesPorNumero),
      })),
    })),
  }
}

function momentoDa(
  suplemento: Suplemento,
  refeicoesPorNumero: ReadonlyMap<number, Refeicao>
): MomentoDaDose {
  const { ancora } = suplemento.posologia
  if (ancora.tipo !== 'apos-refeicao') return ancora

  const refeicao = refeicoesPorNumero.get(ancora.refeicao)
  // Invariante do schema: a âncora aponta para uma refeição que existe. Sem
  // ela, o suplemento vira de horário livre em vez de sumir do plano — é o que
  // a observação do profissional já cobre.
  return refeicao ? { tipo: 'apos-refeicao', refeicao } : { tipo: 'livre' }
}
