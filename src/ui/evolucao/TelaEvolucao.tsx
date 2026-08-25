import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { hojeLocal } from '../../domain/dia/dataLocal'
import { destaqueDeEvolucao, type Destaque } from '../../domain/progresso/destaque'
import { evolucaoCorporal, type DeltaCorporal } from '../../domain/progresso/evolucaoCorporal'
import {
  progressoPorExercicio,
  type ProgressoDeExercicio,
} from '../../domain/progresso/progressoDeExercicio'
import { EstadoSemPlano } from '../comum/EstadoSemPlano'
import { useAluno } from '../estado/alunoStore'
import { useRegistro } from '../estado/registroStore'
import { useVault } from '../estado/vaultStore'
import { formatarIntervalo, formatarValor } from './formatarVariacao'
import { LinhaDeVariacao } from './LinhaDeVariacao'

/**
 * Evolução: a tela que ataca a causa-raiz.
 *
 * O aluno abandona porque **não sente evolução** — e a planilha nunca teve como
 * mostrá-la, porque sobrescrevia o último número. Aqui o vault guarda a série
 * inteira, e esta tela responde a uma pergunta só: *eu evoluí?*
 *
 * Não é painel de gráficos. Primeiro a frase (princípio 4), depois a evidência
 * exercício por exercício, depois o corpo. Tudo derivado de plano + registros +
 * aferições, nada persistido (ADR 0006).
 */
export function TelaEvolucao({ hoje = hojeLocal() }: { hoje?: string }) {
  const { t } = useTranslation()
  const arquivo = useVault((e) => e.arquivo)
  const { historico, carregar } = useRegistro()
  const { medidas, carregar: carregarAluno } = useAluno()

  useEffect(() => {
    void carregar(hoje)
  }, [carregar, hoje])

  useEffect(() => {
    void carregarAluno()
  }, [carregarAluno])

  const progresso = useMemo(
    () => (arquivo ? progressoPorExercicio(arquivo.plano, historico) : []),
    [arquivo, historico]
  )
  const corporal = useMemo(() => evolucaoCorporal(medidas), [medidas])
  const destaque = useMemo(() => destaqueDeEvolucao(progresso, corporal), [progresso, corporal])

  if (!arquivo) return <EstadoSemPlano />

  return (
    <section className="evolucao">
      <h1 className="evolucao__titulo">{t('evolucao.titulo')}</h1>

      {destaque ? <Manchete destaque={destaque} /> : <AindaNao />}

      {progresso.length > 0 && <PorExercicio progresso={progresso} />}
      {corporal.length > 0 && <Corpo deltas={corporal} />}
    </section>
  )
}

/**
 * A frase, em `role="status"`: quem usa leitor de tela ouve a evidência sem
 * varrer a página atrás dela — é o mesmo motivo de ela vir antes de tudo para
 * quem enxerga.
 */
function Manchete({ destaque }: { destaque: Destaque }) {
  const { t } = useTranslation()
  const intervalo = formatarIntervalo(destaque.variacao.semanas, t)

  if (destaque.tipo === 'carga') {
    return (
      <p className="evolucao__manchete" role="status">
        {t('evolucao.destaqueCarga', {
          percentual: (destaque.variacao.percentual ?? 0).toLocaleString('pt-BR'),
          exercicio: destaque.nome,
          intervalo,
        })}
      </p>
    )
  }

  const { diferenca } = destaque.variacao
  return (
    <p className="evolucao__manchete" role="status">
      {t(diferenca < 0 ? 'evolucao.destaqueCorpoPerdeu' : 'evolucao.destaqueCorpoGanhou', {
        valor: formatarValor(Math.abs(diferenca), destaque.unidade, t),
        metrica: t(`evolucao.metrica.${destaque.metrica}`),
        intervalo,
      })}
    </p>
  )
}

/**
 * O que falta é registro, não gráfico. Dizer "0%" em letra grande seria fingir
 * uma evidência que ainda não existe.
 */
function AindaNao() {
  const { t } = useTranslation()
  return (
    <div className="evolucao__aindaNao">
      <h2 className="evolucao__aindaNaoTitulo">{t('evolucao.vazioTitulo')}</h2>
      <p className="evolucao__aindaNaoDescricao">{t('evolucao.vazioDescricao')}</p>
    </div>
  )
}

function PorExercicio({ progresso }: { progresso: readonly ProgressoDeExercicio[] }) {
  const { t } = useTranslation()

  return (
    <section className="evolucao__secao">
      <h2 className="evolucao__secaoTitulo" id="evolucao-treino">
        {t('evolucao.treinoTitulo')}
      </h2>
      <ul className="evolucao__lista" aria-labelledby="evolucao-treino">
        {progresso.map((exercicio) => (
          <li
            key={exercicio.exercicioId}
            className="evolucao__exercicio"
            aria-label={exercicio.nome}
          >
            <h3 className="evolucao__exercicioNome">{exercicio.nome}</h3>
            <span className="evolucao__sessoes">
              {t('evolucao.sessoes', { count: exercicio.sessoes.length })}
            </span>

            {exercicio.carga && (
              <LinhaDeVariacao
                rotulo={t('evolucao.carga')}
                variacao={exercicio.carga}
                unidade="kg"
              />
            )}
            {exercicio.volume && (
              <LinhaDeVariacao
                rotulo={t('evolucao.volume')}
                variacao={exercicio.volume}
                unidade="kg"
              />
            )}
            {/* Uma sessão só não é evolução — mas também não é nada: é onde ele
                começou, e ver isso registrado já é diferente da planilha. */}
            {!exercicio.carga && !exercicio.volume && (
              <p className="evolucao__partida">{t('evolucao.pontoDePartida')}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function Corpo({ deltas }: { deltas: readonly DeltaCorporal[] }) {
  const { t } = useTranslation()

  return (
    <section className="evolucao__secao">
      <h2 className="evolucao__secaoTitulo" id="evolucao-corpo">
        {t('evolucao.corpoTitulo')}
      </h2>
      <ul className="evolucao__lista" aria-labelledby="evolucao-corpo">
        {deltas.map((delta) => (
          <li key={delta.metrica} className="evolucao__corpo">
            <LinhaDeVariacao
              rotulo={t(`corpo.${delta.metrica}`)}
              variacao={delta.variacao}
              unidade={delta.unidade}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
