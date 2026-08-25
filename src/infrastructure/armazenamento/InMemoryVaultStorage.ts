import type { VaultStorage } from '../../domain/ports/VaultStorage'

/**
 * Vault em memória, para os testes de `application` rodarem sem browser.
 *
 * OPFS não existe em jsdom; sem esta implementação, todo caso de uso só poderia
 * ser testado em Chromium de verdade, e o laço de TDD passaria de milissegundos
 * a dezenas de segundos.
 */
export class InMemoryVaultStorage implements VaultStorage {
  private readonly arquivos = new Map<string, string>()

  ler(caminho: string): Promise<string | null> {
    return Promise.resolve(this.arquivos.get(caminho) ?? null)
  }

  escrever(caminho: string, conteudo: string): Promise<void> {
    this.arquivos.set(caminho, conteudo)
    return Promise.resolve()
  }

  listar(prefixo: string): Promise<string[]> {
    const encontrados = [...this.arquivos.keys()].filter((c) => c.startsWith(prefixo))
    return Promise.resolve(encontrados.sort())
  }

  remover(caminho: string): Promise<void> {
    this.arquivos.delete(caminho)
    return Promise.resolve()
  }
}
