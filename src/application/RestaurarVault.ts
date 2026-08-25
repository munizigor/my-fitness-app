import { ArquivoInvalidoError } from '../domain/errors/ArquivoInvalidoError'
import type { VaultStorage } from '../domain/ports/VaultStorage'
import { lerArquivoDeVault } from '../domain/schema/arquivoDeVault'

/**
 * O aluno traz o vault de volta.
 *
 * O outro lado de `ExportarVault`, e o que dá sentido a ele: um backup que não
 * volta não é backup. Numa instalação limpa, restaurar reproduz o estado
 * inteiro — plano, registros, perfil e histórico de medidas.
 *
 * Duas garantias, as mesmas de `ImportarPlano`:
 *
 * 1. **Validar antes de escrever.** O envelope inteiro passa pelo schema antes
 *    do primeiro byte ir ao disco; um arquivo pela metade não deixa o aluno
 *    pela metade.
 * 2. **Restaurar não é apagar.** Só os caminhos que vieram no envelope são
 *    escritos; o que já estava no vault e não veio no backup continua onde
 *    está. Um backup de junho não pode levar embora a aferição de agosto —
 *    perder dado do aluno é o oposto do que esta story existe para provar.
 */
export class RestaurarVault {
  constructor(private readonly vault: VaultStorage) {}

  /** Quantos documentos entraram. */
  async executar(conteudo: string): Promise<number> {
    const arquivo = lerArquivoDeVault(this.desserializar(conteudo))
    const documentos = Object.entries(arquivo.documentos)

    await Promise.all(
      documentos.map(([caminho, documento]) =>
        // Indentado: o que fica no disco é o que o aluno lê no editor (ADR 0003).
        this.vault.escrever(caminho, JSON.stringify(documento, null, 2))
      )
    )

    return documentos.length
  }

  private desserializar(conteudo: string): unknown {
    try {
      return JSON.parse(conteudo)
    } catch {
      // Mesmo tratamento do import do plano: SyntaxError cru não diz nada a
      // quem escolheu o arquivo errado na pasta de downloads.
      throw new ArquivoInvalidoError([
        {
          onde: 'Arquivo',
          oQue: 'Conteúdo',
          mensagem: 'não parece ser um arquivo do app — o conteúdo está corrompido',
          caminhoTecnico: '',
        },
      ])
    }
  }
}
