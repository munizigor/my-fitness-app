/**
 * Armazenamento do vault do aluno, visto pelo domínio.
 *
 * Deliberadamente burra: guarda texto em caminhos. A serialização fica com o
 * domínio, e não com quem implementa a porta — é o que garante que o conteúdo
 * no disco seja **exatamente** o que o aluno recebe ao exportar. Um motor que
 * traduzisse para colunas ou índices próprios quebraria "arquivo acima do app".
 *
 * Implementações: `OpfsVaultStorage` em produção, `InMemoryVaultStorage` nos
 * testes de `application`. Trocar o motor (ADR 0002 prevê SQLite algum dia) é
 * implementar outra classe, não reescrever o app.
 */
export interface VaultStorage {
  /** Devolve o conteúdo, ou `null` se o caminho não existe. */
  ler(caminho: string): Promise<string | null>

  escrever(caminho: string, conteudo: string): Promise<void>

  /** Caminhos existentes sob o prefixo, em ordem crescente. */
  listar(prefixo: string): Promise<string[]>

  /** Remover caminho inexistente é operação válida e sem efeito. */
  remover(caminho: string): Promise<void>
}
