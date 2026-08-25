import { create } from 'zustand'
import { ImportarPlano } from '../../application/ImportarPlano'
import {
  ArquivoInvalidoError,
  type ProblemaNoArquivo,
} from '../../domain/errors/ArquivoInvalidoError'
import type { VaultStorage } from '../../domain/ports/VaultStorage'
import { lerArquivoDePlano, type ArquivoDePlano } from '../../domain/schema/arquivoDePlano'
import { CAMINHOS } from '../../domain/vault/caminhos'
import { OpfsVaultStorage } from '../../infrastructure/armazenamento/OpfsVaultStorage'

export type EstadoDoVault = {
  arquivo: ArquivoDePlano | null
  carregando: boolean
  problemas: readonly ProblemaNoArquivo[] | null
  carregarDoVault: () => Promise<void>
  importar: (conteudo: string) => Promise<void>
}

/**
 * A UI não fala com o armazenamento: fala com casos de uso, que falam com a
 * porta. Trocar OPFS por outro motor (ADR 0002) não toca em nenhum componente.
 */
let vault: VaultStorage = new OpfsVaultStorage()

/** Só para os testes de componente, que rodam em jsdom e não têm OPFS. */
export function usarVault(outro: VaultStorage): void {
  vault = outro
}

/** O vault em uso, para outros stores não precisarem duplicar a escolha. */
export function vaultAtual(): VaultStorage {
  return vault
}

export const useVault = create<EstadoDoVault>((set) => ({
  arquivo: null,
  carregando: true,
  problemas: null,

  carregarDoVault: async () => {
    set({ carregando: true })
    const bruto = await vault.ler(CAMINHOS.planoAtual)
    if (bruto === null) {
      set({ arquivo: null, carregando: false })
      return
    }
    try {
      set({ arquivo: lerArquivoDePlano(JSON.parse(bruto)), carregando: false, problemas: null })
    } catch {
      // Vault gravado por uma versão que não sabemos ler. Melhor mostrar o
      // estado vazio que renderizar um plano pela metade na academia.
      set({ arquivo: null, carregando: false })
    }
  },

  importar: async (conteudo: string) => {
    set({ carregando: true, problemas: null })
    try {
      const arquivo = await new ImportarPlano(vault).executar(conteudo)
      set({ arquivo, carregando: false, problemas: null })
    } catch (erro) {
      if (erro instanceof ArquivoInvalidoError) {
        // O vault continua como estava: ImportarPlano valida antes de escrever.
        set({ carregando: false, problemas: erro.problemas })
        return
      }
      throw erro
    }
  },
}))
