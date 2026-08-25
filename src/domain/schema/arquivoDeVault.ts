import { z } from 'zod'
import { ArquivoInvalidoError } from '../errors/ArquivoInvalidoError'
import { ehCaminhoDoVault } from '../vault/caminhos'
import { descreverProblema } from './descreverProblema'

/**
 * O formato de intercâmbio do vault — o arquivo que o aluno leva embora.
 *
 * É o outro lado do import: lá entra o que o profissional prescreveu, aqui sai
 * tudo, prescrição e execução, num arquivo só. O envelope é deliberadamente
 * raso — `documentos` é um mapa de caminho para o conteúdo daquele caminho,
 * exatamente como o vault está no disco (ADR 0002). Nada é reagrupado,
 * resumido ou calculado no caminho de saída: o profissional recebe fatos, e
 * quem abrir o arquivo num editor vê a mesma pasta que o app vê.
 *
 * Os documentos viajam como JSON embutido, não como texto escapado. É o
 * critério de aceitação do posicionamento (ADR 0003): abrir num editor de
 * texto qualquer e entender o que está lá. `"{\n \"nome\": ...}"` falharia
 * nesse teste na primeira linha.
 */

export const FORMATO_EXPORT = 'fitvault-export'

/**
 * Versão do **envelope**, independente da do plano, da do registro e da da
 * medida (ver `docs/modelo-dados.md`). O que muda aqui é a forma de embrulhar,
 * não o conteúdo embrulhado — e cada documento carrega a própria versão dentro.
 */
export const SCHEMA_VERSION_EXPORT = 1

const arquivoDeVault = z.object({
  formato: z.literal(FORMATO_EXPORT),
  schemaVersion: z.literal(SCHEMA_VERSION_EXPORT),
  /** Instante da exportação, ISO 8601. Serve a quem recebe: qual é o mais novo. */
  exportadoEm: z.string().min(1),
  documentos: z
    .record(
      z.string().refine(ehCaminhoDoVault, 'não é um documento do vault e não será restaurado'),
      z.unknown()
    )
    .refine((d) => Object.keys(d).length > 0, 'não tem nenhum documento dentro'),
})

export type ArquivoDeVault = z.infer<typeof arquivoDeVault>

/**
 * Lê um export do vault, ou recusa com todos os problemas de uma vez.
 *
 * O envelope é validado inteiro **antes** de qualquer escrita (quem restaura
 * depende disso): um arquivo pela metade não pode deixar o vault pela metade.
 *
 * O que este schema **não** faz é validar o conteúdo de cada documento. O
 * plano é conferido por `lerArquivoDePlano` na hora de usar, e registro,
 * medida e perfil já sabem devolver `null` para o que não reconhecem. Recusar
 * o backup inteiro porque um dia de registro ficou estranho seria perder anos
 * de histórico para salvar uma tarde.
 */
export function lerArquivoDeVault(entrada: unknown): ArquivoDeVault {
  const resultado = arquivoDeVault.safeParse(entrada)
  if (resultado.success) return resultado.data

  throw new ArquivoInvalidoError(
    resultado.error.issues.map((issue) => descreverProblema(issue, entrada))
  )
}

/**
 * Este arquivo é um export nosso?
 *
 * Existe para o aluno ter **um** lugar de importar: ele escolhe o arquivo que
 * tem na mão e o app descobre se é a prescrição do profissional ou o backup do
 * próprio vault. Reconhecer não é validar — um export corrompido precisa
 * falhar como export, com os problemas certos, em vez de ser lido como plano e
 * acusar o profissional de um erro que não é dele.
 */
export function ehArquivoDeVault(entrada: unknown): boolean {
  return (
    typeof entrada === 'object' &&
    entrada !== null &&
    (entrada as { formato?: unknown }).formato === FORMATO_EXPORT
  )
}
