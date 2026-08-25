import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { ItemDoDia, SuplementoNoDia } from '../../domain/dia/montarDia'
import { formatarExecucao } from '../comum/formatarExecucao'
import { formatarMedida } from '../comum/formatarMedida'

/**
 * Um momento do dia, como cartão.
 *
 * Cada cartão é **um momento inteiro**, não uma linha de planilha: tomar o café
 * inclui os suplementos ancorados nele; ir treinar inclui o pré-treino e o
 * aeróbico. O aluno não deveria ter que perceber que três cartões seguidos são,
 * na verdade, a mesma ida à academia.
 *
 * O detalhe fica na tela que executa aquele momento — princípio 1: um momento
 * por vez, nunca o documento inteiro.
 */
export function ItemDaLinhaDoTempo({
  item,
  escolhidos = 0,
}: {
  item: ItemDoDia
  /** Quantos itens da refeição o aluno já marcou. Só faz sentido para refeição. */
  escolhidos?: number
}) {
  const { t } = useTranslation()

  switch (item.tipo) {
    case 'refeicao':
      return (
        <li className="linha__item linha__item--refeicao">
          {/* O cartão inteiro é o alvo de toque: mirar num "ver mais" de 12 px
              com uma mão só é o tipo de atrito que faz o aluno não abrir. */}
          <Link to={`/refeicao/${item.refeicao.numero}`} className="linha__alvo">
            <span className="linha__titulo">
              {item.refeicao.nome ?? t('hoje.refeicao', { numero: item.refeicao.numero })}
            </span>
            <span className="linha__detalhe">
              {escolhidos > 0
                ? t('refeicao.itensComidos', {
                    comidos: escolhidos,
                    total: item.refeicao.itens.length,
                  })
                : t('hoje.refeicaoItens', { count: item.refeicao.itens.length })}
            </span>
          </Link>
          <ListaDeSuplementos suplementos={item.suplementos} />
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

          <ListaDeSuplementos suplementos={item.suplementos} rotulo={t('hoje.antesDeTreinar')} />

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

          {/* Faz parte da mesma ida à academia: entra no cartão do treino, não
              como um compromisso separado depois dele. */}
          {item.aerobico && (
            <p className="linha__aerobico">
              <span className="linha__aerobicoRotulo">{t('hoje.aerobico')}</span>{' '}
              {item.aerobico.modalidade} ·{' '}
              {t('hoje.aerobicoDuracao', { minutos: item.aerobico.duracaoMinutos })}
            </p>
          )}

          <Link to="/treino" className="botao linha__acao">
            {t('hoje.comecarTreino')}
          </Link>
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

/**
 * Os suplementos daquele momento, dentro do cartão dele.
 *
 * Some quando não há nenhum — que é o caso da maioria das refeições. Uma seção
 * "Suplementos" vazia em quatro dos cinco cartões seria ruído puro.
 */
function ListaDeSuplementos({
  suplementos,
  rotulo,
}: {
  suplementos: readonly SuplementoNoDia[]
  rotulo?: string
}) {
  const { t } = useTranslation()
  if (suplementos.length === 0) return null

  return (
    <div className="suplementos">
      <span className="suplementos__rotulo">{rotulo ?? t('hoje.suplementos')}</span>
      <ul className="suplementos__lista">
        {suplementos.map(({ suplemento }) => (
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
    </div>
  )
}
