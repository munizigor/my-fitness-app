import type {
  Aerobico,
  ArquivoDePlano,
  DiaDaSemana,
  Execucao,
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
 * para saber o que fazer às sete da manhã. Esta função faz esse cruzamento.
 *
 * O dia tem **poucos blocos grandes**, não muitos cartões pequenos. Suplemento
 * não é compromisso próprio: é parte de tomar o café da manhã. Aeróbico não é
 * uma segunda ida à academia: é parte de ir treinar. Por isso ambos moram
 * *dentro* do momento a que pertencem, e não como itens irmãos que o aluno
 * teria que reconhecer como sendo o mesmo momento.
 *
 * Função pura, sem I/O e sem relógio: o dia é derivado de plano + data, nunca
 * persistido (ADR 0006). Testável sem browser e sem montar tela.
 */

/**
 * A janela de descanso entre séries.
 *
 * Mora aqui, e não na UI, porque é o domínio que decide qual descanso vale para
 * cada exercício. O cronômetro só conta — redeclarar a forma lá dentro deixaria
 * as duas dessincronizarem em silêncio, compilando.
 */
export interface Descanso {
  readonly minSegundos: number
  readonly maxSegundos: number
}

export interface SuplementoNoDia {
  readonly suplemento: Suplemento
  /** De qual fórmula veio. O dia não é organizado por fórmula, mas a origem importa. */
  readonly formula: string
}

/**
 * Como a série é executada, na forma em que a **tela** precisa dela.
 *
 * Tem nome próprio, separado do `Execucao` do schema, porque montarDia é o
 * adaptador entre o arquivo e a UI: o formato do arquivo pode mudar sem que
 * cada componente saiba disso. Hoje as duas formas coincidem, e por isso isto
 * é um apelido em vez de uma cópia — duplicar a estrutura agora só criaria
 * duas coisas para manter sincronizadas.
 */
export type ExecucaoNoDia = Execucao

export interface ExercicioNoDia {
  readonly prescrito: ItemDeTreino
  readonly exercicio: Exercicio
}

export type ItemDoDia =
  | {
      readonly tipo: 'refeicao'
      readonly id: string
      readonly refeicao: Refeicao
      /** Os que a posologia ancorou nesta refeição. Vazio é o caso comum. */
      readonly suplementos: readonly SuplementoNoDia[]
    }
  | {
      readonly tipo: 'treino'
      readonly id: string
      readonly sessao: SessaoTreino
      readonly exercicios: readonly ExercicioNoDia[]
      readonly descansoEntreSeries: Descanso
      /** Faz parte da mesma ida à academia; `null` quando a agenda não marca. */
      readonly aerobico: Aerobico | null
      /** Os de tomar antes de treinar. */
      readonly suplementos: readonly SuplementoNoDia[]
    }
  /** Só nos dias em que existe aeróbico sem musculação — senão ele sumiria do dia. */
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
   * Depois de qual refeição o bloco de treino entra na linha do tempo.
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
  const bloco = blocoDeTreino(plano, sessao, agenda.aerobico, suplementos.antesDoTreino)
  const itens: ItemDoDia[] = []

  const refeicoes = [...plano.nutricao.refeicoes].sort((a, b) => a.numero - b.numero)
  const primeira = refeicoes[0]?.numero

  for (const refeicao of refeicoes) {
    const daRefeicao = suplementos.aposRefeicao.get(refeicao.numero) ?? []
    // Os de horário livre encostam na primeira refeição: é onde o aluno tem
    // mais chance de agir, e a observação do profissional explica a folga.
    const livres = refeicao.numero === primeira ? suplementos.livres : []

    itens.push({
      tipo: 'refeicao',
      id: `refeicao-${refeicao.numero}`,
      refeicao,
      suplementos: [...daRefeicao, ...livres],
    })

    if (refeicao.numero === preferencias.treinoDepoisDaRefeicao && bloco) itens.push(bloco)
  }

  // Preferência apontando para uma refeição que o plano não tem não pode fazer
  // o treino sumir do dia.
  if (bloco && !itens.includes(bloco)) itens.push(bloco)

  return {
    data,
    diaDaSemana,
    descanso: !sessao && !agenda.aerobico,
    hidratacaoDiariaLitros: plano.nutricao.hidratacaoDiariaLitros,
    macrosAlvoDiario: plano.nutricao.macrosAlvoDiario,
    itens,
  }
}

/**
 * Uma ida à academia é um bloco só: pré-treino, musculação e aeróbico.
 *
 * Sem musculação, o aeróbico ainda precisa aparecer — é o dia de sábado do
 * fixture, e some se ficar escondido dentro de um treino que não existe.
 */
function blocoDeTreino(
  plano: ArquivoDePlano['plano'],
  sessao: SessaoTreino | undefined,
  aerobico: Aerobico | null,
  antesDoTreino: readonly SuplementoNoDia[]
): ItemDoDia | null {
  if (sessao) {
    return {
      tipo: 'treino',
      id: `treino-${sessao.id}`,
      sessao,
      exercicios: resolverExercicios(plano, sessao),
      descansoEntreSeries: plano.treino.descansoEntreSeries,
      aerobico,
      suplementos: antesDoTreino,
    }
  }

  return aerobico ? { tipo: 'aerobico', id: 'aerobico', aerobico } : null
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
