import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useVault } from '../estado/vaultStore'
import { ErroDeImport } from './ErroDeImport'

/**
 * Onde o aluno carrega o arquivo que o profissional enviou.
 *
 * A prescrição aparece em resumo, read-only: o aluno confere que recebeu o
 * plano certo, de quem espera. A consulta completa é de outra story.
 */
export function TelaPlano() {
  const { t } = useTranslation()
  const { arquivo, carregando, problemas, importar } = useVault()
  const entrada = useRef<HTMLInputElement>(null)

  async function aoEscolherArquivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const escolhido = evento.target.files?.[0]
    if (!escolhido) return
    await importar(await escolhido.text())
    // Permite reimportar o mesmo arquivo depois de corrigido: sem isso o
    // input não dispara change para um nome de arquivo repetido.
    evento.target.value = ''
  }

  return (
    <section className="plano">
      <h1 className="plano__titulo">{t('plano.titulo')}</h1>

      {arquivo && (
        <div className="plano__resumo">
          <p className="plano__prescritor">
            {t('plano.prescritoPor', { nome: arquivo.profissional.nome })}
          </p>
          <p className="plano__linha">{t('plano.emitidoEm', { data: arquivo.emitidoEm })}</p>
          <p className="plano__linha">
            {t('plano.resumoTreino', {
              sessoes: arquivo.plano.treino.sessoes.length,
              min: arquivo.plano.treino.intervaloEntreSeriesSegundos.min,
              max: arquivo.plano.treino.intervaloEntreSeriesSegundos.max,
            })}
          </p>
          <p className="plano__linha">
            {t('plano.resumoNutricao', {
              refeicoes: arquivo.plano.nutricao.refeicoes.length,
              litros: arquivo.plano.nutricao.hidratacaoLitros,
            })}
          </p>
          <p className="plano__linha">
            {t('plano.resumoSuplementos', {
              formulas: arquivo.plano.suplementacao.formulas.length,
            })}
          </p>
        </div>
      )}

      {problemas && <ErroDeImport problemas={problemas} />}

      <input
        ref={entrada}
        type="file"
        accept="application/json,.json,.fitvault.json"
        className="plano__entrada"
        aria-label={t('plano.importar')}
        onChange={(e) => void aoEscolherArquivo(e)}
      />
      <button
        type="button"
        className="botao"
        disabled={carregando}
        onClick={() => entrada.current?.click()}
      >
        {carregando ? t('plano.importando') : arquivo ? t('plano.trocar') : t('plano.importar')}
      </button>

      <p className="plano__nota">{t('plano.seusDadosFicam')}</p>
    </section>
  )
}
