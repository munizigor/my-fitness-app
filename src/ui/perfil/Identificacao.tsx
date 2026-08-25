import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PerfilInvalidoError } from '../../domain/errors/PerfilInvalidoError'
import type { Perfil } from '../../domain/aluno/perfil'

/**
 * Quem é o aluno, em uma linha — e o formulário só quando ele pede.
 *
 * Perfil não é destino diário: o aluno vem aqui para ver o histórico, não para
 * conferir a própria altura. Deixar três campos abertos na entrada da tela faria
 * competir por atenção algo que muda uma vez por ano (princípio 1).
 *
 * É o **único** dado vindo do arquivo do profissional que o aluno pode alterar,
 * e não é prescrição: o plano pode ter sido emitido meses antes, e idade muda.
 */
export function Identificacao({
  perfil,
  onSalvar,
}: {
  perfil: Perfil
  onSalvar: (valores: unknown) => Promise<void>
}) {
  const { t } = useTranslation()
  const [editando, setEditando] = useState(false)

  if (!editando) {
    return (
      <header className="perfil__identificacao">
        <h1 className="perfil__titulo">{t('perfil.titulo')}</h1>
        <p className="perfil__pessoa">
          {t('perfil.identificacao', {
            nome: perfil.nome,
            idade: perfil.idade,
            altura: perfil.alturaMetros.toLocaleString('pt-BR'),
          })}
        </p>
        <button type="button" className="botao botao--discreto" onClick={() => setEditando(true)}>
          {t('perfil.corrigir')}
        </button>
      </header>
    )
  }

  return (
    <FormularioDePerfil perfil={perfil} onSalvar={onSalvar} onSair={() => setEditando(false)} />
  )
}

function FormularioDePerfil({
  perfil,
  onSalvar,
  onSair,
}: {
  perfil: Perfil
  onSalvar: (valores: unknown) => Promise<void>
  onSair: () => void
}) {
  const { t } = useTranslation()
  const [nome, setNome] = useState(perfil.nome)
  const [idade, setIdade] = useState(`${perfil.idade}`)
  const [altura, setAltura] = useState(`${perfil.alturaMetros}`)
  const [recusado, setRecusado] = useState(false)

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault()
    try {
      await onSalvar({ nome, idade: Number(idade), alturaMetros: Number(altura) })
      onSair()
    } catch (erro) {
      // O domínio recusa altura em centímetros e idade impossível. A tela não
      // repete essas regras — mostra que a correção não passou e mantém o que
      // o aluno digitou, para ele consertar em vez de recomeçar.
      if (!(erro instanceof PerfilInvalidoError)) throw erro
      setRecusado(true)
    }
  }

  return (
    <form className="perfil__form" onSubmit={(e) => void salvar(e)}>
      <h1 className="perfil__titulo">{t('perfil.titulo')}</h1>

      <label className="campo">
        <span className="campo__rotulo">{t('perfil.nome')}</span>
        <input
          className="campo__entrada"
          value={nome}
          autoComplete="name"
          onChange={(e) => setNome(e.target.value)}
        />
      </label>

      <label className="campo">
        <span className="campo__rotulo">{t('perfil.idade')}</span>
        <input
          className="campo__entrada"
          type="number"
          inputMode="numeric"
          value={idade}
          onChange={(e) => setIdade(e.target.value)}
        />
      </label>

      <label className="campo">
        <span className="campo__rotulo">{t('perfil.altura')}</span>
        <input
          className="campo__entrada"
          type="number"
          inputMode="decimal"
          step="0.01"
          value={altura}
          onChange={(e) => setAltura(e.target.value)}
        />
      </label>

      {recusado && <p className="perfil__recusa">{t('perfil.naoDeuParaSalvar')}</p>}

      <div className="perfil__acoes">
        <button type="submit" className="botao">
          {t('perfil.salvar')}
        </button>
        <button type="button" className="botao botao--discreto" onClick={onSair}>
          {t('perfil.cancelar')}
        </button>
      </div>
    </form>
  )
}
