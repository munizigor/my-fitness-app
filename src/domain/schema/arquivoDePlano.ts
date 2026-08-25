import { z } from 'zod'
import { ArquivoInvalidoError } from '../errors/ArquivoInvalidoError'
import { descreverProblema } from './descreverProblema'

/**
 * O formato do plano que o profissional envia ao aluno.
 *
 * O princípio que orienta cada campo: **o modelo guarda significado, não a
 * notação com que o dado é escrito numa planilha.** "4x10a12" é uma forma de
 * escrever "4 séries de 10 a 12 repetições"; o que viaja no arquivo é o
 * significado. A notação vira, no máximo, atalho de digitação no editor do
 * profissional (`interpretarAtalhoDePrescricao`).
 *
 * O critério para decidir se um campo vira estrutura ou fica texto livre:
 * **o app precisa calcular com isso, ou é instrução para uma pessoa ler?**
 * Séries e quantidades viram números. "Descer até o talo" continua texto,
 * porque é exatamente isso que é.
 */

// Mensagens que não mapeamos caem no locale do Zod; as que importam são
// reescritas em `descreverProblema`, na linguagem de quem monta o plano.
z.config(z.locales.pt())

export const FORMATO = 'fitvault-plano'
export const SCHEMA_VERSION_ATUAL = 2

export const DIAS_DA_SEMANA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'] as const
export type DiaDaSemana = (typeof DIAS_DA_SEMANA)[number]

/**
 * Vocabulário controlado porque o app **agrega** por ele: é o que permite
 * mostrar "volume de costas subiu 15% em 4 semanas", que a planilha nunca
 * conseguiu. Texto livre aqui viraria "Costas", "costas" e "dorsais" como três
 * grupos diferentes, e a soma perderia o sentido.
 */
export const GRUPOS_MUSCULARES = [
  'peito',
  'costas',
  'ombros',
  'biceps',
  'triceps',
  'antebraco',
  'quadriceps',
  'posteriores',
  'gluteos',
  'panturrilhas',
  'abdomen',
] as const
export type GrupoMuscular = (typeof GRUPOS_MUSCULARES)[number]

/** Unidades em que um profissional realmente escreve uma porção. */
export const UNIDADES_DE_ALIMENTO = [
  'g',
  'ml',
  'unidade',
  'fatia',
  'colher-de-sopa',
  'colher-de-cha',
  'xicara',
  'concha',
] as const

/** Unidades em que um profissional realmente escreve uma dose. */
export const UNIDADES_DE_DOSE = [
  'mg',
  'g',
  'ml',
  'capsula',
  'comprimido',
  'scoop',
  'sache',
  'gota',
] as const

const texto = z.string().trim().min(1)
const contagem = z.number().int().positive()
const medida = z.number().positive()
const gramas = z.number().nonnegative()

// --- Treino ----------------------------------------------------------------

/**
 * O exercício em si, independente de onde é usado. Separá-lo da prescrição é o
 * que permite a mesma Prancha Lateral aparecer duas vezes num treino — uma por
 * lado, distinguidas pela observação — sem virar dois exercícios diferentes no
 * histórico de evolução.
 */
const exercicio = z.object({
  id: texto,
  nome: texto,
  gruposMusculares: z.array(z.enum(GRUPOS_MUSCULARES)).min(1),
})

/** O que o aluno faz em cada série: repetições numa faixa, ou tempo sustentado. */
const execucao = z.discriminatedUnion('tipo', [
  z
    .object({ tipo: z.literal('repeticoes'), min: contagem, max: contagem })
    .refine((r) => r.max >= r.min, { message: 'o mínimo não pode ser maior que o máximo' }),
  z.object({ tipo: z.literal('tempo'), segundos: contagem }),
])

/** O uso de um exercício dentro de um treino: séries, execução, carga, observação. */
const itemDeTreino = z.object({
  id: texto,
  exercicioId: texto,
  series: contagem,
  execucao,
  /** Opcional: nem todo profissional prescreve carga, e o aluno registra a real. */
  cargaAlvoKg: medida.optional(),
  /** Texto livre do profissional: técnica, cue, lado. Instrução para gente ler. */
  observacao: texto.optional(),
})

