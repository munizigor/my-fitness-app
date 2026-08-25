import { z } from 'zod'
import { ehDataLocal } from '../dia/dataLocal'
import { DataInvalidaError } from '../errors/DataInvalidaError'
import { SCHEMA_VERSION_REGISTRO, migrarRegistro } from './migracoes'

/**
 * O que o aluno fez num dia.
 *
 * Separado do plano de propósito: o plano é do profissional e não muda; o
 * registro é do aluno e cresce a cada série. Um arquivo por dia significa que
 * o caminho já é o índice — listar um período é listar um prefixo (ADR 0002).
 *
 * Também tem **versão própria** (ver `migracoes.ts`): plano e registro mudam
 * por motivos diferentes e não devem se arrastar um ao outro.
 */

const texto = z.string().trim().min(1)

const serieRegistrada = z.object({
  /** Aponta para o item **prescrito**, não para o exercício. */
  itemDeTreinoId: texto,
  indice: z.number().int().positive(),
  cargaKg: z.number().nonnegative().optional(),
  repeticoes: z.number().int().nonnegative().optional(),
  segundos: z.number().int().nonnegative().optional(),
  concluidaEm: z.string().min(1),
})

/**
 * Um item da refeição, com a alternativa que o aluno de fato comeu.
 *
 * A escolha é guardada pelo **nome do alimento**, não pelo índice da opção: o
 * profissional pode reordenar as alternativas no plano seguinte, e o que o
 * aluno comeu ontem não pode mudar de significado por causa disso. De quebra,
 * quem abrir o arquivo num editor lê "Arroz" e não "1".
 */
const itemConsumido = z.object({
  itemDeRefeicaoId: texto,
  alimento: texto,
})

const refeicaoRegistrada = z.object({
  /**
   * Aponta para a refeição do plano pelo identificador dela, não pela posição.
   * Inserir uma refeição no plano não pode deslocar o que já foi registrado.
   */
  refeicaoId: texto,
  /**
   * O número de ordem que a versão anterior usava, quando veio de lá.
   *
   * Não é usado para gravar nada novo: existe para reconectar um registro
   * antigo a um plano reemitido, na leitura. Guardar é reversível; apagar não.
   */
  refeicaoNumeroLegado: z.number().int().positive().optional(),
  itens: z.array(itemConsumido),
  registradaEm: z.string().min(1),
})

const registroDiario = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION_REGISTRO),
  data: z.string().refine(ehDataLocal),
  /** Contador do dia inteiro, não evento com hora — beber água não é um momento. */
  aguaLitros: z.number().nonnegative(),
  series: z.array(serieRegistrada),
  refeicoes: z.array(refeicaoRegistrada),
})

export type SerieRegistrada = z.infer<typeof serieRegistrada>
export type ItemConsumido = z.infer<typeof itemConsumido>
export type RefeicaoRegistrada = z.infer<typeof refeicaoRegistrada>
export type RegistroDiario = z.infer<typeof registroDiario>

/**
 * Lê um registro do vault, migrando versões anteriores. Devolve `null` para
 * qualquer coisa que não reconheça — **nunca lança**.
 *
 * A diferença de tratamento em relação ao plano é deliberada: um plano
 * inválido é erro do profissional e precisa ser reportado para ele corrigir.
 * Um registro ilegível é problema nosso, e o aluno está no meio da série
 * segurando a barra. Recomeçar o dia é melhor que ver o app quebrar ali.
 */
export function lerRegistroDiario(entrada: unknown): RegistroDiario | null {
  const resultado = registroDiario.safeParse(migrarRegistro(entrada))
  return resultado.success ? resultado.data : null
}

export function registroVazio(data: string): RegistroDiario {
  // O caminho do arquivo é a data; uma data inválida corromperia o índice do
  // vault em silêncio.
  if (!ehDataLocal(data)) throw new DataInvalidaError(data)
  return {
    schemaVersion: SCHEMA_VERSION_REGISTRO,
    data,
    aguaLitros: 0,
    series: [],
    refeicoes: [],
  }
}
