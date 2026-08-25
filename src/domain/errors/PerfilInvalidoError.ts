import { ErroDeDominio } from './ErroDeDominio'

/**
 * O perfil que o aluno tentou gravar não descreve uma pessoa.
 *
 * O perfil é o único dado do plano que o aluno pode corrigir — o arquivo do
 * profissional pode ter sido emitido meses antes, e idade muda. Corrigir não é
 * poder gravar qualquer coisa: altura em centímetros viraria IMC absurdo em
 * Evolução, e um nome vazio deixaria a tela sem dono.
 */
export class PerfilInvalidoError extends ErroDeDominio {
  readonly codigo = 'PERFIL_INVALIDO'

  constructor(mensagem: string) {
    super(mensagem)
  }
}