const sessaoTreino = z.object({
  id: texto,
  rotulo: texto,
  // Rótulo livre: cada profissional usa o seu vocabulário — Upper/Lower,
  // Push/Pull/Legs, ABC. O app exibe, não calcula.
  foco: texto.optional(),
  itens: z.array(itemDeTreino).min(1),
})

const aerobico = z.object({ modalidade: texto, duracaoMinutos: contagem })

// Descanso é ausência (`null`), não uma sessão especial que a UI teria que
// filtrar em todo lugar.
const agendaDoDia = z.object({
  sessaoId: texto.nullable(),
  aerobico: aerobico.nullable(),
})

const agendaSemanal = z.object(
  Object.fromEntries(DIAS_DA_SEMANA.map((dia) => [dia, agendaDoDia])) as Record<
    DiaDaSemana,
    typeof agendaDoDia
  >
)

const treino = z.object({
  descansoEntreSeries: z
    .object({ minSegundos: contagem, maxSegundos: contagem })
    .refine((d) => d.maxSegundos >= d.minSegundos, {
      message: 'o descanso mínimo não pode ser maior que o máximo',
    }),
  exercicios: z.array(exercicio).min(1),
  sessoes: z.array(sessaoTreino).min(1),
  agendaSemanal,
})

// --- Nutrição --------------------------------------------------------------

const macros = z.object({ proteinaG: gramas, carboidratoG: gramas, gorduraG: gramas })

/** Uma porção concreta: alimento, quanto e em que unidade. */
const opcaoDeItem = z.object({
  alimento: texto,
  quantidade: medida,
  unidade: z.enum(UNIDADES_DE_ALIMENTO),
})

/**
 * Um item da refeição, com as opções que o aluno pode escolher entre si.
 *
 * Os macros ficam no item, não na opção: o profissional escolhe as quantidades
 * justamente para que as opções sejam equivalentes ("100 g de arroz OU 200 g de
 * batata"). Escolher qual foi consumida registra o que o aluno comeu para o
 * profissional ler — não altera a soma do dia.
 */
const itemDeRefeicao = z.object({
  id: texto,
  opcoes: z.array(opcaoDeItem).min(1),
  macros,
})

const refeicao = z.object({
  numero: contagem,
  nome: texto.optional(),
  itens: z.array(itemDeRefeicao).min(1),
})

const nutricao = z.object({
  macrosAlvoDiario: macros,
  hidratacaoDiariaLitros: medida,
  refeicoes: z.array(refeicao).min(1),
  vegetaisSugeridos: z.array(texto),
})

// --- Suplementação ---------------------------------------------------------

/**
 * Quando tomar é âncora temporal, não rótulo. É o que permite dissolver a lista
 * de suplementos dentro da linha do tempo do dia, em vez de virar uma aba que o
 * aluno nunca abre na hora em que deveria tomar.
 */
const ancora = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('apos-refeicao'), refeicao: contagem }),
  z.object({ tipo: z.literal('antes-do-treino') }),
  z.object({ tipo: z.literal('livre') }),
])

const suplemento = z.object({
  id: texto,
  nome: texto,
  dose: z.object({ quantidade: medida, unidade: z.enum(UNIDADES_DE_DOSE) }),
  posologia: z.object({
    ancora,
    vezesPorDia: contagem,
    duracaoDias: contagem.optional(),
    observacao: texto.optional(),
  }),
})

const formula = z.object({ nome: texto, itens: z.array(suplemento).min(1) })

const suplementacao = z.object({ formulas: z.array(formula) })

// --- Arquivo ---------------------------------------------------------------

