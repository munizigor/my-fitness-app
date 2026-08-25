import { z } from 'zod'
import { ehDataLocal } from '../dia/dataLocal'
import { DataInvalidaError } from '../errors/DataInvalidaError'
import { MedidaInvalidaError } from '../errors/MedidaInvalidaError'

/**
 * Uma aferição do corpo do aluno, datada.
 *
 * O ponto central da story: **medida não é campo de perfil, é série temporal.**
 * A planilha sobrescrevia o peso e a evolução do corpo desaparecia junto. Aqui
 * cada aferição é um arquivo próprio em `vault/aluno/medidas/<data>.json` — o
 * caminho é o índice, e o ponto de agosto continua lá em dezembro (ADR 0002).
 *
 * Medida pertence ao **aluno**, não ao plano: trocar de profissional não apaga
 * o corpo de quem treina (`ImportarPlano` tem teste explícito disso).
 */

/**
 * Versão própria, como a do registro (ver `registro/migracoes.ts`).
 *
 * Começa em 1, e não continuando a numeração do registro, porque nenhuma
 * medida jamais foi gravada em disco: dentro de `vault/aluno/medidas/` o número
 * 1 não tem outro significado possível. O caminho é que separa os documentos —
 * o que a numeração do registro evitava era ambiguidade **no mesmo arquivo**.
 */
export const SCHEMA_VERSION_MEDIDA = 1

const numeroPositivo = z.number().positive().finite()

/**
 * Vocabulário controlado, pelo mesmo motivo dos grupos musculares: Evolução
 * **agrega** por ele. Texto livre viraria "braço", "Braço" e "braco" como três
 * séries diferentes, e o delta corporal perderia o sentido.
 *
 * Sem lado (direito/esquerdo) de propósito: quem mede em casa com fita mede um
 * braço, não dois. Separar os lados aqui criaria campo que ninguém preenche.
 */
const circunferenciasCm = z.object({
  torax: numeroPositivo.optional(),
  cintura: numeroPositivo.optional(),
  abdomen: numeroPositivo.optional(),
  quadril: numeroPositivo.optional(),
  braco: numeroPositivo.optional(),
  coxa: numeroPositivo.optional(),
  panturrilha: numeroPositivo.optional(),
})

export type Circunferencia = keyof z.infer<typeof circunferenciasCm>

/** A ordem aqui é a ordem em que a tela pede as medidas — de cima para baixo. */
export const CIRCUNFERENCIAS = Object.keys(circunferenciasCm.shape) as readonly Circunferencia[]

const medida = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION_MEDIDA),
  data: z.string().refine(ehDataLocal),
  pesoKg: numeroPositivo.optional(),
  percentualGordura: numeroPositivo.max(100).optional(),
  circunferenciasCm: circunferenciasCm.optional(),
})

export type Medida = z.infer<typeof medida>

/** O que o aluno digitou na tela, antes de virar aferição. */
export type ValoresAferidos = {
  pesoKg?: number
  percentualGordura?: number
  circunferenciasCm?: Partial<Record<Circunferencia, number>>
}

/**
 * Lê uma aferição do vault. Devolve `null` para o que não reconhece — **nunca
 * lança**, pela mesma razão do registro diário: dado do aluno ilegível é
 * problema nosso, e não pode derrubar a tela dele.
 *
 * Circunferência de rótulo desconhecido é descartada em silêncio (o `object` do
 * Zod já faz isso): aceitar qualquer chave transformaria o vocabulário
 * controlado em texto livre pela porta dos fundos.
 */
export function lerMedida(entrada: unknown): Medida | null {
  const resultado = medida.safeParse(entrada)
  return resultado.success ? resultado.data : null
}

/**
 * Monta a aferição que vai para o disco, a partir do que o aluno mediu.
 *
 * Campo em branco **não vira zero**: some do arquivo. Não medir a cintura é
 * diferente de medir zero centímetros, e o segundo viraria um ponto falso
 * despencando na série de Evolução.
 */
export function criarMedida(data: string, valores: ValoresAferidos): Medida {
  // O caminho do arquivo é a data; uma data inválida corromperia o índice do
  // vault em silêncio.
  if (!ehDataLocal(data)) throw new DataInvalidaError(data)

  const circunferencias = somenteMedidos(valores.circunferenciasCm)

  const candidata = {
    schemaVersion: SCHEMA_VERSION_MEDIDA,
    data,
    ...(valores.pesoKg === undefined ? {} : { pesoKg: valores.pesoKg }),
    ...(valores.percentualGordura === undefined
      ? {}
      : { percentualGordura: valores.percentualGordura }),
    ...(circunferencias === undefined ? {} : { circunferenciasCm: circunferencias }),
  }

  const resultado = medida.safeParse(candidata)
  if (!resultado.success) {
    throw new MedidaInvalidaError(resultado.error.issues[0]?.message ?? 'aferição inválida')
  }
  if (vazia(resultado.data)) {
    throw new MedidaInvalidaError('Uma aferição sem nenhum valor não é um ponto na série')
  }
  return resultado.data
}

/** Aferição sem nenhum número medido não é ponto: é linha em branco datada. */
function vazia(medida: Medida): boolean {
  return (
    medida.pesoKg === undefined &&
    medida.percentualGordura === undefined &&
    medida.circunferenciasCm === undefined
  )
}

function somenteMedidos(
  circunferencias: Partial<Record<Circunferencia, number>> | undefined
): Partial<Record<Circunferencia, number>> | undefined {
  if (!circunferencias) return undefined

  const medidos = Object.entries(circunferencias).filter(([, valor]) => valor !== undefined)
  return medidos.length === 0
    ? undefined
    : (Object.fromEntries(medidos) as Partial<Record<Circunferencia, number>>)
}
