import { criarPerfil, type Perfil } from '../domain/aluno/perfil'
import type { VaultStorage } from '../domain/ports/VaultStorage'
import { CAMINHOS } from '../domain/vault/caminhos'

/**
 * O aluno corrigiu o próprio perfil.
 *
 * Escreve **só** `vault/aluno/perfil.json`. O histórico de medidas e os
 * registros diários ficam onde estão: o perfil diz quem é a pessoa, não o que
 * aconteceu com ela.
 */
export class SalvarPerfil {
  constructor(private readonly vault: VaultStorage) {}

  async executar(valores: unknown): Promise<Perfil> {
    // Valida antes de escrever, como no import: perfil ruim não deixa o vault
    // pela metade.
    const perfil = criarPerfil(valores)

    await this.vault.escrever(CAMINHOS.perfil, JSON.stringify(perfil, null, 2))
    return perfil
  }
}
