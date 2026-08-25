import { useTranslation } from 'react-i18next'

/**
 * Marcador honesto para as telas que ainda não existem.
 *
 * Deixar a tela dizer "Nenhum plano ainda" depois de o plano ter sido
 * importado seria mentira; inventar conteúdo de mentira seria pior.
 */
export function EmConstrucao() {
  const { t } = useTranslation()

  return (
    <section className="vazio">
      <h1 className="vazio__titulo">{t('emConstrucao.titulo')}</h1>
      <p className="vazio__descricao">{t('emConstrucao.descricao')}</p>
    </section>
  )
}
