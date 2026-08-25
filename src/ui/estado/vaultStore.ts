import { create } from 'zustand'
import { ExportarVault } from '../../application/ExportarVault'
import { ImportarPlano } from '../../application/ImportarPlano'
import { RestaurarVault } from '../../application/RestaurarVault'
import {
  ArquivoInvalidoError,
  type ProblemaNoArquivo,
} from '../../domain/errors/ArquivoInvalidoError'
import type { FileTransfer } from '../../domain/ports/FileTransfer'
import type { VaultStorage } from '../../domain/ports/VaultStorage'
import { lerArquivoDePlano, type ArquivoDePlano } from '../../domain/schema/arquivoDePlano'
import { ehArquivoDeVault } from '../../domain/schema/arquivoDeVault'
import { CAMINHOS } from '../../domain/vault/caminhos'
import { OpfsVaultStorage } from '../../infrastructure/armazenamento/OpfsVaultStorage'
import { SalvarArquivo } from '../../infrastructure/arquivo/SalvarArquivo'

/** O que acabou de acontecer com o arquivo, para a tela dizer em uma frase. */
export type AvisoDoVault = 'exportado' | 'restaurado' | 'nadaParaExportar'

export type EstadoDoVault = {
  arquivo: ArquivoDePlano | null
  carregando: boolean
  problemas: readonly ProblemaNoArquivo[] | null
  aviso: AvisoDoVault | null
  carregarDoVault: () => Promise<void>
  importar: (conteudo: string) => Promise<void>
  exportar: () => Promise<void>
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

/** Como o arquivo sai do app. Trocar Chrome por iOS não toca em componente nenhum. */
let transferencia: FileTransfer = new SalvarArquivo()

/** Só para os testes: ninguém abre diálogo do sistema em jsdom. */
export function usarTransferencia(outra: FileTransfer): void {
  transferencia = outra
}

/** O vault em uso, para outros stores não precisarem duplicar a escolha. */
export function vaultAtual(): VaultStorage {
  return vault
}

export const useVault = create<EstadoDoVault>((set, get) => ({
  arquivo: null,
  carregando: true,
  problemas: null,
  aviso: null,

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

  /**
   * O aluno escolheu um arquivo. Pode ser a prescrição que o profissional
   * enviou ou o backup do próprio vault — e ele não precisa saber qual, nem
   * escolher entre dois botões parecidos: **o arquivo diz o que é** (`formato`).
   *
   * Um só caminho de entrada também mantém a promessa honesta: a mesma tela que
   * exporta é a que traz de volta.
   */
  importar: async (conteudo: string) => {
    set({ carregando: true, problemas: null, aviso: null })
    try {
      if (ehArquivoDeVault(desserializar(conteudo))) {
        await new RestaurarVault(vault).executar(conteudo)
        // O plano volta do disco, como em qualquer abertura do app. As outras
        // telas releem o vault ao montar, então Hoje, Perfil e Evolução já
        // encontram o histórico restaurado quando o aluno chegar nelas.
        await get().carregarDoVault()
        set({ aviso: 'restaurado' })
        return
      }

      const arquivo = await new ImportarPlano(vault).executar(conteudo)
      set({ arquivo, carregando: false, problemas: null })
    } catch (erro) {
      if (erro instanceof ArquivoInvalidoError) {
        // O vault continua como estava: os dois casos de uso validam antes de
        // escrever o primeiro byte.
        set({ carregando: false, problemas: erro.problemas })
        return
      }
      throw erro
    }
  },

  exportar: async () => {
    set({ problemas: null, aviso: null })

    const exportado = await new ExportarVault(vault).executar()
    if (exportado === null) {
      set({ aviso: 'nadaParaExportar' })
      return
    }

    const resultado = await transferencia.salvar(exportado)
    // Desistir do diálogo do sistema é decisão do aluno: nada a comemorar,
    // nada a reclamar.
    if (resultado === 'salvo') set({ aviso: 'exportado' })
  },
}))

/** Só para perguntar "que arquivo é este?" — validar é trabalho do caso de uso. */
function desserializar(conteudo: string): unknown {
  try {
    return JSON.parse(conteudo)
  } catch {
    return null
  }
}
