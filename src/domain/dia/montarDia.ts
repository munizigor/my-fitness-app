import type {
  Aerobico,
  ArquivoDePlano,
  DiaDaSemana,
  Exercicio,
  ItemDeTreino,
  Macros,
  Refeicao,
  SessaoTreino,
  Suplemento,
} from '../schema/arquivoDePlano'
import { diaDaSemanaDe } from './dataLocal'

/**
 * Monta a linha do tempo de um dia a partir do plano.
 *
 * É aqui que o app deixa de ser a planilha com CSS melhor. A planilha tem três
 * abas — treino, nutrição, suplementos — e cabe ao aluno cruzá-las de cabeça
 * para saber o que fazer às sete da manhã. Esta função faz esse cruzamento:
 * a agenda semanal escolhe o treino do dia, e a **posologia de cada suplemento
 * o coloca junto da refeição ou do treino a que pertence**.
 *
 * Função pura, sem I/O e sem relógio: o dia é derivado de plano + data, nunca
 * persistido (ADR 0006). Testável sem browser e sem montar tela.
 */

export type MomentoDeSuplemento =
  { tipo: 'apos-refeicao'; refeicao: number } | { tipo: 'antes-do-treino' } | { tipo: 'livre' }

export interface SuplementoNoDia {
  readonly suplemento: Suplemento
  /** De qual fórmula veio. O dia não é organizado por fórmula, mas a origem importa. */
  readonly formula: string
}

export interface ExercicioNoDia {
  readonly prescrito: ItemDeTreino
  readonly exercicio: Exercicio
}

export type ItemDoDia =
  | { readonly tipo: 'refeicao'; readonly id: string; readonly refeicao: Refeicao }
  | {
      readonly tipo: 'suplementos'
      readonly id: string
      readonly momento: MomentoDeSuplemento
      readonly suplementos: readonly SuplementoNoDia[]
    }
  | {
      readonly tipo: 'treino'
      readonly id: string
      readonly sessao: SessaoTreino
      readonly exercicios: readonly ExercicioNoDia[]
      readonly descansoEntreSeries: { readonly minSegundos: number; readonly maxSegundos: number }
    }
  | { readonly tipo: 'aerobico'; readonly id: string; readonly aerobico: Aerobico }

export interface Dia {
  readonly data: string
  readonly diaDaSemana: DiaDaSemana
  /** Nem musculação nem aeróbico. Merece estado próprio na tela, não uma lista vazia. */
  readonly descanso: boolean
  readonly hidratacaoDiariaLitros: number
  readonly macrosAlvoDiario: Macros
  readonly itens: readonly ItemDoDia[]
}

export interface PreferenciasDoDia {
  /**
   * Depois de qual refeição o treino entra na linha do tempo.
   *
   * O plano do profissional diz em que **dia** o aluno treina, nunca a que
   * horas — quem sabe isso é o aluno. Por isso a posição é preferência dele, e
   * fica explícita como parâmetro em vez de ser adivinhada aqui dentro.
   */
  readonly treinoDepoisDaRefeicao: number
}

const PADRAO: PreferenciasDoDia = { treinoDepoisDaRefeicao: 1 }

