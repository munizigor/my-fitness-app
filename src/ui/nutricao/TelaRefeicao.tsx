import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { hojeLocal } from '../../domain/dia/dataLocal'
import { montarDia } from '../../domain/dia/montarDia'
import { macrosDoDia } from '../../domain/nutricao/macrosDoDia'
import type { ItemDeRefeicao, Macros } from '../../domain/schema/arquivoDePlano'
import { EstadoSemPlano } from '../comum/EstadoSemPlano'
import { formatarMedida } from '../comum/formatarMedida'
import { useRegistro } from '../estado/registroStore'
import { useVault } from '../estado/vaultStore'

/**
 * Uma refeição, item por item.
 *
 * Na planilha, um item era uma célula com "Pão integral 2 fatias OU Cuscuz 130g
 * OU Pão francês 1 un" — o aluno tinha que decifrar a notação toda vez. Aqui
 * cada alternativa é um alvo de toque, e **escolher é registrar**: são o mesmo
 * gesto. Pedir "qual das opções" e depois "você comeu?" cobraria duas decisões
 * onde existe uma, e o dobro de atrito mata o registro na segunda semana.
 *
 * Os macros do item aparecem uma vez só, acima das alternativas, porque valem
 * para qualquer uma delas: o profissional escolheu as quantidades justamente
 * para que fossem equivalentes.
 */
export function TelaRefeicao({ hoje = hojeLocal() }: { hoje?: string }) {
  const { t } = useTranslation()
  const navegar = useNavigate()
  const { refeicaoId } = useParams()
  const arquivo = useVault((e) => e.arquivo)
  const { hoje: registro, carregar, registrarConsumo } = useRegistro()

  useEffect(() => {
    void carregar(hoje)
  }, [carregar, hoje])

  const dia = useMemo(() => (arquivo ? montarDia(arquivo.plano, hoje) : null), [arquivo, hoje])

  if (!dia) return <EstadoSemPlano />

  const item = dia.itens.find((i) => i.tipo === 'refeicao' && i.refeicaoId === refeicaoId)

  // Link antigo, plano trocado, URL digitada à mão: voltar para o dia é melhor
  // que uma tela de erro para algo que o aluno não pode consertar.
  if (item?.tipo !== 'refeicao') return <Navigate to="/hoje" replace />

  const { refeicao } = item
  const alvo = item.refeicaoId
  const escolhidos = registro?.refeicoes.find((r) => r.refeicaoId === alvo)?.itens ?? []
  const macros = macrosDoDia(dia, registro)

  function alternar(itemDeRefeicaoId: string, alimento: string) {
    const jaEstava = escolhidos.some(
      (e) => e.itemDeRefeicaoId === itemDeRefeicaoId && e.alimento === alimento
    )
    void registrarConsumo(hoje, {
      refeicaoId: alvo,
      itemDeRefeicaoId,
      // Tocar de novo na mesma desmarca: é como se desfaz um engano.
      alimento: jaEstava ? null : alimento,
    })
  }

  return (
    <section className="refeicao">
      <header className="refeicao__cabecalho">
        <button
          type="button"
          className="refeicao__sair"
          onClick={() => void navegar('/hoje')}
          aria-label={t('refeicao.sair')}
        >
          ←
        </button>
        <h1 className="refeicao__titulo">
          {refeicao.nome ?? t('hoje.refeicao', { numero: refeicao.numero })}
        </h1>
      </header>

      <ol className="itens">
        {refeicao.itens.map((doPlano) => (
          <ItemComAlternativas
            key={doPlano.id}
            item={doPlano}
            escolhido={escolhidos.find((e) => e.itemDeRefeicaoId === doPlano.id)?.alimento}
            onEscolher={(alimento) => alternar(doPlano.id, alimento)}
          />
        ))}
      </ol>

      {/* O total do dia inteiro, e não o desta refeição: é a pergunta que o
          aluno faz de verdade — "quanto ainda falta hoje?". */}
      <TotalDoDia consumido={macros.consumido} alvo={macros.alvo} />
    </section>
  )
}

function ItemComAlternativas({
  item,
  escolhido,
  onEscolher,
}: {
  item: ItemDeRefeicao
  escolhido: string | undefined
  onEscolher: (alimento: string) => void
}) {
  const { t } = useTranslation()

  return (
    <li className={`item ${escolhido ? 'item--comido' : ''}`}>
      <span className="item__macros">
        {t('refeicao.macrosDoItem', {
          proteina: formatarGramas(item.macros.proteinaG),
          carboidrato: formatarGramas(item.macros.carboidratoG),
          gordura: formatarGramas(item.macros.gorduraG),
        })}
      </span>

      <ul className="opcoes">
        {item.opcoes.map((opcao, indice) => (
          <li key={opcao.alimento} className="opcoes__item">
            {/* O "ou" fica visível: sem ele a lista se lê como coisas a comer
                todas, que é o oposto do que o profissional prescreveu. */}
            {indice > 0 && <span className="opcoes__ou">{t('refeicao.ou')}</span>}
            <button
              type="button"
              className="opcao"
              aria-pressed={escolhido === opcao.alimento}
              onClick={() => onEscolher(opcao.alimento)}
            >
              <span className="opcao__alimento">{opcao.alimento}</span>
              <span className="opcao__quantidade">
                {formatarMedida(opcao.quantidade, opcao.unidade, t)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </li>
  )
}

/** Números, não gráfico: o gráfico é da tela de Evolução (princípio 4). */
function TotalDoDia({ consumido, alvo }: { consumido: Macros; alvo: Macros }) {
  const { t } = useTranslation()

  const linhas = [
    { chave: 'proteina', consumido: consumido.proteinaG, alvo: alvo.proteinaG },
    { chave: 'carboidrato', consumido: consumido.carboidratoG, alvo: alvo.carboidratoG },
    { chave: 'gordura', consumido: consumido.gorduraG, alvo: alvo.gorduraG },
  ] as const

  return (
    <section className="total" aria-label={t('refeicao.totalDoDia')}>
      <h2 className="total__titulo">{t('refeicao.totalDoDia')}</h2>
      <dl className="total__lista">
        {linhas.map(({ chave, consumido: c, alvo: a }) => (
          <div key={chave} className="total__linha">
            <dt>{t(`refeicao.${chave}`)}</dt>
            <dd>
              {t('refeicao.consumidoDeAlvo', {
                consumido: formatarGramas(c),
                alvo: formatarGramas(a),
              })}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/** `2.5` vira `2,5`: quem lê a tela lê em português. */
function formatarGramas(valor: number): string {
  return valor.toLocaleString('pt-BR')
}
