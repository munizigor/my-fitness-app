import { useTranslation } from 'react-i18next'
import type { ItemDoDia, MomentoDeSuplemento } from '../../domain/dia/montarDia'
import type { Execucao } from '../../domain/schema/arquivoDePlano'
import { formatarMedida } from '../comum/formatarMedida'

/**
 * Um momento do dia, como cartão.
 *
 * Cada tipo mostra só o suficiente para o aluno decidir se é a hora de agir.
 * O detalhe fica na tela que executa aquele momento — princípio 1: um momento
 * por vez, nunca o documento inteiro.
 */
export function ItemDaLinhaDoTempo({ item }: { item: ItemDoDia }) {
  const { t } = useTranslation()

  switch (item.tipo) {
    case 'refeicao':
      return (
        <li className="linha__item linha__item--refeicao">
          <span className="linha__titulo">
            {item.refeicao.nome ?? t('hoje.refeicao', { numero: item.refeicao.numero })}
          </span>
          <span className="linha__detalhe">
            {t('hoje.refeicaoItens', { count: item.refeicao.itens.length })}
          </span>
        </li>
      )

    case 'suplementos':
      return (
        <li className="linha__item linha__item--suplementos">
          <span className="linha__titulo">{tituloDoMomento(item.momento, t)}</span>
          <ul className="suplementos">
            {item.suplementos.map(({ suplemento }) => (
              <li key={suplemento.id} className="suplementos__item">
                <span className="suplementos__nome">{suplemento.nome}</span>{' '}
                <span className="suplementos__dose">
                  {formatarMedida(suplemento.dose.quantidade, suplemento.dose.unidade, t)}
                </span>
                {suplemento.posologia.observacao && (
                  <span className="suplementos__observacao">{suplemento.posologia.observacao}</span>
                )}
              </li>
            ))}
          </ul>
        </li>
      )

    case 'treino':
      return (
        <li className="linha__item linha__item--treino">
          <span className="linha__titulo">
            {item.sessao.rotulo}
            {item.sessao.foco && <span className="linha__foco"> · {item.sessao.foco}</span>}
          </span>
          <span className="linha__detalhe">
            {t('hoje.treinoExercicios', { count: item.exercicios.length })} ·{' '}
            {t('hoje.treinoDescanso', {
              min: item.descansoEntreSeries.minSegundos,
              max: item.descansoEntreSeries.maxSegundos,
            })}
          </span>
          <ul className="exercicios">
            {item.exercicios.map(({ prescrito, exercicio }) => (
              <li key={prescrito.id} className="exercicios__item">
                <span className="exercicios__nome">{exercicio.nome}</span>
                <span className="exercicios__prescricao">
                  {formatarExecucao(prescrito.series, prescrito.execucao, t)}
                  {prescrito.cargaAlvoKg !== undefined &&
                    ` · ${t('hoje.cargaAlvo', { carga: prescrito.cargaAlvoKg.toLocaleString('pt-BR') })}`}
                </span>
                {prescrito.observacao && (
                  <span className="exercicios__observacao">{prescrito.observacao}</span>
                )}
              </li>
            ))}
          </ul>
        </li>
      )

    case 'aerobico':
      return (
        <li className="linha__item linha__item--aerobico">
          <span className="linha__titulo">{t('hoje.aerobico')}</span>
          <span className="linha__detalhe">
            {item.aerobico.modalidade} ·{' '}
            {t('hoje.aerobicoDuracao', { minutos: item.aerobico.duracaoMinutos })}
          </span>
        </li>
      )
  }
}

type Traduzir = ReturnType<typeof useTranslation>['t']

function tituloDoMomento(momento: MomentoDeSuplemento, t: Traduzir): string {
  switch (momento.tipo) {
    case 'apos-refeicao':
      return t('hoje.suplementosAposRefeicao', { numero: momento.refeicao })
    case 'antes-do-treino':
      return t('hoje.suplementosAntesDoTreino')
    case 'livre':
      return t('hoje.suplementosLivre')
  }
}

/** `4 × 10–12` ou `2 × 60''`. A leitura que o aluno faz de relance na academia. */
function formatarExecucao(series: number, execucao: Execucao, t: Traduzir): string {
  if (execucao.tipo === 'tempo') {
    return t('hoje.serieTempo', { series, segundos: execucao.segundos })
  }
  return execucao.min === execucao.max
    ? t('hoje.serieRepeticoesFixas', { series, repeticoes: execucao.min })
    : t('hoje.serieRepeticoes', { series, min: execucao.min, max: execucao.max })
}
