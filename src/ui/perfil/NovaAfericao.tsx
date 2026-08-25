import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CIRCUNFERENCIAS,
  type Circunferencia,
  type Medida,
  type ValoresAferidos,
} from '../../domain/aluno/medida'

type Campos = {
  pesoKg: string
  percentualGordura: string
  circunferenciasCm: Partial<Record<Circunferencia, string>>
}

const VAZIO: Campos = { pesoKg: '', percentualGordura: '', circunferenciasCm: {} }

/**
 * A aferição de hoje.
 *
 * **Vem pré-preenchida com a última**, pelo mesmo motivo da carga na academia:
 * quem se pesa de novo confirma ou ajusta um número que já está na tela
 * (princípio 2). Um campo em branco obrigaria a lembrar o valor anterior, que é
 * exatamente o que o app existe para não exigir.
 *
 * A fita métrica fica atrás de um toque: o peso é o número de toda aferição, as
 * circunferências são de quem tem fita na gaveta. Quem mediu da última vez
 * encontra a seção já aberta.
 *
 * Quem monta este formulário o remonta (`key`) quando a última aferição muda,
 * em vez de sincronizar os campos por efeito: o padrão é o estado inicial do
 * formulário, e efeito que escreve estado no meio da renderização é justamente
 * o que produz o campo que "volta sozinho" enquanto o aluno digita.
 */
export function NovaAfericao({
  ultima,
  jaMedidoHoje,
  onRegistrar,
}: {
  ultima: Medida | null
  jaMedidoHoje: boolean
  onRegistrar: (valores: ValoresAferidos) => Promise<void>
}) {
  const { t } = useTranslation()
  const [campos, setCampos] = useState<Campos>(() => camposDe(ultima))
  const [mostrarFita, setMostrarFita] = useState(ultima?.circunferenciasCm !== undefined)

  const valores = interpretar(campos)
  const vazia = valores === null

  async function registrar(evento: React.FormEvent) {
    evento.preventDefault()
    if (!valores) return
    await onRegistrar(valores)
  }

  function ajustar(parte: Circunferencia, valor: string) {
    setCampos((atual) => ({
      ...atual,
      circunferenciasCm: { ...atual.circunferenciasCm, [parte]: valor },
    }))
  }

  return (
    <form className="afericao" onSubmit={(e) => void registrar(e)}>
      <h2 className="afericao__titulo">{t('perfil.afericao')}</h2>

      <div className="afericao__campos">
        <Numero
          rotulo={t('perfil.peso')}
          valor={campos.pesoKg}
          passo="0.1"
          onMudar={(pesoKg) => setCampos((atual) => ({ ...atual, pesoKg }))}
        />
        <Numero
          rotulo={t('perfil.gordura')}
          valor={campos.percentualGordura}
          passo="0.1"
          onMudar={(percentualGordura) => setCampos((atual) => ({ ...atual, percentualGordura }))}
        />
      </div>

      <button
        type="button"
        className="botao botao--discreto"
        aria-expanded={mostrarFita}
        onClick={() => setMostrarFita((aberta) => !aberta)}
      >
        {t('perfil.fita')}
      </button>

      {mostrarFita && (
        <div className="afericao__campos">
          {CIRCUNFERENCIAS.map((parte) => (
            <Numero
              key={parte}
              rotulo={t('perfil.circunferencia', { parte: t(`corpo.${parte}`) })}
              valor={campos.circunferenciasCm[parte] ?? ''}
              passo="0.5"
              onMudar={(valor) => ajustar(parte, valor)}
            />
          ))}
        </div>
      )}

      <button type="submit" className="botao" disabled={vazia}>
        {jaMedidoHoje ? t('perfil.atualizar') : t('perfil.registrar')}
      </button>
    </form>
  )
}

function Numero({
  rotulo,
  valor,
  passo,
  onMudar,
}: {
  rotulo: string
  valor: string
  passo: string
  onMudar: (valor: string) => void
}) {
  return (
    <label className="campo">
      <span className="campo__rotulo">{rotulo}</span>
      <input
        className="campo__entrada"
        type="number"
        inputMode="decimal"
        step={passo}
        min="0"
        value={valor}
        onChange={(e) => onMudar(e.target.value)}
      />
    </label>
  )
}

/** A última aferição vira o padrão da próxima — inclusive a fita métrica. */
function camposDe(medida: Medida | null): Campos {
  if (!medida) return VAZIO

  return {
    pesoKg: texto(medida.pesoKg),
    percentualGordura: texto(medida.percentualGordura),
    circunferenciasCm: Object.fromEntries(
      Object.entries(medida.circunferenciasCm ?? {}).map(([parte, valor]) => [parte, texto(valor)])
    ),
  }
}

function texto(valor: number | undefined): string {
  return valor === undefined ? '' : `${valor}`
}

/**
 * O que o aluno digitou, pronto para o domínio — ou `null` se ele não digitou
 * nada. Campo em branco é ausência, não zero: não medir a cintura é diferente
 * de medir zero centímetros.
 */
function interpretar(campos: Campos): ValoresAferidos | null {
  const valores: ValoresAferidos = {}

  const pesoKg = numero(campos.pesoKg)
  if (pesoKg !== undefined) valores.pesoKg = pesoKg

  const percentualGordura = numero(campos.percentualGordura)
  if (percentualGordura !== undefined) valores.percentualGordura = percentualGordura

  const circunferencias: Partial<Record<Circunferencia, number>> = {}
  for (const [parte, texto] of Object.entries(campos.circunferenciasCm)) {
    const valor = numero(texto ?? '')
    if (valor !== undefined) circunferencias[parte as Circunferencia] = valor
  }
  if (Object.keys(circunferencias).length > 0) valores.circunferenciasCm = circunferencias

  return Object.keys(valores).length === 0 ? null : valores
}

function numero(valor: string): number | undefined {
  if (valor.trim() === '') return undefined
  const convertido = Number(valor)
  return Number.isFinite(convertido) ? convertido : undefined
}
