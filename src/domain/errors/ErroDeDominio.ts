/**
 * Base de todo erro de negócio. Existe para que as camadas de fora possam
 * distinguir "o dado do profissional está errado" de "o app quebrou" —
 * o primeiro vira mensagem para o usuário, o segundo vira bug.
 */
export abstract class ErroDeDominio extends Error {
  abstract readonly codigo: string

  constructor(mensagem: string) {
    super(mensagem)
    this.name = new.target.name
  }
}
