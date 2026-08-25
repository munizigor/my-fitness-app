import type { VaultStorage } from '../domain/ports/VaultStorage'
import { lerRegistroDiario, type RegistroDiario } from '../domain/registro/registroDiario'
import { CAMINHOS } from '../domain/vault/caminhos'

/**
 * Quantos dias para trás a sugestão de carga olha.
 *
 * Suficiente para atravessar férias e lesões — quem volta depois de dois meses
 * prefere ver a carga antiga a ver campo vazio. Além disso, o número deixa de
 * ser sugestão e vira arqueologia.
 */
const DIAS_DE_HISTORICO = 90

/**
 * Os registros recentes do aluno, que alimentam a sugestão de carga.
 *
 * Lê por prefixo e para no limite: o caminho do arquivo é a data, então
 * "os últimos 90 registros" é ordenar nomes e cortar — sem índice, sem banco.
 */
export class CarregarHistorico {
  constructor(private readonly vault: VaultStorage) {}

  async executar(limite = DIAS_DE_HISTORICO): Promise<RegistroDiario[]> {
    const caminhos = await this.vault.listar(CAMINHOS.registros)
    const recentes = caminhos.sort().reverse().slice(0, limite)

    const lidos = await Promise.all(recentes.map((caminho) => this.ler(caminho)))
    return lidos.filter((r): r is RegistroDiario => r !== null)
  }

  private async ler(caminho: string): Promise<RegistroDiario | null> {
    const bruto = await this.vault.ler(caminho)
    if (bruto === null) return null
    try {
      // Um registro ilegível não invalida os outros: ele é ignorado e o
      // histórico continua útil.
      return lerRegistroDiario(JSON.parse(bruto))
    } catch {
      return null
    }
  }
}
