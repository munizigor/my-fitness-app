import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

export interface Descanso {
  readonly minSegundos: number
  readonly maxSegundos: number
}

/**
 * O cronômetro que dispara sozinho ao concluir a série.
 *
 * Na planilha, `INTERVALO ENTRE SÉRIES: 60 a 70s` é uma linha de texto que
 * ninguém obedece — é instrução dirigida ao eu reflexivo, que não está presente
 * no meio do treino. Aqui vira comportamento do sistema: o aluno não precisa
 * lembrar de nada, nem tocar em nada para começar a contar.
 *
 * Largura total e vibração ao completar, porque o celular costuma estar no
 * bolso ou no banco, e o aluno não está olhando para a tela.
 */
export function CronometroDeDescanso({
  decorrido,
  descanso,
  onDispensar,
}: {
  decorrido: number
  descanso: Descanso
  onDispensar: () => void
}) {
  const { t } = useTranslation()
  const jaVibrou = useRef(false)

  const cumpriuMinimo = decorrido >= descanso.minSegundos
  const passouDoMaximo = decorrido >= descanso.maxSegundos
  const restante = Math.max(0, descanso.minSegundos - decorrido)

  useEffect(() => {
    if (cumpriuMinimo && !jaVibrou.current) {
      jaVibrou.current = true
      // Sem suporte em iOS; é reforço, não o único aviso.
      navigator.vibrate?.([200, 100, 200])
    }
  }, [cumpriuMinimo])

  return (
    <div
      className={`cronometro ${cumpriuMinimo ? 'cronometro--pronto' : ''}`}
      role="timer"
      aria-live="polite"
    >
      <span className="cronometro__tempo">{formatar(decorrido)}</span>
      <span className="cronometro__estado">
        {passouDoMaximo
          ? t('execucao.descansoPassou')
          : cumpriuMinimo
            ? t('execucao.descansoPronto', { max: descanso.maxSegundos })
            : t('execucao.descansoFaltam', { segundos: restante })}
      </span>
      <button type="button" className="cronometro__dispensar" onClick={onDispensar}>
        {t('execucao.dispensarDescanso')}
      </button>
    </div>
  )
}

function formatar(segundos: number): string {
  const minutos = Math.floor(segundos / 60)
  const resto = segundos % 60
  return `${minutos}:${String(resto).padStart(2, '0')}`
}
