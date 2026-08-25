import { useTranslation } from 'react-i18next'
import type { Macros, Refeicao } from '../../domain/schema/arquivoDePlano'
import { formatarMedida } from '../comum/formatarMedida'

/**
 * O protocolo alimentar inteiro, refeição por refeição.
 *
 * Aqui a refeição é **leitura**, não escolha: em Hoje, tocar numa alternativa
 * registra o consumo, e por isso ela é um botão. Nesta tela as mesmas
 * alternativas são texto — a prescrição é do profissional, e consultar o plano
 * não é comer (princípio 5).
 */
export function DietaPrescrita({
  refeicoes,
  macrosAlvoDiario,
  hidratacaoDiariaLitros,
  vegetaisSugeridos,
}: {
  refeicoes: readonly Refeicao[]
  macrosAlvoDiario: Macros
  hidratacaoDiariaLitros: number
  vegetaisSugeridos: readonly string[]
}) {
  const { t } = useTranslation()

  return (
    <section className="prescricao" aria-labelledby="plano-dieta">
      <h2 className="prescricao__titulo" id="plano-dieta">
        {t('plano.dietaTitulo')}
      </h2>

      {/* O alvo do dia vem antes das refeições porque é contra ele que a
          prescrição foi montada: as porções existem para somar nisto. */}
      <p className="prescricao__linha">
        {t('plano.alvoDoDia', {
          proteina: emPtBr(macrosAlvoDiario.proteinaG),
          carboidrato: emPtBr(macrosAlvoDiario.carboidratoG),
          gordura: emPtBr(macrosAlvoDiario.gorduraG),
        })}
      </p>
      <p className="prescricao__linha">
        {t('plano.agua', { litros: emPtBr(hidratacaoDiariaLitros) })}
      </p>

      {refeicoes.map((refeicao) => (
        <details key={refeicao.numero} className="refeicaoPlano">
          <summary className="refeicaoPlano__resumo">
            <span className="refeicaoPlano__nome">
              {refeicao.nome ?? t('hoje.refeicao', { numero: refeicao.numero })}
            </span>
            <span className="refeicaoPlano__detalhe">
              {t('plano.itens', { count: refeicao.itens.length })}
            </span>
          </summary>

          <ol className="refeicaoPlano__itens">
            {refeicao.itens.map((item) => (
              <li key={item.id} className="refeicaoPlano__item">
                {/* Os macros valem para qualquer alternativa: o profissional
                    escolheu as quantidades para que fossem equivalentes. */}
                <span className="refeicaoPlano__macros">
                  {t('refeicao.macrosDoItem', {
                    proteina: emPtBr(item.macros.proteinaG),
                    carboidrato: emPtBr(item.macros.carboidratoG),
                    gordura: emPtBr(item.macros.gorduraG),
                  })}
                </span>

                <ul className="refeicaoPlano__opcoes">
                  {item.opcoes.map((opcao, indice) => (
                    <li key={opcao.alimento} className="refeicaoPlano__opcao">
                      {/* Sem o "ou" visível, a lista se lê como coisas a comer
                          todas — o oposto do que foi prescrito. */}
                      {indice > 0 && <span className="refeicaoPlano__ou">{t('refeicao.ou')}</span>}
                      <span className="refeicaoPlano__alimento">{opcao.alimento}</span>{' '}
                      <span className="refeicaoPlano__quantidade">
                        {formatarMedida(opcao.quantidade, opcao.unidade, t)}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </details>
      ))}

      {vegetaisSugeridos.length > 0 && (
        <p className="prescricao__linha">
          {t('plano.vegetais', { lista: vegetaisSugeridos.join(' · ') })}
        </p>
      )}
    </section>
  )
}

/** `2.5` vira `2,5`: quem lê a tela lê em português. */
function emPtBr(valor: number): string {
  return valor.toLocaleString('pt-BR')
}
