import { ordenarMedidas } from '../domain/aluno/historicoDeMedidas'
import { lerMedida, type Medida } from '../domain/aluno/medida'
import { lerPerfil, type Perfil } from '../domain/aluno/perfil'
import type { VaultStorage } from '../domain/ports/VaultStorage'
import { CAMINHOS } from '../domain/vault/caminhos'

export type Aluno = {
  perfil: Perfil | null
  /** Série temporal completa, mais recente primeiro. */
  medidas: readonly Medida[]
}

/**
 * Quem é o aluno e o histórico do corpo dele.
 *
 * Lê **todas** as aferições, sem janela: o histórico de medidas é a evidência
 * de longo prazo que o app existe para mostrar, e são poucos arquivos por ano —
 * ao contrário dos registros diários, que `CarregarHistorico` corta em 90 dias
 * porque só alimentam a sugestão de carga da próxima série.
 *
 * Nada aqui lança: um arquivo corrompido é ignorado e o resto continua útil.
 */
export class CarregarAluno {
  constructor(private readonly vault: VaultStorage) {}

  async executar(): Promise<Aluno> {
    const [perfil, medidas] = await Promise.all([this.lerPerfilDoVault(), this.lerMedidas()])
    return { perfil, medidas }
  }

  private async lerPerfilDoVault(): Promise<Perfil | null> {
    const bruto = await this.vault.ler(CAMINHOS.perfil)
    if (bruto === null) return null
    try {
      return lerPerfil(JSON.parse(bruto))
    } catch {
      return null
    }
  }

  private async lerMedidas(): Promise<readonly Medida[]> {
    const caminhos = await this.vault.listar(CAMINHOS.medidas)
    const lidas = await Promise.all(caminhos.map((caminho) => this.lerMedidaDoVault(caminho)))
    return ordenarMedidas(lidas.filter((m): m is Medida => m !== null))
  }

  private async lerMedidaDoVault(caminho: string): Promise<Medida | null> {
    const bruto = await this.vault.ler(caminho)
    if (bruto === null) return null
    try {
      return lerMedida(JSON.parse(bruto))
    } catch {
      return null
    }
  }
}