export function montarDia(
  plano: ArquivoDePlano['plano'],
  data: string,
  preferencias: PreferenciasDoDia = PADRAO
): Dia {
  const diaDaSemana = diaDaSemanaDe(data)
  const agenda = plano.treino.agendaSemanal[diaDaSemana]

  const sessao = agenda.sessaoId
    ? plano.treino.sessoes.find((s) => s.id === agenda.sessaoId)
    : undefined

  const suplementos = agruparPorMomento(plano.suplementacao.formulas, { temTreino: !!sessao })
  const itens: ItemDoDia[] = []

  for (const refeicao of [...plano.nutricao.refeicoes].sort((a, b) => a.numero - b.numero)) {
    itens.push({ tipo: 'refeicao', id: `refeicao-${refeicao.numero}`, refeicao })

    const aposEsta = suplementos.aposRefeicao.get(refeicao.numero)
    if (aposEsta?.length) {
      itens.push({
        tipo: 'suplementos',
        id: `suplementos-refeicao-${refeicao.numero}`,
        momento: { tipo: 'apos-refeicao', refeicao: refeicao.numero },
        suplementos: aposEsta,
      })
    }

    // Os de horário livre encostam na primeira refeição: é onde o aluno tem
    // mais chance de agir, e a observação do profissional explica a folga.
    if (refeicao.numero === primeiraRefeicao(plano) && suplementos.livres.length) {
      itens.push({
        tipo: 'suplementos',
        id: 'suplementos-livres',
        momento: { tipo: 'livre' },
        suplementos: suplementos.livres,
      })
    }

    if (refeicao.numero === preferencias.treinoDepoisDaRefeicao) {
      itens.push(...blocoDeTreino(plano, sessao, agenda.aerobico, suplementos.antesDoTreino))
    }
  }

  // Preferência apontando para uma refeição que o plano não tem não pode fazer
  // o treino sumir do dia.
  if (!itens.some((i) => i.tipo === 'treino' || i.tipo === 'aerobico')) {
    itens.push(...blocoDeTreino(plano, sessao, agenda.aerobico, suplementos.antesDoTreino))
  }

  return {
    data,
    diaDaSemana,
    descanso: !sessao && !agenda.aerobico,
    hidratacaoDiariaLitros: plano.nutricao.hidratacaoDiariaLitros,
    macrosAlvoDiario: plano.nutricao.macrosAlvoDiario,
    itens,
  }
}

function blocoDeTreino(
  plano: ArquivoDePlano['plano'],
  sessao: SessaoTreino | undefined,
  aerobico: Aerobico | null,
  antesDoTreino: readonly SuplementoNoDia[]
): ItemDoDia[] {
  const bloco: ItemDoDia[] = []

  if (sessao) {
    if (antesDoTreino.length) {
      bloco.push({
        tipo: 'suplementos',
        id: 'suplementos-antes-do-treino',
        momento: { tipo: 'antes-do-treino' },
        suplementos: antesDoTreino,
      })
    }
    bloco.push({
      tipo: 'treino',
      id: `treino-${sessao.id}`,
      sessao,
      exercicios: resolverExercicios(plano, sessao),
      descansoEntreSeries: plano.treino.descansoEntreSeries,
    })
  }

  if (aerobico) {
    bloco.push({ tipo: 'aerobico', id: 'aerobico', aerobico })
  }

  return bloco
}

/**
 * O item prescrito referencia o exercício por id; a tela precisa do nome. Fazer
 * a busca aqui evita que cada componente vá ao catálogo por conta própria.
 */
function resolverExercicios(
  plano: ArquivoDePlano['plano'],
  sessao: SessaoTreino
): ExercicioNoDia[] {
  const porId = new Map(plano.treino.exercicios.map((e) => [e.id, e]))
  return sessao.itens.flatMap((prescrito) => {
    const exercicio = porId.get(prescrito.exercicioId)
    // O schema já garante a referência; se faltar, é melhor omitir o exercício
    // que renderizar um item sem nome no meio da série.
    return exercicio ? [{ prescrito, exercicio }] : []
  })
}

function agruparPorMomento(
  formulas: ArquivoDePlano['plano']['suplementacao']['formulas'],
  { temTreino }: { temTreino: boolean }
) {
  const aposRefeicao = new Map<number, SuplementoNoDia[]>()
  const antesDoTreino: SuplementoNoDia[] = []
  const livres: SuplementoNoDia[] = []

  for (const formula of formulas) {
    for (const suplemento of formula.itens) {
      const noDia: SuplementoNoDia = { suplemento, formula: formula.nome }
      const { ancora } = suplemento.posologia

      if (ancora.tipo === 'apos-refeicao') {
        const lista = aposRefeicao.get(ancora.refeicao) ?? []
        lista.push(noDia)
        aposRefeicao.set(ancora.refeicao, lista)
      } else if (ancora.tipo === 'antes-do-treino') {
        // Lembrar de tomar pré-treino num dia de descanso é ruído puro.
        if (temTreino) antesDoTreino.push(noDia)
      } else {
        livres.push(noDia)
      }
    }
  }

  return { aposRefeicao, antesDoTreino, livres }
}

function primeiraRefeicao(plano: ArquivoDePlano['plano']): number {
  return Math.min(...plano.nutricao.refeicoes.map((r) => r.numero))
}
