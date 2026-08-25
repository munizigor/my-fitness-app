import type { VaultStorage } from '../domain/ports/VaultStorage'
import type { RegistroDiario, SerieRegistrada } from '../domain/registro/registroDiario'
import { carregarRegistro, gravarRegistro } from './registroDoDia'

export type Agora = () => string

export interface SerieConcluida {
  readonly itemDeTreinoId: string
  readonly indice: number
  readonly cargaKg?: number
  readonly repeticoes?: number
  readonly segundos?: number
}

/**
 * O aluno concluiu uma série.
 *
 * **Grava a cada série, não ao fim do treino.** Um treino dura 50 minutos: o
 * app pode ser fechado, o celular pode morrer, o navegador pode descartar a aba
 * para liberar memória enquanto o aluno assiste a um vídeo entre séries.
 * Guardar tudo para o final significaria perder o treino inteiro em qualquer um
 * desses casos — justamente o registro que o produto existe para não perder.
 *
 * Reregistrar a mesma série substitui a anterior, em vez de duplicar: o aluno
 * que errou a carga e toca de novo está corrigindo, não fazendo outra série.
 */
export class RegistrarSerie {
  constructor(
    private readonly vault: VaultStorage,
    private readonly agora: Agora = () => new Date().toISOString()
  ) {}

  async executar(data: string, serie: SerieConcluida): Promise<RegistroDiario> {
    const registro = await carregarRegistro(this.vault, data)

    const nova: SerieRegistrada = {
      itemDeTreinoId: serie.itemDeTreinoId,
      indice: serie.indice,
      ...(serie.cargaKg !== undefined && { cargaKg: serie.cargaKg }),
      ...(serie.repeticoes !== undefined && { repeticoes: serie.repeticoes }),
      ...(serie.segundos !== undefined && { segundos: serie.segundos }),
      concluidaEm: this.agora(),
    }

    const semADuplicada = registro.series.filter(
      (s) => !(s.itemDeTreinoId === nova.itemDeTreinoId && s.indice === nova.indice)
    )
    const atualizado: RegistroDiario = { ...registro, series: [...semADuplicada, nova] }

    return gravarRegistro(this.vault, atualizado)
  }
}
