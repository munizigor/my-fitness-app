import { useTranslation } from 'react-i18next'
import type { ProblemaNoArquivo } from '../../domain/errors/ArquivoInvalidoError'

/**
 * O aluno não montou o arquivo e não pode consertá-lo. Então a tela tem que
 * servir a duas pessoas ao mesmo tempo: dizer ao aluno que nada quebrou no
 * aparelho dele, e dar ao profissional o caminho exato de cada campo errado.
 */
export function ErroDeImport({ problemas }: { problemas: readonly ProblemaNoArquivo[] }) {
  const { t } = useTranslation()

  return (
    <div className="erro" role="alert">
      <h2 className="erro__titulo">{t('erroImport.titulo')}</h2>
      <p className="erro__explicacao">{t('erroImport.explicacao')}</p>
      <ul className="erro__lista">
        {problemas.map((problema, i) => (
          <li key={`${problema.campo}-${i}`} className="erro__item">
            <code className="erro__campo">
              {problema.campo
                ? t('erroImport.noCampo', { campo: problema.campo })
                : t('erroImport.noArquivo')}
            </code>
            <span className="erro__mensagem">{problema.mensagem}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
