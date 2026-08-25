import { z } from 'zod'
import { ArquivoInvalidoError, type ProblemaNoArquivo } from '../errors/ArquivoInvalidoError'
import { PrescricaoInvalidaError } from '../errors/PrescricaoInvalidaError'
import { analisarPrescricao, type Prescricao } from '../treino/prescricao'

// Quem lê estas mensagens é o profissional que montou o plano, para saber o que
// corrigir. Sem isto, metade do diagnóstico chega em inglês ("Invalid input")
// dentro de um app em português — e a tela de erro deixa de cumprir sua função.
z.config(z.locales.pt())

export const FORMATO = 'fitvault-plano'
export const SCHEMA_VERSION_ATUAL = 1

export const DIAS_DA_SEMANA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'] as const
export type DiaDaSemana = (typeof DIAS_DA_SEMANA)[number]

const textoNaoVazio = z.string().trim().min(1)
const inteiroPositivo = z.number().int().positive()
const gramas = z.number().nonnegative()

/**
 * A coluna SxR chega como o profissional escreveu e é interpretada **aqui**,
 * na leitura do arquivo. Falhar no import é melhor que falhar na academia:
 * o erro sai com o caminho do campo, e o profissional corrige antes de mandar.
 */
const prescricao = textoNaoVazio.transform((texto, ctx): Prescricao => {
  try {
    return analisarPrescricao(texto)
  } catch (erro) {
    ctx.addIssue({
      code: 'custom',
      message: erro instanceof PrescricaoInvalidaError ? erro.motivo : 'não pôde ser interpretada',
    })
    return z.NEVER
  }
})

const exercicio = z.object({
  id: textoNaoVazio,
  nome: textoNaoVazio,
  prescricao,
  tecnicaAvancada: textoNaoVazio.optional(),
})

const sessaoTreino = z.object({
  id: textoNaoVazio,
  rotulo: textoNaoVazio,
  foco: z.enum(['superior', 'inferior', 'corpo-inteiro']),
  exercicios: z.array(exercicio).min(1),
})

const aerobico = z.object({ tipo: textoNaoVazio, minutos: inteiroPositivo })

// Descanso é ausência, não uma sessão especial: `null` diz isso sem inventar
// uma entidade "Descanso" que a UI teria que filtrar em todo lugar.
const agendaDoDia = z.object({
  musculacao: textoNaoVazio.nullable(),
  aerobico: aerobico.nullable(),
})

const agendaSemanal = z.object(
  Object.fromEntries(DIAS_DA_SEMANA.map((dia) => [dia, agendaDoDia])) as Record<
    DiaDaSemana,
    typeof agendaDoDia
  >
)

const intervalo = z
  .object({ min: inteiroPositivo, max: inteiroPositivo })
  .refine((i) => i.max >= i.min, { message: 'o intervalo está invertido (min maior que max)' })

const treino = z.object({
  intervaloEntreSeriesSegundos: intervalo,
  sessoes: z.array(sessaoTreino).min(1),
  agendaSemanal,
})

const macros = z.object({ proteinaG: gramas, carboidratoG: gramas, gorduraG: gramas })

/**
 * Os macros ficam no item, não na alternativa: na prescrição real as
 * alternativas de um mesmo item são equivalentes em macro por construção
 * ("100 g de arroz OU 200 g de batata"). Escolher qual foi consumida registra
 * o que o aluno comeu para o profissional ler — não altera a soma do dia.
 */
const itemDeRefeicao = z.object({
  id: textoNaoVazio,
  alternativas: z.array(textoNaoVazio).min(1),
  macros,
})

const refeicao = z.object({
  numero: inteiroPositivo,
  itens: z.array(itemDeRefeicao).min(1),
})

const nutricao = z.object({
  macrosAlvoDiario: macros,
  hidratacaoLitros: z.number().positive(),
  refeicoes: z.array(refeicao).min(1),
  vegetaisSugeridos: z.array(textoNaoVazio),
})

/**
 * Posologia é âncora temporal, não rótulo. É o que permite dissolver a lista de
 * suplementos dentro da linha do tempo do dia, em vez de virar uma aba que o
 * aluno nunca abre no momento em que deveria tomar.
 */
const ancora = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('apos-refeicao'), refeicao: inteiroPositivo }),
  z.object({ tipo: z.literal('antes-do-treino') }),
  z.object({ tipo: z.literal('livre') }),
])

