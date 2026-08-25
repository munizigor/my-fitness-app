import { ErroDeDominio } from './ErroDeDominio'

/**
 * O aluno tentou registrar algo que não descreve um dia possível.
 *
 * Ao contrário do plano — cujos erros são do profissional e precisam de uma
 * mensagem que ele consiga levar de volta ao arquivo —, isto aqui nunca deveria
 * chegar à tela: a UI já limita o que dá para tocar. É a rede de proteção para
 * quando um caso de uso for chamado de um lugar novo.
 */
export class RegistroInvalidoError extends ErroDeDominio {
  readonly codigo = 'REGISTRO_INVALIDO'

  constructor(mensagem: string) {
    super(mensagem)
  }
}
