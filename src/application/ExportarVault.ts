import {
  FORMATO_EXPORT,
  SCHEMA_VERSION_EXPORT,
  type ArquivoDeVault,
} from '../domain/schema/arquivoDeVault'
import type { VaultStorage } from '../domain/ports/VaultStorage'
import { CAMINHOS, ehCaminhoDoVault } from '../domain/vault/caminhos'
import type { Agora } from './ImportarPlano'

export type VaultExportado = {
  /** Nome sugerido do arquivo, com a extensão do formato (ADR 0003). */
  nome: string
  arquivo: ArquivoDeVault
  /** O envelope já serializado, indentado, pronto para virar arquivo. */
  conteudo: string
}

/**
 * O aluno leva o vault embora.
 *
 * É a contrapartida do import e a prova do posicionamento: o dado é dele, em
 * formato aberto, sem depender deste app para continuar existindo. O arquivo
 * gerado reentra por `RestaurarVault` e reproduz o mesmo estado — histórico de
 * medidas incluído.
 *
 * O exportador **não interpreta nada**. Lê os documentos como estão no disco e
 * os embrulha; nenhum valor derivado é calculado no caminho de saída (ADR
 * 0006), porque o profissional que recebe o arquivo precisa dos fatos, não das
 * conclusões do app — tirar conclusões é o trabalho dele.
 */
export class ExportarVault {
  constructor(
    private readonly vault: VaultStorage,
    private readonly agora: Agora = () => new Date().toISOString()
  ) {}

  /** `null` quando não há nada a exportar: vault vazio não vira arquivo. */
  async executar(): Promise<VaultExportado | null> {
    const caminhos = (await this.vault.listar(CAMINHOS.raiz)).filter(ehCaminhoDoVault)
    const lidos = await Promise.all(caminhos.map((caminho) => this.ler(caminho)))

    const documentos = Object.fromEntries(lidos.filter((par) => par !== null))
    if (Object.keys(documentos).length === 0) return null

    const instante = this.agora()
    const arquivo: ArquivoDeVault = {
      formato: FORMATO_EXPORT,
      schemaVersion: SCHEMA_VERSION_EXPORT,
      exportadoEm: instante,
      documentos,
    }

    return {
      nome: `vault-${instante.slice(0, 10)}.fitvault.json`,
      arquivo,
      conteudo: JSON.stringify(arquivo, null, 2),
    }
  }

  /**
   * Um documento ilegível fica de fora e o resto do vault sai mesmo assim.
   *
   * Derrubar o export inteiro por causa de um arquivo corrompido seria negar ao
   * aluno o backup justamente no dia em que ele mais precisa dele.
   */
  private async ler(caminho: string): Promise<[string, unknown] | null> {
    const bruto = await this.vault.ler(caminho)
    if (bruto === null) return null
    try {
      return [caminho, JSON.parse(bruto)]
    } catch {
      return null
    }
  }
}
