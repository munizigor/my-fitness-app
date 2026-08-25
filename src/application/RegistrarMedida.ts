import { criarMedida, type Medida, type ValoresAferidos } from '../domain/aluno/medida'
import type { VaultStorage } from '../domain/ports/VaultStorage'
import { CAMINHOS } from '../domain/vault/caminhos'

/**
 * O aluno se mediu.
 *
 * Um arquivo por data: a aferição de hoje **não** substitui a de junho. É a
 * diferença entre a planilha, onde o peso era uma célula que se sobrescrevia, e
 * uma série temporal que Evolução consegue ler.
 *
 * Medir de novo no mesmo dia é correção, não segunda aferição — o arquivo
 * daquele dia é reescrito. Quem errou o número na balança corrige; ninguém
 * quer dois pesos concorrentes para a mesma manhã.
 */
export class RegistrarMedida {
  constructor(private readonly vault: VaultStorage) {}

  async executar(data: string, valores: ValoresAferidos): Promise<Medida> {
    // Valida antes de escrever: aferição impossível não chega ao disco.
    const medida = criarMedida(data, valores)

    // Indentado de propósito: o vault é para ser legível em qualquer editor.
    await this.vault.escrever(CAMINHOS.medida(medida.data), JSON.stringify(medida, null, 2))
    return medida
  }
}