const arquivoDePlano = z
  .object({
    formato: z.literal(FORMATO),
    schemaVersion: z.literal(SCHEMA_VERSION_ATUAL),
    emitidoEm: z.iso.date(),
    profissional: z.object({ nome: texto, registro: texto.optional() }),
    aluno: z.object({ nome: texto, idade: contagem, alturaMetros: medida }),
    plano: z.object({ treino, nutricao, suplementacao }),
  })
  .superRefine(conferirIntegridadeReferencial)

export type ArquivoDePlano = z.infer<typeof arquivoDePlano>
export type Exercicio = z.infer<typeof exercicio>
export type ItemDeTreino = z.infer<typeof itemDeTreino>
export type Execucao = z.infer<typeof execucao>
export type SessaoTreino = z.infer<typeof sessaoTreino>
export type Refeicao = z.infer<typeof refeicao>
export type ItemDeRefeicao = z.infer<typeof itemDeRefeicao>
export type OpcaoDeItem = z.infer<typeof opcaoDeItem>
export type Suplemento = z.infer<typeof suplemento>
export type AgendaDoDia = z.infer<typeof agendaDoDia>
export type Macros = z.infer<typeof macros>

/**
 * As regras que só existem **entre** campos, e que a validação de tipo nunca
 * pegaria. Um plano que aponta para um treino inexistente passa em toda checagem
 * de formato e mesmo assim quebra na tela do aluno numa terça-feira.
 */
function conferirIntegridadeReferencial(
  arquivo: z.infer<typeof arquivoDePlano>,
  ctx: z.RefinementCtx
): void {
  const { treino: t, nutricao: n, suplementacao: s } = arquivo.plano

  const exercicios = new Set<string>()
  t.exercicios.forEach((e, i) => {
    if (exercicios.has(e.id)) {
      ctx.addIssue({
        code: 'custom',
        path: ['plano', 'treino', 'exercicios', i, 'id'],
        message: 'está repetido: dois exercícios não podem ter o mesmo identificador',
      })
    }
    exercicios.add(e.id)
  })

  const sessoes = new Set<string>()
  t.sessoes.forEach((sessao, i) => {
    if (sessoes.has(sessao.id)) {
      ctx.addIssue({
        code: 'custom',
        path: ['plano', 'treino', 'sessoes', i, 'id'],
        message: 'está repetido: dois treinos não podem ter o mesmo identificador',
      })
    }
    sessoes.add(sessao.id)

    sessao.itens.forEach((item, j) => {
      if (!exercicios.has(item.exercicioId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['plano', 'treino', 'sessoes', i, 'itens', j, 'exercicioId'],
          message: 'aponta para um exercício que não está na lista de exercícios do plano',
        })
      }
    })
  })

  for (const dia of DIAS_DA_SEMANA) {
    const id = arquivo.plano.treino.agendaSemanal[dia].sessaoId
    if (id !== null && !sessoes.has(id)) {
      ctx.addIssue({
        code: 'custom',
        path: ['plano', 'treino', 'agendaSemanal', dia, 'sessaoId'],
        message: 'marca um treino que não existe no plano',
      })
    }
  }

  const refeicoes = new Set(n.refeicoes.map((r) => r.numero))
  s.formulas.forEach((f, fi) => {
    f.itens.forEach((item, ii) => {
      const { ancora: a } = item.posologia
      if (a.tipo === 'apos-refeicao' && !refeicoes.has(a.refeicao)) {
        ctx.addIssue({
          code: 'custom',
          path: ['plano', 'suplementacao', 'formulas', fi, 'itens', ii, 'posologia', 'ancora'],
          message: `manda tomar após a refeição ${a.refeicao}, que o plano alimentar não tem`,
        })
      }
    })
  })
}

/**
 * Lê o arquivo que o profissional enviou. Falha com todos os problemas de uma
 * vez, cada um localizado em linguagem de negócio — nunca em silêncio.
 */
export function lerArquivoDePlano(entrada: unknown): ArquivoDePlano {
  const resultado = arquivoDePlano.safeParse(entrada)
  if (resultado.success) return resultado.data

  throw new ArquivoInvalidoError(
    resultado.error.issues.map((issue) => descreverProblema(issue, entrada))
  )
}
