import { ErroDeDominio } from './ErroDeDominio'

/**
 * O aluno tentou gravar uma aferição que não descreve um corpo possível.
 *
 * Aferição é ponto numa série temporal que o profissional vai ler meses depois.
 * Um ponto vazio, ou com número impossível, contamina a evidência de evolução —
 * que é justamente o que este app existe para mostrar. Por isso para aqui, e
 * não na tela.
 */
export class MedidaInvalidaError extends ErroDeDominio {
  readonly codigo = 'MEDIDA_INVALIDA'

  constructor(mensagem: string) {
    super(mensagem)
  }
}
