import { ErroDeDominio } from './ErroDeDominio'

export interface ProblemaNoArquivo {
  /** Caminho do campo, como `plano.treino.sessoes.0.exercicios.2.prescricao`. */
  readonly campo: string
  readonly mensagem: string
}

/**
 * O arquivo enviado pelo profissional não pôde ser lido.
 *
 * Carrega **todos** os problemas de uma vez, e cada um com o caminho do campo:
 * quem vai corrigir o arquivo é o profissional, e devolvê-lo um erro por vez
 * significaria fazer a viagem de ida e volta cinco vezes.
 */
export class ArquivoInvalidoError extends ErroDeDominio {
  readonly codigo = 'ARQUIVO_INVALIDO'

  constructor(readonly problemas: readonly ProblemaNoArquivo[]) {
    super(
      `Arquivo de plano inválido (${problemas.length} problema(s)): ` +
        problemas.map((p) => `${p.campo || '(raiz)'} — ${p.mensagem}`).join('; ')
    )
  }
}
