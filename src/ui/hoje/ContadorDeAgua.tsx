import { useTranslation } from 'react-i18next'

const COPO_EM_LITROS = 0.25

/**
 * Hidratação não é um item da lista: é um contador que acompanha o dia inteiro.
 *
 * Por isso fica fixo no cabeçalho, e não numa posição da linha do tempo — beber
 * água não acontece num momento, acontece o tempo todo.
 *
 * **Dois botões, não um.** A primeira versão só somava: um toque a mais e o dia
 * ficava errado até a meia-noite. Registrar é diferente de contar para cima.
 *
 * Passar do alvo é permitido de propósito. Travar em 4 L gravaria 4 no arquivo
 * que o profissional vai ler quando o aluno bebeu 4,5 — e agora que dá para
 * corrigir, a trava deixou de proteger de qualquer coisa. Quem enche é a barra,
 * não o número.
 */
export function ContadorDeAgua({
  alvoLitros,
  consumidoLitros,
  onAjustar,
}: {
  alvoLitros: number
  consumidoLitros: number
  onAjustar: (litros: number) => void
}) {
  const { t } = useTranslation()
  const proporcao = Math.min(1, consumidoLitros / alvoLitros)

  return (
    <div className="agua">
      <button
        type="button"
        className="agua__passo"
        aria-label={t('hoje.aguaRemover')}
        disabled={consumidoLitros === 0}
        onClick={() => onAjustar(Math.max(0, consumidoLitros - COPO_EM_LITROS))}
      >
        −
      </button>

      <div className="agua__leitura">
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
      </div>

      <button
        type="button"
        className="agua__passo"
        aria-label={t('hoje.aguaAdicionar')}
        onClick={() => onAjustar(consumidoLitros + COPO_EM_LITROS)}
      >
        +
      </button>
    </div>
  )
}
