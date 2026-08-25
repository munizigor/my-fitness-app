import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../../infrastructure/i18n'
import { CAMINHOS } from '../../domain/vault/caminhos'
import { lerArquivoDePlano } from '../../domain/schema/arquivoDePlano'
import { InMemoryVaultStorage } from '../../infrastructure/armazenamento/InMemoryVaultStorage'
import planoValido from '../../test/fixtures/plano-valido.json'
import { useTreino } from '../estado/treinoStore'
import { usarVault, useVault } from '../estado/vaultStore'
import { ExecucaoTreino } from './ExecucaoTreino'

// Do fixture: segunda = Treino A (4 itens), quinta = descanso.
const SEGUNDA = '2026-08-24'
const QUINTA = '2026-08-27'

let vault: InMemoryVaultStorage

function renderizar(hoje = SEGUNDA) {
  return render(
    <MemoryRouter>
      <ExecucaoTreino hoje={hoje} />
    </MemoryRouter>
  )
}

async function esperarCarregar() {
  await waitFor(() => expect(useTreino.getState().carregando).toBe(false))
}

function serieDe(indice: number) {
  return screen.getByRole('button', { name: `Concluir série ${indice}` }).closest('li')!
}

describe('ExecucaoTreino', () => {
  beforeEach(() => {
    vault = new InMemoryVaultStorage()
    usarVault(vault)
    useVault.setState({
      arquivo: lerArquivoDePlano(planoValido),
      carregando: false,
      problemas: null,
    })
    useTreino.setState({ historico: [], hoje: null, carregando: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('um exercício por vez, nunca a lista inteira', () => {
    it('abre no primeiro exercício do treino de hoje', async () => {
      renderizar()
      await esperarCarregar()
      expect(screen.getByRole('heading', { name: 'Puxada Frontal Pronada' })).toBeInTheDocument()
      expect(screen.getByText('1/4')).toBeInTheDocument()
    })

    it('mostra a prescrição em cima, legível de relance', async () => {
      renderizar()
      await esperarCarregar()
      expect(screen.getByText('4 × 10–12')).toBeInTheDocument()
    })

    it('avança e volta entre exercícios', async () => {
      renderizar()
      await esperarCarregar()

      await userEvent.click(screen.getByRole('button', { name: 'Próximo' }))
      expect(
        screen.getByRole('heading', { name: 'Remada Cavalinho com Triângulo' })
      ).toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'Anterior' }))
      expect(screen.getByRole('heading', { name: 'Puxada Frontal Pronada' })).toBeInTheDocument()
    })

    it('mostra uma linha por série prescrita', async () => {
      renderizar()
      await esperarCarregar()
      expect(screen.getAllByRole('button', { name: /^Concluir série/ })).toHaveLength(4)
    })

    it('mantém a técnica avançada sempre visível, sem exigir toque', async () => {
      renderizar()
      await esperarCarregar()
      await userEvent.click(screen.getByRole('button', { name: 'Próximo' }))
      expect(screen.getByText('Corpo totalmente em 90 graus')).toBeInTheDocument()
    })
  })

  describe('o padrão já é a resposta certa', () => {
    it('pré-preenche as repetições com o topo da faixa prescrita', async () => {
      renderizar()
      await esperarCarregar()
      expect(screen.getByLabelText('Repetições da série 1')).toHaveValue(12)
    })

    it('pré-preenche a carga com a que o profissional prescreveu, na primeira vez', async () => {
      renderizar()
      await esperarCarregar()
      // O segundo exercício tem cargaAlvoKg 30 no fixture.
      await userEvent.click(screen.getByRole('button', { name: 'Próximo' }))
      expect(screen.getByLabelText('Carga da série 1, em quilos')).toHaveValue(30)
    })

    it('pré-preenche com a última carga registrada, que vence a prescrição', async () => {
      await vault.escrever(
        CAMINHOS.registro('2026-08-17'),
        JSON.stringify({
          schemaVersion: 2,
          data: '2026-08-17',
          series: [
            {
              itemDeTreinoId: 'a1',
              indice: 1,
              cargaKg: 70,
              concluidaEm: '2026-08-17T10:00:00.000Z',
            },
          ],
        })
      )

      renderizar()
      await esperarCarregar()
      expect(screen.getByLabelText('Carga da série 1, em quilos')).toHaveValue(70)
    })

    it('deixa o campo vazio quando não há histórico nem prescrição', async () => {
      renderizar()
      await esperarCarregar()
      expect(screen.getByLabelText('Carga da série 1, em quilos')).toHaveValue(null)
    })
  })

  describe('registrar sobrevive ao mundo real', () => {
    it('grava a série no vault assim que ela é concluída', async () => {
      renderizar()
      await esperarCarregar()

      await userEvent.clear(screen.getByLabelText('Carga da série 1, em quilos'))
      await userEvent.type(screen.getByLabelText('Carga da série 1, em quilos'), '65')
      await userEvent.click(screen.getByRole('button', { name: 'Concluir série 1' }))

      // Se o app fechasse agora, esta série estaria salva.
      await waitFor(async () => {
        const bruto = await vault.ler(CAMINHOS.registro(SEGUNDA))
        expect(bruto).not.toBeNull()
        expect(JSON.parse(bruto!).series[0]).toMatchObject({
          itemDeTreinoId: 'a1',
          indice: 1,
          cargaKg: 65,
          repeticoes: 12,
        })
      })
    })

    it('marca a série como feita na tela', async () => {
      renderizar()
      await esperarCarregar()
      await userEvent.click(screen.getByRole('button', { name: 'Concluir série 1' }))

      await waitFor(() => {
        expect(
          within(serieDe(1)).getByRole('button', { name: /Concluir série 1/ })
        ).toHaveTextContent('Feita')
      })
    })

    it('grava série de tempo com os segundos prescritos, sem repetições', async () => {
      renderizar()
      await esperarCarregar()
      // Terceiro item: Prancha Lateral, 2 × 60''.
      await userEvent.click(screen.getByRole('button', { name: 'Próximo' }))
      await userEvent.click(screen.getByRole('button', { name: 'Próximo' }))

      await userEvent.click(screen.getByRole('button', { name: 'Concluir série 1' }))

      await waitFor(async () => {
        const registro = JSON.parse((await vault.ler(CAMINHOS.registro(SEGUNDA)))!)
        expect(registro.series[0]).toMatchObject({ segundos: 60 })
        expect(registro.series[0]).not.toHaveProperty('repeticoes')
      })
    })

    it('a próxima série já sugere a carga que acabou de ser levantada', async () => {
      renderizar()
      await esperarCarregar()

      await userEvent.clear(screen.getByLabelText('Carga da série 1, em quilos'))
      await userEvent.type(screen.getByLabelText('Carga da série 1, em quilos'), '80')
      await userEvent.click(screen.getByRole('button', { name: 'Concluir série 1' }))

      // Sem navegar para lugar nenhum: quem subiu de 60 para 80 na série 1 não
      // pode ter que corrigir as outras três à mão, entre séries, com uma mão só.
      await waitFor(() => {
        expect(screen.getByLabelText('Carga da série 2, em quilos')).toHaveValue(80)
      })
      expect(screen.getByLabelText('Carga da série 4, em quilos')).toHaveValue(80)
    })
  })

  describe('o cronômetro dispara sozinho', () => {
    it('não existe antes de concluir a primeira série', async () => {
      renderizar()
      await esperarCarregar()
      expect(screen.queryByRole('timer')).not.toBeInTheDocument()
    })

    it('aparece ao concluir a série, sem o aluno pedir', async () => {
      renderizar()
      await esperarCarregar()
      await userEvent.click(screen.getByRole('button', { name: 'Concluir série 1' }))

      // Na planilha o intervalo é uma linha de texto que ninguém obedece.
      const timer = await screen.findByRole('timer')
      expect(timer).toHaveTextContent('0:00')
      expect(timer).toHaveTextContent('Faltam 60 s de descanso')
    })

    it('conta o tempo e avisa quando pode voltar', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      renderizar()
      await waitFor(() => expect(useTreino.getState().carregando).toBe(false))
      await usuario.click(screen.getByRole('button', { name: 'Concluir série 1' }))
      await screen.findByRole('timer')

      await vi.advanceTimersByTimeAsync(61_000)

      await waitFor(() => {
        expect(screen.getByRole('timer')).toHaveTextContent('1:01')
      })
      expect(screen.getByRole('timer')).toHaveTextContent('Pode voltar')
    })

    it('pode ser dispensado quando o aluno já está de volta na barra', async () => {
      renderizar()
      await esperarCarregar()
      await userEvent.click(screen.getByRole('button', { name: 'Concluir série 1' }))
      await screen.findByRole('timer')

      await userEvent.click(screen.getByRole('button', { name: 'Dispensar' }))
      expect(screen.queryByRole('timer')).not.toBeInTheDocument()
    })
  })

  describe('dia sem treino', () => {
    it('diz que hoje não tem treino, em vez de tela em branco', async () => {
      renderizar(QUINTA)
      await esperarCarregar()
      expect(screen.getByRole('heading', { name: 'Hoje não tem treino' })).toBeInTheDocument()
    })
  })

  it('sem plano importado, convida a importar', async () => {
    useVault.setState({ arquivo: null, carregando: false, problemas: null })
    renderizar()
    await esperarCarregar()
    expect(screen.getByRole('heading', { name: 'Nenhum plano ainda' })).toBeInTheDocument()
  })
})
