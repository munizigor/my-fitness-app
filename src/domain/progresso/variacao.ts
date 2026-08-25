import { diferencaEmDias } from '../dia/dataLocal'

/**
 * Dois pontos datados viram uma frase.
 *
 * A mesma conta serve para a carga do supino e para a cintura do aluno, e é
 * deliberado que seja uma só: "+12% em 4 semanas" e "−3 cm desde junho" são a
 * mesma pergunta — *mudou, quanto, e em quanto tempo?* — feita sobre séries
 * diferentes. Duas implementações divergiriam no primeiro arredondamento.
 */

export interface Ponto {
  readonly data: string
  readonly valor: number
}

export interface Variacao {
  readonly de: number
  readonly para: number
  /** Negativa quando o número caiu: esconder a queda seria mentir para quem se lesionou. */
  readonly diferenca: number
  /** `null` quando a origem é zero — não existe percentual sobre nada. */
  readonly percentual: number | null
  readonly desde: string
  readonly semanas: number
}

/**
 * A comparação entre o primeiro e o último ponto da série.
 *
 * Devolve `null` com menos de dois pontos: um ponto não é evolução, é o começo
 * de uma. Quem chama decide o que mostrar no lugar.
 */
export function variacaoEntre(pontos: readonly Ponto[]): Variacao | null {
  if (pontos.length < 2) return null

  // Ordenar por texto é ordenar no tempo, porque a data é `AAAA-MM-DD`.
  const ordenados = [...pontos].sort((a, b) => a.data.localeCompare(b.data))
  const primeiro = ordenados[0]!
  const ultimo = ordenados[ordenados.length - 1]!

  const diferenca = ultimo.valor - primeiro.valor
  return {
    de: primeiro.valor,
    para: ultimo.valor,
    diferenca: arredondar(diferenca),
    percentual: primeiro.valor === 0 ? null : arredondar((diferenca / primeiro.valor) * 100),
    desde: primeiro.data,
    semanas: Math.round(diferencaEmDias(primeiro.data, ultimo.data) / 7),
  }
}

/** Uma casa decimal: 8,333…% na tela é ruído, não precisão. */
function arredondar(valor: number): number {
  return Math.round(valor * 10) / 10
}
