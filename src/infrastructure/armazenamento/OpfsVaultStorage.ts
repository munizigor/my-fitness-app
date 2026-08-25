import type { VaultStorage } from '../../domain/ports/VaultStorage'

/**
 * O vault do aluno em OPFS — o sistema de arquivos privado da origem (ADR 0002).
 *
 * Caminhos como `vault/registros/2026-08-11.json` viram diretórios de verdade,
 * e não chaves de um mapa plano. É o que faz `listar` por prefixo ser barato e
 * o que mantém a estrutura navegável quando o vault é exportado para uma pasta.
 *
 * OPFS não existe em jsdom: esta classe é verificada por Playwright em Chromium
 * de verdade, não por teste unitário.
 */
export class OpfsVaultStorage implements VaultStorage {
  constructor(private readonly raiz: () => Promise<FileSystemDirectoryHandle> = obterRaiz) {}

  async ler(caminho: string): Promise<string | null> {
    const { diretorio, nome } = await this.navegar(caminho, { criar: false })
    if (!diretorio) return null
    try {
      const handle = await diretorio.getFileHandle(nome)
      return await (await handle.getFile()).text()
    } catch {
      // Caminho inexistente é o estado normal de um vault vazio, não um erro.
      return null
    }
  }

  async escrever(caminho: string, conteudo: string): Promise<void> {
    const { diretorio, nome } = await this.navegar(caminho, { criar: true })
    const handle = await diretorio!.getFileHandle(nome, { create: true })
    const fluxo = await handle.createWritable()
    try {
      await fluxo.write(conteudo)
    } finally {
      // Sem fechar, o navegador pode não materializar a escrita. Um registro
      // de série perdido no meio do treino é exatamente o que o app não pode
      // fazer, então o fechamento vai no finally.
      await fluxo.close()
    }
  }

  async listar(prefixo: string): Promise<string[]> {
    const encontrados: string[] = []
    await this.percorrer(await this.raiz(), '', encontrados)
    return encontrados.filter((c) => c.startsWith(prefixo)).sort()
  }

  async remover(caminho: string): Promise<void> {
    const { diretorio, nome } = await this.navegar(caminho, { criar: false })
    if (!diretorio) return
    try {
      await diretorio.removeEntry(nome)
    } catch {
      // Remover o que não existe é operação válida e sem efeito.
    }
  }

  /** Desce a árvore até o diretório do arquivo, criando o caminho se pedido. */
  private async navegar(
    caminho: string,
    { criar }: { criar: boolean }
  ): Promise<{ diretorio: FileSystemDirectoryHandle | null; nome: string }> {
    const partes = caminho.split('/').filter(Boolean)
    const nome = partes.pop()
    if (nome === undefined) throw new Error(`Caminho inválido no vault: ${caminho}`)

    let atual = await this.raiz()
    for (const parte of partes) {
      try {
        atual = await atual.getDirectoryHandle(parte, { create: criar })
      } catch {
        return { diretorio: null, nome }
      }
    }
    return { diretorio: atual, nome }
  }

  private async percorrer(
    diretorio: FileSystemDirectoryHandle,
    prefixo: string,
    saida: string[]
  ): Promise<void> {
    for await (const [nome, handle] of diretorio.entries()) {
      const caminho = prefixo ? `${prefixo}/${nome}` : nome
      if (ehDiretorio(handle)) {
        await this.percorrer(handle, caminho, saida)
      } else {
        saida.push(caminho)
      }
    }
  }
}

/**
 * A lib do DOM declara `FileSystemHandle` como tipo base, não como união
 * discriminada por `kind` — então comparar `kind` não estreita o tipo sozinho.
 */
function ehDiretorio(handle: FileSystemHandle): handle is FileSystemDirectoryHandle {
  return handle.kind === 'directory'
}

function obterRaiz(): Promise<FileSystemDirectoryHandle> {
  return navigator.storage.getDirectory()
}
