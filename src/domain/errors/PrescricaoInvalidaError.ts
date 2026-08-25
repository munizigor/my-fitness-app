import { ErroDeDominio } from './ErroDeDominio'

/**
 * A coluna SxR da prescrição não tem uma forma reconhecível.
 *
 * Carrega o texto ofensivo porque quem trata o erro é o import, e o import
 * precisa dizer ao aluno qual campo do arquivo do profissional está errado.
 */
export class PrescricaoInvalidaError extends ErroDeDominio {
  readonly codigo = 'PRESCRICAO_INVALIDA'

  constructor(
    readonly textoOriginal: string,
    readonly motivo: string
  ) {
    super(`Prescrição inválida ${JSON.stringify(textoOriginal)}: ${motivo}`)
  }
}
