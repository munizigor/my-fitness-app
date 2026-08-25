import { RegistroInvalidoError } from '../domain/errors/RegistroInvalidoError'
import type { VaultStorage } from '../domain/ports/VaultStorage'
import type { RegistroDiario } from '../domain/registro/registroDiario'
import { carregarRegistro, gravarRegistro } from './registroDoDia'

/**
 * O aluno ajustou quanto bebeu hoje.
 *
 * Grava o **total do dia**, não um evento por copo. Água é um contador, não uma
 * linha do tempo: quem se enganou corrige o total, e ninguém quer ler um
 * histórico de goles. É também o que permite ajustar para baixo — antes só dava
 * para somar, e um toque a mais ficava errado até a meia-noite.
 */
export class RegistrarAgua {
  constructor(private readonly vault: VaultStorage) {}

  async executar(data: string, litros: number): Promise<RegistroDiario> {
    if (!Number.isFinite(litros) || litros < 0) {
      throw new RegistroInvalidoError(`Água não pode ser ${litros} L`)
    }

    const registro = await carregarRegistro(this.vault, data)
    return gravarRegistro(this.vault, { ...registro, aguaLitros: litros })
  }
}
