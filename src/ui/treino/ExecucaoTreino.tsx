import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { hojeLocal } from '../../domain/dia/dataLocal'
import { montarDia, type ExercicioNoDia } from '../../domain/dia/montarDia'
import { sugerirCarga } from '../../domain/treino/sugerirCarga'
import { EstadoSemPlano } from '../comum/EstadoSemPlano'
import { useTreino } from '../estado/treinoStore'
import { useVault } from '../estado/vaultStore'
import { CronometroDeDescanso } from './CronometroDeDescanso'
import { LinhaDeSerie } from './LinhaDeSerie'
import { useCronometro } from './useCronometro'

/**
 * O modo execução: a tela que decide o produto.
 *
 * Restrições reais que moldaram cada decisão aqui: o aluno está de pé, com uma
 * mão livre, suando, com 60 segundos entre séries. Então **um exercício por
 * vez** (nunca a lista inteira), carga **já preenchida** com a última que ele
 * levantou, e o cronômetro **disparando sozinho** ao concluir a série.
 */
export function ExecucaoTreino({ hoje = hojeLocal() }: { hoje?: string }) {
  const { t } = useTranslation()
  const navegar = useNavigate()
  const arquivo = useVault((e) => e.arquivo)
  const { historico, hoje: registroDeHoje, carregando, carregar, registrar } = useTreino()
  const cronometro = useCronometro()
  const [indiceExercicio, setIndice] = useState(0)

  useEffect(() => {
    void carregar(hoje)
  }, [carregar, hoje])

  const treino = useMemo(() => {
    if (!arquivo) return null
    return montarDia(arquivo.plano, hoje).itens.find((i) => i.tipo === 'treino') ?? null
  }, [arquivo, hoje])

  if (!arquivo) return <EstadoSemPlano />

  if (!treino || treino.tipo !== 'treino') {
    return (
      <section className="vazio">
        <h1 className="vazio__titulo">{t('execucao.semTreinoTitulo')}</h1>
        <p className="vazio__descricao">{t('execucao.semTreinoDescricao')}</p>
        <Link to="/hoje" className="botao">
          {t('execucao.voltarParaHoje')}
        </Link>
      </section>
    )
  }

  const atual = treino.exercicios[indiceExercicio]
  if (!atual) return null

  const feitasDoAtual = (registroDeHoje?.series ?? []).filter(
    (s) => s.itemDeTreinoId === atual.prescrito.id
  )
  const ultimo = indiceExercicio === treino.exercicios.length - 1

  async function concluirSerie(indice: number, cargaKg?: number, repeticoes?: number) {
    const item = atual!
    await registrar(hoje, {
      itemDeTreinoId: item.prescrito.id,
      indice,
      ...(cargaKg !== undefined && { cargaKg }),
      ...(repeticoes !== undefined && { repeticoes }),
      ...(item.prescrito.execucao.tipo === 'tempo' && {
        segundos: item.prescrito.execucao.segundos,
      }),
    })
    // O descanso começa aqui, sem o aluno pedir. É o ponto do produto.
    cronometro.disparar()
  }

  return (
    <section className="execucao">
      <header className="execucao__cabecalho">
        <button
          type="button"
          className="execucao__sair"
          onClick={() => void navegar('/hoje')}
          aria-label={t('execucao.sair')}
        >
          ←
        </button>
        <span className="execucao__sessao">{treino.sessao.rotulo}</span>
        <span className="execucao__contagem">
          {indiceExercicio + 1}/{treino.exercicios.length}
        </span>
      </header>

      <h1 className="execucao__exercicio">{atual.exercicio.nome}</h1>
      <p className="execucao__prescricao">{descreverPrescricao(atual, t)}</p>

      {atual.prescrito.observacao && (
        <p className="execucao__observacao">{atual.prescrito.observacao}</p>
      )}

      {/* Só depois do histórico chegar: os campos são semeados na montagem, e
          semear com o valor errado para trocá-lo sob o dedo do aluno é pior que
          esperar um instante. */}
      {carregando ? (
        <p className="execucao__carregando">{t('execucao.carregando')}</p>
      ) : (
        <ol className="series">
          {Array.from({ length: atual.prescrito.series }, (_, i) => i + 1).map((indice) => (
            <LinhaDeSerie
              /* A contagem entra na chave para as séries ainda não feitas
               re-semearem com a carga que o aluno acabou de levantar. Sem isso,
               quem sobe de 60 para 80 na série 1 teria que corrigir as outras
               três à mão, entre séries, com uma mão só. */
              key={`${atual.prescrito.id}-${indice}-${feitasDoAtual.length}`}
              indice={indice}
              prescrito={atual.prescrito}
              registrada={feitasDoAtual.find((s) => s.indice === indice)}
              cargaSugerida={sugerirCarga(historico, atual.prescrito)}
              onConcluir={(carga, reps) => void concluirSerie(indice, carga, reps)}
            />
          ))}
        </ol>
      )}

      <nav className="execucao__navegacao">
        <button
          type="button"
          className="botao botao--discreto"
          disabled={indiceExercicio === 0}
          onClick={() => setIndice((i) => i - 1)}
        >
          {t('execucao.anterior')}
        </button>
        {ultimo ? (
          <Link to="/hoje" className="botao">
            {t('execucao.concluirTreino')}
          </Link>
        ) : (
          <button type="button" className="botao" onClick={() => setIndice((i) => i + 1)}>
            {t('execucao.proximo')}
          </button>
        )}
      </nav>

      {cronometro.rodando && cronometro.decorrido !== null && (
        <CronometroDeDescanso
          decorrido={cronometro.decorrido}
          descanso={treino.descansoEntreSeries}
          onDispensar={cronometro.parar}
        />
      )}
    </section>
  )
}

type Traduzir = ReturnType<typeof useTranslation>['t']

function descreverPrescricao({ prescrito }: ExercicioNoDia, t: Traduzir): string {
  const { series, execucao } = prescrito
  if (execucao.tipo === 'tempo') {
    return t('hoje.serieTempo', { series, segundos: execucao.segundos })
  }
  return execucao.min === execucao.max
    ? t('hoje.serieRepeticoesFixas', { series, repeticoes: execucao.min })
    : t('hoje.serieRepeticoes', { series, min: execucao.min, max: execucao.max })
}
