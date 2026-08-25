import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import '../../infrastructure/i18n'
import { InMemoryVaultStorage } from '../../infrastructure/armazenamento/InMemoryVaultStorage'
import { CAMINHOS } from '../../domain/vault/caminhos'
import planoValido from '../../test/fixtures/plano-valido.json'
import { usarVault, useVault } from '../estado/vaultStore'
import { TelaPlano } from './TelaPlano'

function arquivoJson(conteudo: unknown, nome = 'plano.fitvault.json'): File {
  return new File([JSON.stringify(conteudo)], nome, { type: 'application/json' })
}

function renderizar() {
  return render(
    <MemoryRouter>
      <TelaPlano />
    </MemoryRouter>
  )
}

describe('TelaPlano', () => {
  let vault: InMemoryVaultStorage

  beforeEach(() => {
    vault = new InMemoryVaultStorage()
    usarVault(vault)
    useVault.setState({ arquivo: null, carregando: false, problemas: null })
  })

  it('sem plano, oferece importar como única ação', () => {
    renderizar()
    expect(
      screen.getByRole('button', { name: 'Importar arquivo do profissional' })
    ).toBeInTheDocument()
  })

  it('importa o arquivo do profissional e mostra de quem veio', async () => {
    renderizar()
    await userEvent.upload(
      screen.getByLabelText('Importar arquivo do profissional'),
      arquivoJson(planoValido)
    )

    await waitFor(() => {
      expect(screen.getByText('Prescrito por Ana Ribeiro')).toBeInTheDocument()
    })
    expect(screen.getByText(/2 treinos · 5 exercícios · descanso de 60 a 70 s/)).toBeInTheDocument()
    expect(screen.getByText(/3 refeições por dia · 4 L de água/)).toBeInTheDocument()
  })

  it('persiste o plano no vault, não só na tela', async () => {
    renderizar()
    await userEvent.upload(
      screen.getByLabelText('Importar arquivo do profissional'),
      arquivoJson(planoValido)
    )

    await waitFor(async () => {
      expect(await vault.ler(CAMINHOS.planoAtual)).not.toBeNull()
    })
  })

  describe('arquivo inválido', () => {
    it('aponta o campo errado, para o profissional poder corrigir', async () => {
      const ruim = structuredClone(planoValido) as Record<string, unknown>
      // @ts-expect-error navegação em JSON solto, só no teste
      delete ruim.plano.treino.sessoes[0].itens[0].series

      renderizar()
      await userEvent.upload(
        screen.getByLabelText('Importar arquivo do profissional'),
        arquivoJson(ruim)
      )

      const alerta = await screen.findByRole('alert')
      expect(alerta).toHaveTextContent('Não consegui ler este arquivo')
      // Localizado em linguagem de negócio, não por caminho de JSON.
      expect(alerta).toHaveTextContent('Treino A · Puxada Frontal Pronada')
      expect(alerta).toHaveTextContent('Séries')
      expect(alerta).toHaveTextContent('não foi preenchido')
    })

    it('tranquiliza o aluno: nada mudou no aparelho dele', async () => {
      renderizar()
      await userEvent.upload(
        screen.getByLabelText('Importar arquivo do profissional'),
        new File(['{ não é json'], 'ruim.json', { type: 'application/json' })
      )

      const alerta = await screen.findByRole('alert')
      expect(alerta).toHaveTextContent('Nada mudou no seu aparelho')
    })

    it('não apaga o plano que já estava carregado', async () => {
      renderizar()
      const entrada = screen.getByLabelText('Importar arquivo do profissional')

      await userEvent.upload(entrada, arquivoJson(planoValido))
      await waitFor(() => expect(screen.getByText('Prescrito por Ana Ribeiro')).toBeInTheDocument())

      await userEvent.upload(entrada, new File(['lixo'], 'ruim.json'))
      await screen.findByRole('alert')

      // O aluno pode estar na academia. Perder o plano por causa de um arquivo
      // ruim seria o pior momento possível.
      expect(screen.getByText('Prescrito por Ana Ribeiro')).toBeInTheDocument()
      expect(await vault.ler(CAMINHOS.planoAtual)).not.toBeNull()
    })
  })
})
