import { useTranslation } from 'react-i18next'
import type { DiaNaAgenda } from '../../domain/plano/prescricaoCompleta'

/**
 * A semana em sete linhas — o mapa do plano.
 *
 * Fica sempre à vista, enquanto treinos e refeições ficam atrás de um toque:
 * é o único bloco desta tela que cabe inteiro na primeira dobra, e é o que
 * responde à pergunta com que o aluno chega aqui ("quando eu treino o quê?").
 */
export function SemanaPrescrita({ agenda }: { agenda: readonly DiaNaAgenda[] }) {
  const { t } = useTranslation()

  return (
    <section className="prescricao" aria-labelledby="plano-semana">
      <h2 className="prescricao__titulo" id="plano-semana">
        {t('plano.semanaTitulo')}
      </h2>

      <ul className="semana" aria-labelledby="plano-semana">
        {agenda.map((doDia) => (
          <li
            key={doDia.dia}
            className={`semana__dia${doDia.descanso ? ' semana__dia--descanso' : ''}`}
          >
            <span className="semana__nome">{t(`diaDaSemana.${doDia.dia}`)}</span>
            <span className="semana__conteudo">
              {/* Dia sem nada precisa dizer que não tem nada. Uma linha vazia
                  se lê como informação que faltou, não como descanso. */}
              {doDia.descanso ? t('plano.descanso') : conteudoDoDia(doDia, t)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Musculação e aeróbico na mesma linha, porque são a mesma ida à academia —
 * a mesma decisão que a linha do tempo de Hoje toma ao juntá-los num bloco só.
 */
function conteudoDoDia(
  { sessao, aerobico }: DiaNaAgenda,
  t: ReturnType<typeof useTranslation>['t']
): string {
  const partes: string[] = []

  if (sessao) partes.push(sessao.foco ? `${sessao.rotulo} · ${sessao.foco}` : sessao.rotulo)
  if (aerobico) {
    partes.push(
      t('plano.aerobico', {
        modalidade: aerobico.modalidade,
        minutos: aerobico.duracaoMinutos,
      })
    )
  }

  return partes.join(' + ')
}
