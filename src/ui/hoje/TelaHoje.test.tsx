import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import '../../infrastructure/i18n'
import { SCHEMA_VERSION_REGISTRO } from '../../domain/registro/migracoes'
import { lerArquivoDePlano } from '../../domain/schema/arquivoDePlano'
import { CAMINHOS } from '../../domain/vault/caminhos'
import { InMemoryVaultStorage } from '../../infrastructure/armazenamento/InMemoryVaultStorage'
import planoValido from '../../test/fixtures/plano-valido.json'
import { useRegistro } from '../estado/registroStore'
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
  let vault: InMemoryVaultStorage

  beforeEach(() => {
    vault = new InMemoryVaultStorage()
    usarVault(vault)
    useVault.setState({ arquivo: null, carregando: false, problemas: null })
    useRegistro.setState({ historico: [], hoje: null, carregando: true })
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

    it('a refeição leva ao detalhe, com o cartão inteiro como alvo de toque', () => {
      renderizar(SEGUNDA)
      const cafe = screen.getByText('Café da manhã').closest('a')!
      expect(cafe).toHaveAttribute('href', '/refeicao/1')
    })

    it('mostra quantos itens da refeição o aluno já escolheu', async () => {
      useRegistro.setState({
        carregando: false,
        hoje: {
          schemaVersion: SCHEMA_VERSION_REGISTRO,
          data: SEGUNDA,
          aguaLitros: 0,
          series: [],
          refeicoes: [
            {
              refeicaoId: '1',
              itens: [{ itemDeRefeicaoId: 'r1i1', alimento: 'Cuscuz' }],
              registradaEm: '2026-08-24T08:00:00.000Z',
            },
          ],
        },
      })
      renderizar(SEGUNDA)

      // Antes de escolher, "2 itens". Depois, o progresso do momento.
      expect(await screen.findByText('1 de 2 escolhidos')).toBeInTheDocument()
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

    const mais = () => screen.getByRole('button', { name: 'Registrar mais um copo de água' })
    const menos = () => screen.getByRole('button', { name: 'Tirar um copo de água' })

    it('mostra o alvo que o profissional prescreveu', async () => {
      renderizar(SEGUNDA)
      expect(await screen.findByText('0 de 4 L')).toBeInTheDocument()
    })

    it('conta um copo por toque', async () => {
      renderizar(SEGUNDA)

      await userEvent.click(mais())
      expect(await screen.findByText('0,25 de 4 L')).toBeInTheDocument()

      await userEvent.click(mais())
      expect(await screen.findByText('0,5 de 4 L')).toBeInTheDocument()
    })

    it('tira um copo por toque — dá para corrigir para menos', async () => {
      renderizar(SEGUNDA)
      await userEvent.click(mais())
      await userEvent.click(mais())
      expect(await screen.findByText('0,5 de 4 L')).toBeInTheDocument()

      await userEvent.click(menos())
      expect(await screen.findByText('0,25 de 4 L')).toBeInTheDocument()
    })

    it('não desce abaixo de zero — não existe beber água negativa', async () => {
      renderizar(SEGUNDA)
      expect(await screen.findByText('0 de 4 L')).toBeInTheDocument()
      expect(menos()).toBeDisabled()
    })

    it('deixa passar do alvo, mas a barra enche só até 100%', async () => {
      renderizar(SEGUNDA)
      for (let i = 0; i < 18; i++) await userEvent.click(mais())

      // Registrar 4 L quando o aluno bebeu 4,5 seria mentir no arquivo que o
      // profissional vai ler. E agora dá para corrigir, então travar no alvo
      // deixou de proteger de qualquer coisa.
      expect(await screen.findByText('4,5 de 4 L')).toBeInTheDocument()
      expect(screen.getByRole('progressbar').querySelector('.agua__preenchida')).toHaveStyle({
        inlineSize: '100%',
      })
    })

    it('expõe o progresso para leitor de tela', async () => {
      renderizar(SEGUNDA)
      const barra = await screen.findByRole('progressbar')
      expect(barra).toHaveAttribute('aria-valuemax', '4')
      expect(barra).toHaveAttribute('aria-valuenow', '0')
    })

    it('grava no vault — o copo não some ao recarregar', async () => {
      renderizar(SEGUNDA)
      await userEvent.click(mais())
      expect(await screen.findByText('0,25 de 4 L')).toBeInTheDocument()

      // Estava só em `useState`: sair da tela apagava o dia inteiro de água.
      const bruto = await vault.ler(CAMINHOS.registro(SEGUNDA))
      expect(JSON.parse(bruto!)).toMatchObject({ aguaLitros: 0.25 })
    })
  })

  it('não deixa chave de tradução vazar para a tela', () => {
    comPlano()
    renderizar(SEGUNDA)
    expect(document.body.textContent).not.toMatch(/hoje\.|navegacao\.|refeicaoItens/)
  })
})
