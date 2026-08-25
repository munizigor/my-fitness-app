import { useTranslation } from 'react-i18next'
import type { UnidadeCorporal } from '../../domain/progresso/evolucaoCorporal'
import type { Variacao } from '../../domain/progresso/variacao'
import { formatarDePara, formatarPercentual } from './formatarVariacao'

/**
 * Uma trajetória em uma linha: de onde saiu, onde está, e quanto isso é.
 *
 * A mesma linha serve para a carga do supino e para a cintura do aluno —
 * a conta que a alimenta também é uma só (`domain/progresso/variacao`).
 */
export function LinhaDeVariacao({
  rotulo,
  variacao,
  unidade,
}: {
  rotulo: string
  variacao: Variacao
  unidade: UnidadeCorporal
}) {
  const { t } = useTranslation()
  const percentual = formatarPercentual(variacao, t)
  const subiu = (variacao.percentual ?? 0) > 0

  return (
    <p className="variacao">
      <span className="variacao__rotulo">{rotulo}</span>
      <span className="variacao__numeros">{formatarDePara(variacao, unidade, t)}</span>
      {percentual && (
        <span className={subiu ? 'variacao__delta variacao__delta--subiu' : 'variacao__delta'}>
          {percentual}
        </span>
      )}
    </p>
  )
}
