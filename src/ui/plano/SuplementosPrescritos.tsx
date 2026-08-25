import { useTranslation } from 'react-i18next'
import type { FormulaPrescrita, MomentoDaDose } from '../../domain/plano/prescricaoCompleta'
import { formatarMedida } from '../comum/formatarMedida'

/**
 * Os suplementos como o profissional os agrupou, fórmula por fórmula.
 *
 * Este é o único lugar do app onde a fórmula aparece. No dia, o suplemento é
 * dissolvido dentro da refeição a que pertence, porque de manhã o que importa é
 * o que tomar agora. Aqui o aluno está consultando, e o agrupamento é o
 * raciocínio clínico de quem prescreveu — "Sono", "Colesterol" — que uma lista
 * achatada de doze frascos perderia.
 */
export function SuplementosPrescritos({ formulas }: { formulas: readonly FormulaPrescrita[] }) {
  const { t } = useTranslation()
  if (formulas.length === 0) return null

  return (
    <section className="prescricao" aria-labelledby="plano-suplementos">
      <h2 className="prescricao__titulo" id="plano-suplementos">
        {t('plano.suplementosTitulo')}
      </h2>

      {formulas.map((formula) => (
        <section key={formula.nome} className="formula">
          <h3 className="formula__nome">{formula.nome}</h3>

          <ul className="formula__itens">
            {formula.itens.map(({ suplemento, momento }) => (
              <li key={suplemento.id} className="formula__item">
                <span className="formula__suplemento">{suplemento.nome}</span>{' '}
                <span className="formula__dose">
                  {formatarMedida(suplemento.dose.quantidade, suplemento.dose.unidade, t)}
                </span>
                <span className="formula__posologia">
                  {rotuloDoMomento(momento, t)} ·{' '}
                  {t('plano.vezesPorDia', { count: suplemento.posologia.vezesPorDia })}
                  {suplemento.posologia.duracaoDias !== undefined &&
                    ` · ${t('plano.duracaoDias', { count: suplemento.posologia.duracaoDias })}`}
                </span>
                {suplemento.posologia.observacao && (
                  <span className="formula__observacao">{suplemento.posologia.observacao}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  )
}

function rotuloDoMomento(
  momento: MomentoDaDose,
  t: ReturnType<typeof useTranslation>['t']
): string {
  switch (momento.tipo) {
    case 'apos-refeicao':
      return t('plano.doseAposRefeicao', {
        numero: momento.refeicao.numero,
        refeicao: momento.refeicao.nome ?? t('hoje.refeicao', { numero: momento.refeicao.numero }),
      })
    case 'antes-do-treino':
      return t('plano.doseAntesDoTreino')
    case 'livre':
      return t('plano.doseLivre')
  }
}
