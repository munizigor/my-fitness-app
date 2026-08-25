import { ErroDeDominio } from './ErroDeDominio'

export interface ProblemaNoArquivo {
  /** Onde no plano, em termos de negócio: "Treino A · Prancha Lateral (Lado direito)". */
  readonly onde: string
  /** Qual campo, no vocabulário de quem monta o plano: "Séries", "Carga alvo". */
  readonly oQue: string
  /** O que está errado, em frase de gente: "não foi preenchido". */
  readonly mensagem: string
  /** Caminho no JSON. Para quem depura o app, não para quem usa. */
  readonly caminhoTecnico: string
}

/**
 * O arquivo enviado pelo profissional não pôde ser lido.
 *
 * Carrega **todos** os problemas de uma vez: quem corrige o arquivo é o
 * profissional, e devolvê-lo um erro por vez faria a viagem de ida e volta
 * cinco vezes.
 */
export class ArquivoInvalidoError extends ErroDeDominio {
  readonly codigo = 'ARQUIVO_INVALIDO'

  constructor(readonly problemas: readonly ProblemaNoArquivo[]) {
    super(
      `Arquivo de plano inválido (${problemas.length} problema(s)): ` +
        problemas.map((p) => `${p.onde} — ${p.oQue}: ${p.mensagem}`).join('; ')
    )
  }
}
