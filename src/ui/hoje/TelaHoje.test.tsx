import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import '../../infrastructure/i18n'
import { lerArquivoDePlano } from '../../domain/schema/arquivoDePlano'
import { InMemoryVaultStorage } from '../../infrastructure/armazenamento/InMemoryVaultStorage'
import planoValido from '../../test/fixtures/plano-valido.json'
import { usarVault, useVault } from '../estado/vaultStore'
import { TelaHoje } from './TelaHoje'

/** O estado vazio leva ao Plano por um link; sem roteador, ele nem renderiza. */
function renderizar(hoje: string) {
  return render(
    <MemoryRouter>
      <TelaHoje hoje={hoje} />
    </MemoryRouter>
  )
}

const SEGUNDA = '2026-08-24'
const QUINTA = '2026-08-27'
const SABADO = '2026-08-29'

function comPlano() {
  useVault.setState({
    arquivo: lerArquivoDePlano(planoValido),
    carregando: false,
    problemas: null,
  })
}

/** A ordem visual é o produto: o dia só faz sentido em sequência. */
function ordemVisivel() {
  return screen
    .getAllByRole('listitem')
    .filter((li) => li.classList.contains('linha__item'))
    .map((li) => li.querySelector('.linha__titulo')?.textContent ?? '')
}

describe('TelaHoje', () => {
  beforeEach(() => {
    usarVault(new InMemoryVaultStorage())
    useVault.setState({ arquivo: null, carregando: false, problemas: null })
  })

  it('sem plano, convida a importar em vez de mostrar um dia vazio', () => {
    renderizar(SEGUNDA)
    expect(screen.getByRole('heading', { name: 'Nenhum plano ainda' })).toBeInTheDocument()
  })

  describe('a linha do tempo cruza as três abas da planilha', () => {
    beforeEach(comPlano)

    it('mostra o dia da semana, não uma data crua', () => {
      renderizar(SEGUNDA)
      expect(screen.getByRole('heading', { name: 'Segunda-feira' })).toBeInTheDocument()
    })

    it('põe o suplemento dentro da refeição, não como cartão ao lado', () => {
      renderizar(SEGUNDA)

      // Este é o produto: na planilha o aluno teria que cruzar a aba de
      // suplementos com a de nutrição para saber o que tomar depois do café.
      // E tomar o magnésio é parte de tomar café, não um compromisso à parte.
      const cafe = screen.getByText('Café da manhã').closest('li')!
      expect(within(cafe).getByText('Magnésio dimalato')).toBeInTheDocument()
      expect(within(cafe).getByText('Ômega 3')).toBeInTheDocument()

      expect(ordemVisivel()).toEqual([
        'Café da manhã',
        'Treino A · Superior',
        'Lanche da manhã',
        'Almoço',
      ])
    })

    it('põe o pré-treino dentro do bloco de treino', () => {
      renderizar(SEGUNDA)
      const treino = screen.getByText('Treino A').closest('li')!
      expect(within(treino).getByText('Pré-treino')).toBeInTheDocument()
    })

    it('mostra o treino de hoje, com exercícios e prescrição legível', () => {
      renderizar(SEGUNDA)
      const treino = screen.getByText('Treino A').closest('li')!
      expect(within(treino).getByText('Puxada Frontal Pronada')).toBeInTheDocument()
      expect(within(treino).getAllByText(/4 × 10–12/).length).toBe(2)
    })

    it('mostra tempo sob tensão como tempo, não como repetições', () => {
      renderizar(SEGUNDA)
      const treino = screen.getByText('Treino A').closest('li')!
      expect(within(treino).getAllByText(/2 × 60''/).length).toBeGreaterThan(0)
    })

    it('mostra a carga alvo quando o profissional prescreveu', () => {
      renderizar(SEGUNDA)
      expect(screen.getByText(/30 kg/)).toBeInTheDocument()
    })

    it('mantém a observação do profissional visível junto do exercício', () => {
      renderizar(SEGUNDA)
      expect(screen.getByText('Corpo totalmente em 90 graus')).toBeInTheDocument()
      // É o que distingue as duas pranchas laterais.
      expect(screen.getByText('Lado direito')).toBeInTheDocument()
      expect(screen.getByText('Lado esquerdo')).toBeInTheDocument()
    })

    it('escreve a unidade como gente lê, não como o schema a identifica', () => {
      renderizar(SEGUNDA)
      // "4 capsula" é o código vazando para a tela.
      expect(screen.getByText('4 cápsulas')).toBeInTheDocument()
      expect(screen.getByText('2 scoops')).toBeInTheDocument()
      expect(screen.getByText('200 mg')).toBeInTheDocument()
      expect(screen.getByText('5 g')).toBeInTheDocument()
    })

    it('mostra o aeróbico dentro do treino — é a mesma ida à academia', () => {
      renderizar(SEGUNDA)
      const treino = screen.getByText('Treino A').closest('li')!
      expect(within(treino).getByText(/HIIT na esteira · 20 min/)).toBeInTheDocument()
    })

    it('mas o aeróbico sozinho ganha cartão próprio — senão sumiria do dia', () => {
      renderizar(SABADO)
      expect(ordemVisivel()).toContain('Aeróbico')
      const aerobico = screen.getByText('Aeróbico').closest('li')!
      expect(within(aerobico).getByText(/HIIT na esteira · 20 min/)).toBeInTheDocument()
    })
  })

  describe('dia de descanso', () => {
    beforeEach(comPlano)

    it('tem estado próprio, não uma lista sem treino', () => {
      renderizar(QUINTA)
      expect(screen.getByRole('heading', { name: 'Hoje é dia de descanso' })).toBeInTheDocument()
    })

    it('continua mostrando as refeições — comer não descansa', () => {
      renderizar(QUINTA)
      expect(screen.getByText('Café da manhã')).toBeInTheDocument()
      expect(screen.getByText('Almoço')).toBeInTheDocument()
    })

    it('não lembra do pré-treino num dia sem treino', () => {
      renderizar(QUINTA)
      expect(screen.queryByText('Suplementos · antes do treino')).not.toBeInTheDocument()
    })
  })

  describe('contador de água', () => {
    beforeEach(comPlano)

    it('mostra o alvo que o profissional prescreveu', () => {
      renderizar(SEGUNDA)
      expect(screen.getByText('0 de 4 L')).toBeInTheDocument()
    })

    it('conta um copo por toque', async () => {
      renderizar(SEGUNDA)
      const botao = screen.getByRole('button', { name: 'Registrar mais um copo de água' })

      await userEvent.click(botao)
      expect(screen.getByText('0,25 de 4 L')).toBeInTheDocument()

      await userEvent.click(botao)
      expect(screen.getByText('0,5 de 4 L')).toBeInTheDocument()
    })

    it('não passa do alvo — encher além não é progresso', async () => {
      renderizar(SEGUNDA)
      const botao = screen.getByRole('button', { name: 'Registrar mais um copo de água' })
      for (let i = 0; i < 20; i++) await userEvent.click(botao)
      expect(screen.getByText('4 de 4 L')).toBeInTheDocument()
    })

    it('expõe o progresso para leitor de tela', () => {
      renderizar(SEGUNDA)
      const barra = screen.getByRole('progressbar')
      expect(barra).toHaveAttribute('aria-valuemax', '4')
      expect(barra).toHaveAttribute('aria-valuenow', '0')
    })
  })

  it('não deixa chave de tradução vazar para a tela', () => {
    comPlano()
    renderizar(SEGUNDA)
    expect(document.body.textContent).not.toMatch(/hoje\.|navegacao\.|refeicaoItens/)
  })
})
