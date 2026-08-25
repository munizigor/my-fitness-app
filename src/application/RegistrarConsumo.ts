import type { VaultStorage } from '../domain/ports/VaultStorage'
import type {
  ItemConsumido,
  RefeicaoRegistrada,
  RegistroDiario,
} from '../domain/registro/registroDiario'
import { carregarRegistro, gravarRegistro } from './registroDoDia'

export type Agora = () => string

export interface Consumo {
  readonly refeicao: number
  readonly itemDeRefeicaoId: string
  /** O alimento escolhido entre as alternativas, ou `null` para desmarcar. */
  readonly alimento: string | null
}

/**
 * O aluno marcou o que comeu num item da refeição.
 *
 * Escolher a alternativa **é** registrar o consumo: são o mesmo toque. Pedir
 * primeiro "qual das opções" e depois "você comeu?" seria cobrar duas decisões
 * onde existe uma — e o dobro de atrito é o que faz o registro morrer na
 * segunda semana.
 *
 * Desmarcar apaga o item, e desmarcar o último apaga a refeição inteira: um
 * registro vazio no arquivo diria "o aluno abriu a refeição e não comeu nada",
 * que é diferente de não ter registrado.
 */
export class RegistrarConsumo {
  constructor(
    private readonly vault: VaultStorage,
    private readonly agora: Agora = () => new Date().toISOString()
  ) {}

  async executar(data: string, consumo: Consumo): Promise<RegistroDiario> {
    const registro = await carregarRegistro(this.vault, data)
    const anterior = registro.refeicoes.find((r) => r.numero === consumo.refeicao)

    const itens = atualizarItens(anterior?.itens ?? [], consumo)
    const outras = registro.refeicoes.filter((r) => r.numero !== consumo.refeicao)

    const refeicoes =
      itens.length === 0
        ? outras
        : [
            ...outras,
            { numero: consumo.refeicao, itens, registradaEm: this.agora() } as RefeicaoRegistrada,
          ]

    return gravarRegistro(this.vault, {
      ...registro,
      refeicoes: [...refeicoes].sort((a, b) => a.numero - b.numero),
    })
  }
}

/** Trocar de alternativa substitui: o aluno mudou de ideia, não comeu as duas. */
function atualizarItens(
  atuais: readonly ItemConsumido[],
  { itemDeRefeicaoId, alimento }: Consumo
): ItemConsumido[] {
  const semEste = atuais.filter((i) => i.itemDeRefeicaoId !== itemDeRefeicaoId)
  return alimento === null ? semEste : [...semEste, { itemDeRefeicaoId, alimento }]
}
