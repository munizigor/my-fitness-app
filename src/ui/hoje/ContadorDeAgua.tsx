import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const COPO_EM_LITROS = 0.25

/**
 * Hidratação não é um item da lista: é um contador que acompanha o dia inteiro.
 *
 * Por isso fica fixo no cabeçalho, e não numa posição da linha do tempo — beber
 * água não acontece num momento, acontece o tempo todo.
 *
 * O registro ainda não vai ao vault: isso entra com o registro diário, na story
 * de execução. Aqui o contador já existe para a tela ficar honesta com o alvo
 * que o profissional prescreveu.
 */
export function ContadorDeAgua({ alvoLitros }: { alvoLitros: number }) {
  const { t } = useTranslation()
  const [consumidoLitros, setConsumido] = useState(0)

  const proporcao = Math.min(1, consumidoLitros / alvoLitros)

  return (
    <div className="agua">
      <button
        type="button"
        className="agua__botao"
        aria-label={t('hoje.aguaAdicionar')}
        onClick={() => setConsumido((atual) => Math.min(alvoLitros, atual + COPO_EM_LITROS))}
      >
        <span className="agua__rotulo">{t('hoje.agua')}</span>
        <span className="agua__valor">
          {t('hoje.aguaContador', {
            consumido: consumidoLitros.toLocaleString('pt-BR'),
            alvo: alvoLitros.toLocaleString('pt-BR'),
          })}
        </span>
        <span
          className="agua__barra"
          role="progressbar"
          aria-valuenow={consumidoLitros}
          aria-valuemin={0}
          aria-valuemax={alvoLitros}
        >
          <span className="agua__preenchida" style={{ inlineSize: `${proporcao * 100}%` }} />
        </span>
      </button>
    </div>
  )
}
