/**
 * Levar um arquivo para fora do app, visto pelo domínio.
 *
 * A contraparte de `VaultStorage`: aquele guarda dentro, este entrega para
 * fora. Deliberadamente burra pelo mesmo motivo — recebe nome e texto, e não
 * sabe o que é um vault. Como o navegador entrega (pasta escolhida pelo aluno
 * ou download) é detalhe de infraestrutura, e muda entre Chrome e iOS sem que
 * nenhum caso de uso precise saber.
 */
export interface ArquivoParaSalvar {
  /** Nome sugerido, com extensão. O aluno pode trocá-lo no diálogo do sistema. */
  readonly nome: string
  readonly conteudo: string
}

/**
 * `'cancelado'` é resultado normal, não erro: fechar o diálogo do sistema é
 * uma decisão do aluno, e a tela não deve gritar por causa dela.
 */
export type ResultadoDeSalvar = 'salvo' | 'cancelado'

export interface FileTransfer {
  salvar(arquivo: ArquivoParaSalvar): Promise<ResultadoDeSalvar>
}
