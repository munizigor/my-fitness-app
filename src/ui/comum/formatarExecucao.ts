import type { TFunction } from 'i18next'
import type { ExecucaoNoDia } from '../../domain/dia/montarDia'

/**
 * A prescrição de uma série como o aluno lê de relance: `4 × 10–12`, `2 × 60''`.
 *
 * Uma função só para as duas telas que mostram isto — a linha do tempo e o modo
 * execução. Estavam duplicadas, e uma forma nova de execução custaria dois
 * lugares para acrescentar e dois para esquecer.
 *
 * Recebe o tipo derivado (`ExecucaoNoDia`), não o do schema: a tela não precisa
 * saber em que formato o arquivo do profissional guardou isso.
 */
export function formatarExecucao(series: number, execucao: ExecucaoNoDia, t: TFunction): string {
  if (execucao.tipo === 'tempo') {
    return t('hoje.serieTempo', { series, segundos: execucao.segundos })
  }
  return execucao.min === execucao.max
    ? t('hoje.serieRepeticoesFixas', { series, repeticoes: execucao.min })
    : t('hoje.serieRepeticoes', { series, min: execucao.min, max: execucao.max })
}
