import { useTranslation } from 'react-i18next'
import type { Circunferencia, Medida } from '../../domain/aluno/medida'
import { formatarData } from '../comum/formatarData'

/**
 * A série temporal do corpo, mais recente primeiro.
 *
 * Aqui não há gráfico de propósito. A evidência em frase — "você perdeu 3 cm de
 * cintura desde junho" — é a story de Evolução; esta tela mostra os pontos
 * datados que a alimentam, e cada um continua legível como o aluno o registrou.
 */
export function HistoricoDeMedidas({ medidas }: { medidas: readonly Medida[] }) {
  const { t } = useTranslation()

  if (medidas.length === 0) {
    return (
      <section className="historico">
        <h2 className="historico__titulo">{t('perfil.historico')}</h2>
        <p className="historico__vazio">{t('perfil.semAfericoes')}</p>
      </section>
    )
  }

  return (
    <section className="historico">
      <h2 className="historico__titulo" id="historico-titulo">
        {t('perfil.historico')}
      </h2>
      <ul className="historico__lista" aria-labelledby="historico-titulo">
        {medidas.map((medida) => (
          <li key={medida.data} className="historico__ponto">
            <span className="historico__data">{formatarData(medida.data)}</span>
            <span className="historico__valores">{descrever(medida, t)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

type Traduzir = ReturnType<typeof useTranslation>['t']

/** Só o que foi medido aparece: campo ausente não vira "0 kg". */
function descrever(medida: Medida, t: Traduzir): string {
  const partes: string[] = []

  if (medida.pesoKg !== undefined) {
    partes.push(t('perfil.pesoValor', { valor: medida.pesoKg.toLocaleString('pt-BR') }))
  }
  if (medida.percentualGordura !== undefined) {
    partes.push(
      t('perfil.gorduraValor', { valor: medida.percentualGordura.toLocaleString('pt-BR') })
    )
  }
  for (const [parte, valor] of Object.entries(medida.circunferenciasCm ?? {})) {
    if (valor === undefined) continue
    partes.push(
      t('perfil.circunferenciaValor', {
        parte: t(`perfil.partes.${parte as Circunferencia}`),
        valor: valor.toLocaleString('pt-BR'),
      })
    )
  }

  return partes.join(' · ')
}
