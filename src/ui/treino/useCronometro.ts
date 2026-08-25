import { useCallback, useEffect, useRef, useState } from 'react'

export interface Cronometro {
  /** Segundos decorridos desde o disparo, ou `null` quando parado. */
  readonly decorrido: number | null
  readonly rodando: boolean
  readonly disparar: () => void
  readonly parar: () => void
}

/**
 * Cronômetro de descanso.
 *
 * Conta a partir de um **instante gravado**, e não somando ticks. A diferença
 * importa muito aqui: entre séries o aluno olha o celular, troca de app, apaga
 * a tela. O navegador estrangula `setInterval` em aba de fundo — somar ticks
 * daria 40 segundos onde se passaram 70, e o aluno voltaria à barra cedo demais
 * achando que descansou o prescrito.
 */
export function useCronometro(): Cronometro {
  const inicio = useRef<number | null>(null)
  const [rodando, setRodando] = useState(false)
  const [decorrido, setDecorrido] = useState<number | null>(null)

  const disparar = useCallback(() => {
    inicio.current = Date.now()
    setDecorrido(0)
    setRodando(true)
  }, [])

  const parar = useCallback(() => {
    inicio.current = null
    setDecorrido(null)
    setRodando(false)
  }, [])

  useEffect(() => {
    if (!rodando) return

    const id = setInterval(() => {
      if (inicio.current === null) return
      setDecorrido(Math.floor((Date.now() - inicio.current) / 1000))
    }, 250)

    return () => clearInterval(id)
  }, [rodando])

  return { decorrido, rodando, disparar, parar }
}
