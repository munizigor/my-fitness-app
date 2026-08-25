import { useTranslation } from 'react-i18next'
import type { TreinoPrescrito } from '../../domain/plano/prescricaoCompleta'
import type { DiaDaSemana } from '../../domain/schema/arquivoDePlano'
import { formatarExecucao } from '../comum/formatarExecucao'

/**
 * Os treinos do plano, um por bloco, cada um atrás de um toque.
 *
 * O plano de academia tem de dois a seis treinos de dez exercícios. Abertos de
 * uma vez, isto vira a planilha rolando na tela — e a planilha é o artefato que
 * o app existe para substituir. O que fica à vista é o suficiente para escolher
 * qual abrir: o rótulo, o foco, os dias em que cai e quantos exercícios tem.
 */
export function TreinosPrescritos({ treinos }: { treinos: readonly TreinoPrescrito[] }) {
  const { t } = useTranslation()

  return (
    <section className="prescricao" aria-labelledby="plano-treinos">
      <h2 className="prescricao__titulo" id="plano-treinos">
        {t('plano.treinosTitulo')}
      </h2>

      {treinos.map(({ sessao, exercicios, dias }) => (
        <details key={sessao.id} className="treino">
          <summary className="treino__resumo">
            <span className="treino__rotulo">
              {sessao.rotulo}
              {sessao.foco && <span className="treino__foco"> · {sessao.foco}</span>}
            </span>
            <span className="treino__detalhe">
              {dias.length > 0
                ? t('plano.treinoDias', { dias: listar(dias, t) })
                : t('plano.treinoSemDia')}{' '}
              · {t('plano.exercicios', { count: exercicios.length })}
            </span>
          </summary>

          <ol className="treino__exercicios">
            {exercicios.map(({ prescrito, exercicio }) => (
              <li key={prescrito.id} className="treino__exercicio">
                <span className="treino__nome">{exercicio.nome}</span>
                <span className="treino__prescricao">
                  {formatarExecucao(prescrito.series, prescrito.execucao, t)}
                  {prescrito.cargaAlvoKg !== undefined &&
                    ` · ${t('plano.cargaAlvo', {
                      carga: prescrito.cargaAlvoKg.toLocaleString('pt-BR'),
                    })}`}
                </span>
                {/* A mesma Prancha Lateral aparece duas vezes, uma por lado, e
                    é só a observação que distingue as duas. Sem ela o aluno
                    faria um lado e acharia que terminou. */}
                {prescrito.observacao && (
                  <span className="treino__observacao">{prescrito.observacao}</span>
                )}
              </li>
            ))}
          </ol>
        </details>
      ))}
    </section>
  )
}

/**
 * "Segunda-feira e Quarta-feira" — a vírgula e o "e" que o português usa.
 *
 * `Intl.ListFormat` em vez de `join(', ')` porque a última junção não é uma
 * vírgula em idioma nenhum que o app venha a falar.
 */
function listar(dias: readonly DiaDaSemana[], t: ReturnType<typeof useTranslation>['t']): string {
  return new Intl.ListFormat('pt-BR', { type: 'conjunction' }).format(
    dias.map((dia) => t(`diaDaSemana.${dia}`))
  )
}
