import { useTranslation } from 'react-i18next'

/**
 * Estado inicial do app do aluno: ainda não há prescrição.
 * A ação de importar é a única saída — nada mais compete por atenção.
 */
export function EstadoSemPlano() {
  const { t } = useTranslation()

  return (
    <section className="vazio">
      <h1 className="vazio__titulo">{t('vazio.semPlanoTitulo')}</h1>
      <p className="vazio__descricao">{t('vazio.semPlanoDescricao')}</p>
      <p className="vazio__rodape">{t('rodape.seusDados')}</p>
    </section>
  )
}
