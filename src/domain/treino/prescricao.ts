import { PrescricaoInvalidaError } from '../errors/PrescricaoInvalidaError'

/**
 * A coluna "SxR" da planilha do profissional, entendida.
 *
 * Duas formas existem na prescrição real: faixa de repetições (`3x10a12`) e
 * tempo sob tensão (`2x60'`, onde o apóstrofo marca segundos). O texto original
 * viaja junto porque a prescrição é do profissional — o app mostra a nossa
 * leitura, mas nunca perde o que ele escreveu.
 */
export type Prescricao = PrescricaoPorRepeticoes | PrescricaoPorTempo

export interface PrescricaoPorRepeticoes {
  readonly tipo: 'repeticoes'
  readonly series: number
  readonly repeticoes: { readonly min: number; readonly max: number }
  readonly textoOriginal: string
}

export interface PrescricaoPorTempo {
  readonly tipo: 'tempo'
  readonly series: number
  readonly segundos: number
  readonly textoOriginal: string
}

const TEMPO = /^(\d+)\s*x\s*(\d+)\s*'$/
const FAIXA = /^(\d+)\s*x\s*(\d+)\s*a\s*(\d+)$/
const FIXA = /^(\d+)\s*x\s*(\d+)$/

/**
 * Normaliza só o que um humano varia sem querer ao digitar numa planilha:
 * espaços, caixa e o apóstrofo tipográfico que corretores automáticos inserem.
 * Nada além disso — inventar formas que a prescrição não tem esconderia erro.
 */
function normalizar(texto: string): string {
  return texto.trim().toLowerCase().replace(/[’´`]/g, "'")
}

export function analisarPrescricao(texto: string): Prescricao {
  const normalizado = normalizar(texto)

  if (normalizado === '') {
    throw new PrescricaoInvalidaError(texto, 'está vazia')
  }

  const tempo = TEMPO.exec(normalizado)
  if (tempo) {
    const series = Number(tempo[1])
    const segundos = Number(tempo[2])
    exigirPositivo(texto, series, 'o número de séries')
    exigirPositivo(texto, segundos, 'a duração em segundos')
    return { tipo: 'tempo', series, segundos, textoOriginal: texto }
  }

  const faixa = FAIXA.exec(normalizado)
  if (faixa) {
    const series = Number(faixa[1])
    const min = Number(faixa[2])
    const max = Number(faixa[3])
    exigirPositivo(texto, series, 'o número de séries')
    exigirPositivo(texto, min, 'o mínimo de repetições')
    if (max < min) {
      throw new PrescricaoInvalidaError(
        texto,
        `a faixa está invertida (${min} a ${max}) — provável erro de digitação`
      )
    }
    return { tipo: 'repeticoes', series, repeticoes: { min, max }, textoOriginal: texto }
  }

  const fixa = FIXA.exec(normalizado)
  if (fixa) {
    const series = Number(fixa[1])
    const repeticoes = Number(fixa[2])
    exigirPositivo(texto, series, 'o número de séries')
    exigirPositivo(texto, repeticoes, 'o número de repetições')
    return {
      tipo: 'repeticoes',
      series,
      repeticoes: { min: repeticoes, max: repeticoes },
      textoOriginal: texto,
    }
  }

  throw new PrescricaoInvalidaError(
    texto,
    'não corresponde a nenhuma forma conhecida (esperado "3x10a12" ou "2x60\'")'
  )
}

function exigirPositivo(texto: string, valor: number, oQue: string): void {
  if (valor < 1) {
    throw new PrescricaoInvalidaError(texto, `${oQue} precisa ser maior que zero`)
  }
}
