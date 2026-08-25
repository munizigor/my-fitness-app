import { z } from 'zod'
import { ehDataLocal } from '../dia/dataLocal'
import { DataInvalidaError } from '../errors/DataInvalidaError'
import { SCHEMA_VERSION_ATUAL } from '../schema/arquivoDePlano'

/**
 * O que o aluno fez num dia.
 *
 * Separado do plano de propósito: o plano é do profissional e não muda; o
 * registro é do aluno e cresce a cada série. Um arquivo por dia significa que
 * o caminho já é o índice — listar um período é listar um prefixo (ADR 0002).
 */

const serieRegistrada = z.object({
  /** Aponta para o item **prescrito**, não para o exercício. */
  itemDeTreinoId: z.string().trim().min(1),
  indice: z.number().int().positive(),
  cargaKg: z.number().nonnegative().optional(),
  repeticoes: z.number().int().nonnegative().optional(),
  segundos: z.number().int().nonnegative().optional(),
  concluidaEm: z.string().min(1),
})

const registroDiario = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION_ATUAL),
  data: z.string().refine(ehDataLocal),
  series: z.array(serieRegistrada),
})

export type SerieRegistrada = z.infer<typeof serieRegistrada>
export type RegistroDiario = z.infer<typeof registroDiario>

/**
 * Lê um registro do vault. Devolve `null` para qualquer coisa que não
 * reconheça — **nunca lança**.
 *
 * A diferença de tratamento em relação ao plano é deliberada: um plano
 * inválido é erro do profissional e precisa ser reportado para ele corrigir.
 * Um registro ilegível é problema nosso, e o aluno está no meio da série
 * segurando a barra. Recomeçar o dia é melhor que ver o app quebrar ali.
 */
export function lerRegistroDiario(entrada: unknown): RegistroDiario | null {
  const resultado = registroDiario.safeParse(entrada)
  return resultado.success ? resultado.data : null
}

export function registroVazio(data: string): RegistroDiario {
  // O caminho do arquivo é a data; uma data inválida corromperia o índice do
  // vault em silêncio.
  if (!ehDataLocal(data)) throw new DataInvalidaError(data)
  return { schemaVersion: SCHEMA_VERSION_ATUAL, data, series: [] }
}
