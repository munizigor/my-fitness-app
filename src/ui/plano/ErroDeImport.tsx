import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProblemaNoArquivo } from '../../domain/errors/ArquivoInvalidoError'

/**
 * A tela de erro serve a duas pessoas ao mesmo tempo, e nenhuma delas é
 * desenvolvedor.
 *
 * O **aluno** não montou o arquivo e não pode consertá-lo: para ele, a
 * informação que importa é que nada quebrou no aparelho, e que existe um jeito
 * de passar o problema adiante.
 *
 * O **profissional** vai corrigir: para ele, cada problema precisa dizer em que
 * treino, em que exercício, em que campo — no vocabulário dele, não no do JSON.
 *
 * O caminho técnico continua acessível, recolhido, para quem depura o app.
 */
export function ErroDeImport({ problemas }: { problemas: readonly ProblemaNoArquivo[] }) {
  const { t } = useTranslation()
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    const texto = problemas.map((p) => `• ${p.onde} — ${p.oQue}: ${p.mensagem}`).join('\n')
    await navigator.clipboard.writeText(`${t('erroImport.titulo')}\n\n${texto}`)
    setCopiado(true)
  }

  return (
    <div className="erro" role="alert">
      <h2 className="erro__titulo">{t('erroImport.titulo')}</h2>
      <p className="erro__explicacao">{t('erroImport.tranquilizacao')}</p>

      <ul className="erro__lista">
        {problemas.map((problema, i) => (
          <li key={`${problema.caminhoTecnico}-${i}`} className="erro__item">
            <span className="erro__onde">{problema.onde}</span>
            <span className="erro__mensagem">
              <strong>{problema.oQue}</strong>: {problema.mensagem}
            </span>
          </li>
        ))}
      </ul>

      <button type="button" className="botao botao--discreto" onClick={() => void copiar()}>
        {copiado ? t('erroImport.copiado') : t('erroImport.copiar')}
      </button>

      <details className="erro__tecnico">
        <summary>{t('erroImport.detalhesTecnicos')}</summary>
        <ul>
          {problemas.map((problema, i) => (
            <li key={`t-${problema.caminhoTecnico}-${i}`}>
              <code>{problema.caminhoTecnico}</code>
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}
