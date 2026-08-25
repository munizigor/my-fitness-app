import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { hojeLocal } from '../../domain/dia/dataLocal'
import { montarDia } from '../../domain/dia/montarDia'
import { EstadoSemPlano } from '../comum/EstadoSemPlano'
import { useRegistro } from '../estado/registroStore'
import { useVault } from '../estado/vaultStore'
import { ContadorDeAgua } from './ContadorDeAgua'
import { ItemDaLinhaDoTempo } from './ItemDaLinhaDoTempo'

/**
 * A tela inicial: o dia, não o plano.
 *
 * A planilha do profissional tem três abas e cabe ao aluno cruzá-las de cabeça
 * às sete da manhã. Aqui a linha do tempo já vem cruzada — o treino de hoje sai
 * da agenda semanal, e cada suplemento aparece grudado na refeição ou no treino
 * a que sua posologia pertence.
 */
export function TelaHoje({ hoje = hojeLocal() }: { hoje?: string }) {
  const { t } = useTranslation()
  const arquivo = useVault((e) => e.arquivo)
  const { hoje: registro, carregar, registrarAgua } = useRegistro()

  useEffect(() => {
    void carregar(hoje)
  }, [carregar, hoje])

  // O dia é derivado, nunca persistido (ADR 0006). Memorizar evita recalcular a
  // cada render sem gravar nada.
  const dia = useMemo(() => (arquivo ? montarDia(arquivo.plano, hoje) : null), [arquivo, hoje])

  if (!dia) return <EstadoSemPlano />

  return (
    <section className="hoje">
      <header className="hoje__cabecalho">
        <h1 className="hoje__dia">{t(`hoje.diaDaSemana.${dia.diaDaSemana}`)}</h1>
        <ContadorDeAgua
          alvoLitros={dia.hidratacaoDiariaLitros}
          consumidoLitros={registro?.aguaLitros ?? 0}
          onAjustar={(litros) => void registrarAgua(hoje, litros)}
        />
      </header>

      {dia.descanso && (
        <div className="descanso">
          <h2 className="descanso__titulo">{t('hoje.descansoTitulo')}</h2>
          <p className="descanso__descricao">{t('hoje.descansoDescricao')}</p>
        </div>
      )}

      <ol className="linha">
        {dia.itens.map((item) => (
          <ItemDaLinhaDoTempo key={item.id} item={item} />
        ))}
      </ol>
    </section>
  )
}
