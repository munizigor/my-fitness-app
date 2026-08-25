import type { TFunction } from 'i18next'
import type { UnidadeCorporal } from '../../domain/progresso/evolucaoCorporal'
import type { Variacao } from '../../domain/progresso/variacao'

/**
 * Os números da Evolução como uma pessoa os lê.
 *
 * O domínio devolve fatos (`{ de: 85, para: 81.6 }`); a frase é montada aqui,
 * com vírgula decimal e a unidade só de um lado — "85 → 81,6 kg", e não
 * "85 kg → 81,6 kg", que faz o olho ler duas coisas onde há uma.
 */

/** `kg` também serve para a carga e o volume, que não são medidas do corpo. */
export function formatarValor(valor: number, unidade: UnidadeCorporal, t: TFunction): string {
  const numero = valor.toLocaleString('pt-BR')
  if (unidade === 'kg') return t('evolucao.valorKg', { valor: numero })
  if (unidade === 'cm') return t('evolucao.valorCm', { valor: numero })
  return t('evolucao.valorPercentual', { valor: numero })
}

export function formatarDePara(variacao: Variacao, unidade: UnidadeCorporal, t: TFunction): string {
  return t('evolucao.dePara', {
    de: variacao.de.toLocaleString('pt-BR'),
    para: formatarValor(variacao.para, unidade, t),
  })
}

/**
 * O percentual, com o sinal que ele merece. `null` quando não há percentual
 * possível (origem zero): o "de → para" ao lado já conta a história inteira.
 */
export function formatarPercentual(variacao: Variacao, t: TFunction): string | null {
  if (variacao.percentual === null || variacao.percentual === 0) return null

  const valor = variacao.percentual.toLocaleString('pt-BR')
  return variacao.percentual > 0 ? t('evolucao.subiu', { valor }) : t('evolucao.caiu', { valor })
}

/** "em 4 semanas" — ou "esta semana", porque "em 0 semanas" não é português. */
export function formatarIntervalo(semanas: number, t: TFunction): string {
  return semanas === 0
    ? t('evolucao.intervaloMesmaSemana')
    : t('evolucao.intervalo', { count: semanas })
}
