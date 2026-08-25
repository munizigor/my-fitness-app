import { PrescricaoInvalidaError } from '../errors/PrescricaoInvalidaError'
import type { Execucao } from '../schema/arquivoDePlano'

/**
 * Atalho de digitação para prescrever um exercício.
 *
 * `4x10a12` é a notação com que profissionais já escrevem "4 séries de 10 a 12
 * repetições" nas suas planilhas. **Não é o formato de armazenamento** — o
 * arquivo do plano guarda o significado, em campos estruturados. Este módulo
 * existe para o editor do profissional (Ciclo 2) aceitar a digitação rápida a
 * que ele está acostumado e preencher os campos sozinho: ele digita `4x10a12`
 * e vê "4 séries · 10 a 12 repetições", com os campos já certos.
 *
 * Ou seja: acelera a entrada sem fossilizar a saída.
 */
export interface Prescricao {
  readonly series: number
  readonly execucao: Execucao
  /** O que foi digitado, para o editor conseguir devolver ao campo. */
  readonly textoOriginal: string
}

const TEMPO = /^(\d+)\s*x\s*(\d+)\s*'$/
const FAIXA = /^(\d+)\s*x\s*(\d+)\s*a\s*(\d+)$/
const FIXA = /^(\d+)\s*x\s*(\d+)$/

/**
 * Normaliza só o que um humano varia sem querer ao digitar: espaços, caixa e o
 * apóstrofo tipográfico que corretores automáticos inserem. Nada além disso —
 * aceitar formas que a notação não tem esconderia erro de digitação em vez de
 * denunciá-lo enquanto o profissional ainda está com o dedo no teclado.
 */
function normalizar(texto: string): string {
  return texto.trim().toLowerCase().replace(/[’´`]/g, "'")
}

export function interpretarAtalhoDePrescricao(texto: string): Prescricao {
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
    return { series, execucao: { tipo: 'tempo', segundos }, textoOriginal: texto }
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
    return { series, execucao: { tipo: 'repeticoes', min, max }, textoOriginal: texto }
  }

  const fixa = FIXA.exec(normalizado)
  if (fixa) {
    const series = Number(fixa[1])
    const repeticoes = Number(fixa[2])
    exigirPositivo(texto, series, 'o número de séries')
    exigirPositivo(texto, repeticoes, 'o número de repetições')
    return {
      series,
      execucao: { tipo: 'repeticoes', min: repeticoes, max: repeticoes },
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
