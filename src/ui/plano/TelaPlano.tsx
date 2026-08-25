import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { prescricaoCompleta } from '../../domain/plano/prescricaoCompleta'
import { resumoDoPlano } from '../../domain/plano/resumoDoPlano'
import { useVault } from '../estado/vaultStore'
import { DietaPrescrita } from './DietaPrescrita'
import { ErroDeImport } from './ErroDeImport'
import { SemanaPrescrita } from './SemanaPrescrita'
import { SuplementosPrescritos } from './SuplementosPrescritos'
import { TreinosPrescritos } from './TreinosPrescritos'

/**
 * A prescrição inteira, read-only, e o import que a trouxe.
 *
 * É a exceção deliberada ao princípio 1 ("um momento por vez, nunca o documento
 * inteiro"): o aluno chega aqui em modo reflexivo, consultando — e é o único
 * lugar do app onde a estrutura da planilha é a estrutura certa. Por isso a
 * semana fica à vista e o resto atrás de um toque: a exceção é ver o plano
 * todo, não ter que rolar por ele.
 *
 * Nada aqui é editável (princípio 5). Em Hoje, tocar numa alternativa registra
 * o consumo; aqui a mesma alternativa é texto.
 */
export function TelaPlano() {
  const { t } = useTranslation()
  const { arquivo, carregando, problemas, aviso, importar, exportar } = useVault()
  const entrada = useRef<HTMLInputElement>(null)
  const [exportando, setExportando] = useState(false)

  // Contar e somar é regra, não apresentação: a tela não conhece o formato do
  // arquivo, só o resumo que o domínio produz dele.
  const resumo = arquivo ? resumoDoPlano(arquivo) : null
  // Derivado do plano, nunca persistido (ADR 0006): é o mesmo arquivo lido de
  // outro ângulo, com as referências por id já resolvidas.
  const prescricao = useMemo(() => (arquivo ? prescricaoCompleta(arquivo) : null), [arquivo])

  async function aoEscolherArquivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const escolhido = evento.target.files?.[0]
    if (!escolhido) return
    await importar(await escolhido.text())
    // Permite reimportar o mesmo arquivo depois de corrigido: sem isso o
    // input não dispara change para um nome de arquivo repetido.
    evento.target.value = ''
  }

  async function aoExportar() {
    // O vault pode ter anos de histórico e o diálogo do sistema demora: o botão
    // precisa dizer que já ouviu o toque.
    setExportando(true)
    try {
      await exportar()
    } finally {
      setExportando(false)
    }
  }

  return (
    <section className="plano">
      <h1 className="plano__titulo">{t('plano.titulo')}</h1>

      {resumo && (
        <div className="plano__resumo">
          <p className="plano__prescritor">
            {t('plano.prescritoPor', { nome: resumo.prescritoPor.join(' · ') })}
          </p>
          <p className="plano__linha">{t('plano.emitidoEm', { data: resumo.emitidoEm })}</p>
          <p className="plano__linha">
            {t('plano.resumoTreino', {
              sessoes: resumo.sessoes,
              exercicios: resumo.exercicios,
              min: resumo.descansoPadrao.minSegundos,
              max: resumo.descansoPadrao.maxSegundos,
            })}
          </p>
          <p className="plano__linha">
            {t('plano.resumoNutricao', {
              refeicoes: resumo.refeicoes,
              litros: resumo.hidratacaoAlvoLitros,
            })}
          </p>
          <p className="plano__linha">
            {t('plano.resumoSuplementos', {
              suplementos: resumo.suplementos,
              formulas: resumo.formulas,
            })}
          </p>
        </div>
      )}

      {prescricao && (
        <>
          <SemanaPrescrita agenda={prescricao.agenda} />
          <TreinosPrescritos treinos={prescricao.treinos} />
          <DietaPrescrita
            refeicoes={prescricao.refeicoes}
            macrosAlvoDiario={prescricao.macrosAlvoDiario}
            hidratacaoDiariaLitros={prescricao.hidratacaoDiariaLitros}
            vegetaisSugeridos={prescricao.vegetaisSugeridos}
          />
          <SuplementosPrescritos formulas={prescricao.formulas} />
        </>
      )}

      {problemas && <ErroDeImport problemas={problemas} />}

      <input
        ref={entrada}
        type="file"
        accept="application/json,.json,.fitvault.json"
        className="plano__entrada"
        aria-label={t('plano.importar')}
        onChange={(e) => void aoEscolherArquivo(e)}
      />
      <div className="plano__arquivo">
        <button
          type="button"
          className="botao"
          disabled={carregando}
          onClick={() => entrada.current?.click()}
        >
          {carregando ? t('plano.importando') : arquivo ? t('plano.trocar') : t('plano.importar')}
        </button>

        {/* Sem plano importado não há vault a levar embora: o botão apareceria
            para entregar uma pasta vazia. */}
        {arquivo && (
          <button
            type="button"
            className="botao botao--discreto"
            disabled={exportando}
            onClick={() => void aoExportar()}
          >
            {exportando ? t('plano.exportando') : t('plano.exportar')}
          </button>
        )}
      </div>

      {aviso && (
        <p className="plano__aviso" role="status">
          {t(`plano.${aviso}`)}
        </p>
      )}

      <p className="plano__nota">{t('plano.seusDadosFicam')}</p>
    </section>
  )
}
