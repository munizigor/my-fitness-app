import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import '../../infrastructure/i18n'
import { SCHEMA_VERSION_MEDIDA } from '../../domain/aluno/medida'
import { SCHEMA_VERSION_REGISTRO } from '../../domain/registro/migracoes'
import { lerArquivoDePlano } from '../../domain/schema/arquivoDePlano'
import { CAMINHOS } from '../../domain/vault/caminhos'
import { InMemoryVaultStorage } from '../../infrastructure/armazenamento/InMemoryVaultStorage'
import planoValido from '../../test/fixtures/plano-valido.json'
import { useAluno } from '../estado/alunoStore'
import { useRegistro } from '../estado/registroStore'
import { usarVault, useVault } from '../estado/vaultStore'
import { TelaEvolucao } from './TelaEvolucao'

const HOJE = '2026-08-25'

function renderizar(hoje = HOJE) {
  return render(
    <MemoryRouter>
      <TelaEvolucao hoje={hoje} />
    </MemoryRouter>
  )
}

function comPlano() {
  useVault.setState({ arquivo: lerArquivoDePlano(planoValido), carregando: false, problemas: null })
}

describe('TelaEvolucao', () => {
  let vault: InMemoryVaultStorage

  /** `a2` é a Remada Cavalinho do Treino A no plano de exemplo. */
  async function semearTreino(data: string, cargaKg: number, repeticoes = 10) {
    await vault.escrever(
      CAMINHOS.registro(data),
      JSON.stringify({
        schemaVersion: SCHEMA_VERSION_REGISTRO,
        data,
        aguaLitros: 0,
        refeicoes: [],
        series: [
          {
            itemDeTreinoId: 'a2',
            indice: 1,
            cargaKg,
            repeticoes,
            concluidaEm: `${data}T10:00:00Z`,
          },
        ],
      })
    )
  }

  async function semearAfericao(data: string, valores: Record<string, unknown>) {
    await vault.escrever(
      CAMINHOS.medida(data),
      JSON.stringify({ schemaVersion: SCHEMA_VERSION_MEDIDA, data, ...valores })
    )
  }

  beforeEach(() => {
    vault = new InMemoryVaultStorage()
    usarVault(vault)
    useVault.setState({ arquivo: null, carregando: false, problemas: null })
    useRegistro.setState({ historico: [], hoje: null, carregando: true })
    useAluno.setState({ perfil: null, medidas: [], carregando: true })
  })

  it('sem plano, convida a importar em vez de mostrar uma tela vazia', () => {
    renderizar()
    expect(screen.getByRole('heading', { name: 'Nenhum plano ainda' })).toBeInTheDocument()
  })

  describe('a frase vem antes de qualquer gráfico', () => {
    beforeEach(comPlano)

    it('abre com a maior subida de carga, em linguagem de gente', async () => {
      await semearTreino('2026-07-28', 30)
      await semearTreino('2026-08-25', 36)

      renderizar()

      expect(await screen.findByRole('status')).toHaveTextContent(
        'Você levantou 20% mais na Remada Cavalinho com Triângulo em 4 semanas.'
      )
    })

    it('quando nada subiu na barra, a frase vem da fita métrica', async () => {
      await semearAfericao('2026-06-30', { pesoKg: 85, circunferenciasCm: { cintura: 92 } })
      await semearAfericao('2026-08-25', { pesoKg: 84, circunferenciasCm: { cintura: 87 } })

      renderizar()

      expect(await screen.findByRole('status')).toHaveTextContent(
        'Você perdeu 5 cm de cintura em 8 semanas.'
      )
    })

    it('diz o que falta quando ainda não há duas sessões nem duas aferições', async () => {
      await semearTreino('2026-08-25', 30)
      renderizar()

      expect(
        await screen.findByRole('heading', { name: 'Ainda não dá para dizer' })
      ).toBeInTheDocument()
      // Nada de gráfico vazio nem de "0%": o que falta é registro.
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })
  })

  describe('a evidência, abaixo da frase', () => {
    beforeEach(comPlano)

    it('mostra carga e volume de cada exercício com duas sessões', async () => {
      await semearTreino('2026-07-28', 30, 10)
      await semearTreino('2026-08-25', 36, 12)

      renderizar()

      const exercicio = await screen.findByRole('listitem', {
        name: 'Remada Cavalinho com Triângulo',
      })
      expect(within(exercicio).getByText('30 → 36 kg')).toBeInTheDocument()
      expect(within(exercicio).getByText('300 → 432 kg')).toBeInTheDocument()
      expect(within(exercicio).getByText('2 sessões')).toBeInTheDocument()
    })

    it('mostra a queda como ela é, sem esconder', async () => {
      await semearTreino('2026-07-28', 40)
      await semearTreino('2026-08-25', 36)

      renderizar()

      const exercicio = await screen.findByRole('listitem', {
        name: 'Remada Cavalinho com Triângulo',
      })
      // Esconder a queda seria mentir para quem está voltando de uma lesão.
      expect(within(exercicio).getByText('40 → 36 kg')).toBeInTheDocument()
      // A carga caiu 10% e, com as mesmas repetições, o volume caiu junto.
      expect(within(exercicio).getAllByText('-10%')).toHaveLength(2)
    })

    it('o exercício de uma sessão só aparece como ponto de partida', async () => {
      await semearTreino('2026-07-28', 30)
      await semearAfericao('2026-06-30', { pesoKg: 85 })
      await semearAfericao('2026-08-25', { pesoKg: 82 })

      renderizar()

      const exercicio = await screen.findByRole('listitem', {
        name: 'Remada Cavalinho com Triângulo',
      })
      expect(within(exercicio).getByText('1 sessão')).toBeInTheDocument()
      expect(within(exercicio).getByText('Seu ponto de partida')).toBeInTheDocument()
    })

    it('lista o delta de cada medida do corpo', async () => {
      await semearAfericao('2026-06-30', { pesoKg: 85, percentualGordura: 22 })
      await semearAfericao('2026-08-25', { pesoKg: 81.6, percentualGordura: 19 })

      renderizar()

      const corpo = await screen.findByRole('list', { name: 'Seu corpo' })
      const linhas = within(corpo).getAllByRole('listitem')
      expect(linhas[0]).toHaveTextContent('Peso')
      expect(linhas[0]).toHaveTextContent('85 → 81,6 kg')
      expect(linhas[1]).toHaveTextContent('22 → 19%')
    })

    it('sem aferição nenhuma, a seção do corpo não aparece vazia', async () => {
      await semearTreino('2026-07-28', 30)
      await semearTreino('2026-08-25', 36)

      renderizar()

      await screen.findByRole('status')
      expect(screen.queryByRole('list', { name: 'Seu corpo' })).not.toBeInTheDocument()
    })
  })
})