const suplemento = z.object({
  id: textoNaoVazio,
  nome: textoNaoVazio,
  dose: textoNaoVazio,
  posologia: z.object({
    ancora,
    dosesPorDia: inteiroPositivo,
    duracaoDias: inteiroPositivo.optional(),
    observacao: textoNaoVazio.optional(),
  }),
})

const formula = z.object({ nome: textoNaoVazio, itens: z.array(suplemento).min(1) })

const suplementacao = z.object({ formulas: z.array(formula) })

const arquivoDePlano = z
  .object({
    formato: z.literal(FORMATO),
    schemaVersion: z.literal(SCHEMA_VERSION_ATUAL),
    emitidoEm: z.iso.date(),
    profissional: z.object({ nome: textoNaoVazio, registro: textoNaoVazio.optional() }),
    aluno: z.object({
      nome: textoNaoVazio,
      idade: inteiroPositivo,
      alturaMetros: z.number().positive(),
    }),
    plano: z.object({ treino, nutricao, suplementacao }),
  })
  .superRefine(conferirIntegridadeReferencial)

export type ArquivoDePlano = z.infer<typeof arquivoDePlano>
export type SessaoTreino = z.infer<typeof sessaoTreino>
export type ExercicioPrescrito = z.infer<typeof exercicio>
export type Refeicao = z.infer<typeof refeicao>
export type ItemDeRefeicao = z.infer<typeof itemDeRefeicao>
export type Suplemento = z.infer<typeof suplemento>
export type AgendaDoDia = z.infer<typeof agendaDoDia>
export type Macros = z.infer<typeof macros>

/**
 * Zod valida cada campo isoladamente; estas são as regras que só existem entre
 * campos. Um plano que aponta para um treino inexistente passa em toda validação
 * de tipo e ainda assim quebra na tela do aluno numa terça-feira.
 */
function conferirIntegridadeReferencial(
  arquivo: {
    plano: {
      treino: {
        sessoes: { id: string }[]
        agendaSemanal: Record<string, { musculacao: string | null }>
      }
      nutricao: { refeicoes: { numero: number }[] }
      suplementacao: {
        formulas: { itens: { posologia: { ancora: { tipo: string; refeicao?: number } } }[] }[]
      }
    }
  },
  ctx: z.RefinementCtx
): void {
  const { treino, nutricao, suplementacao } = arquivo.plano

  const vistos = new Set<string>()
  treino.sessoes.forEach((sessao, i) => {
    if (vistos.has(sessao.id)) {
      ctx.addIssue({
        code: 'custom',
        path: ['plano', 'treino', 'sessoes', i, 'id'],
        message: `identificador de sessão repetido: ${sessao.id}`,
      })
    }
    vistos.add(sessao.id)
  })

  for (const dia of DIAS_DA_SEMANA) {
    const id = treino.agendaSemanal[dia]?.musculacao
    if (id !== null && id !== undefined && !vistos.has(id)) {
      ctx.addIssue({
        code: 'custom',
        path: ['plano', 'treino', 'agendaSemanal', dia, 'musculacao'],
        message: `aponta para a sessão "${id}", que o plano não tem`,
      })
    }
  }

  const refeicoes = new Set(nutricao.refeicoes.map((r) => r.numero))
  suplementacao.formulas.forEach((f, fi) => {
    f.itens.forEach((item, ii) => {
      const { ancora: a } = item.posologia
      if (a.tipo === 'apos-refeicao' && a.refeicao !== undefined && !refeicoes.has(a.refeicao)) {
        ctx.addIssue({
          code: 'custom',
          path: [
            'plano',
            'suplementacao',
            'formulas',
            fi,
            'itens',
            ii,
            'posologia',
            'ancora',
            'refeicao',
          ],
          message: `ancorado na refeição ${a.refeicao}, que o plano não tem`,
        })
      }
    })
  })
}

/**
 * Lê o arquivo que o profissional enviou. Falha com todos os problemas de uma
 * vez, cada um com o caminho do campo — nunca em silêncio, nunca adivinhando.
 */
export function lerArquivoDePlano(entrada: unknown): ArquivoDePlano {
  const resultado = arquivoDePlano.safeParse(entrada)
  if (resultado.success) return resultado.data

  const problemas: ProblemaNoArquivo[] = resultado.error.issues.map((issue) => ({
    campo: issue.path.join('.'),
    mensagem: issue.message,
  }))
  throw new ArquivoInvalidoError(problemas)
}
