import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import '../../infrastructure/i18n'
import { lerArquivoDePlano } from '../../domain/schema/arquivoDePlano'
import { CAMINHOS } from '../../domain/vault/caminhos'
import { InMemoryVaultStorage } from '../../infrastructure/armazenamento/InMemoryVaultStorage'
import planoValido from '../../test/fixtures/plano-valido.json'
import { useRegistro } from '../estado/registroStore'
import { usarVault, useVault } from '../estado/vaultStore'
import { TelaRefeicao } from './TelaRefeicao'

const SEGUNDA = '2026-08-24'

function renderizar(numero: number) {
  return render(
    <MemoryRouter initialEntries={[`/refeicao/${numero}`]}>
      <Routes>
        <Route path="/refeicao/:numero" element={<TelaRefeicao hoje={SEGUNDA} />} />
        <Route path="/hoje" element={<p>Linha do tempo</p>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('TelaRefeicao', () => {
  let vault: InMemoryVaultStorage

  beforeEach(() => {
    vault = new InMemoryVaultStorage()
    usarVault(vault)
    useVault.setState({
      arquivo: lerArquivoDePlano(planoValido),
      carregando: false,
      problemas: null,
    })
    useRegistro.setState({ historico: [], hoje: null, carregando: true })
  })

  const opcao = (nome: string | RegExp) => screen.getByRole('button', { name: nome })

  describe('o item vira uma escolha, não uma tabela para interpretar', () => {
    it('mostra o nome da refeição, não o número', async () => {
      renderizar(1)
      expect(await screen.findByRole('heading', { name: 'Café da manhã' })).toBeInTheDocument()
    })

    it('mostra cada alternativa com quantidade legível', async () => {
      renderizar(1)
      // Na planilha isto era "Pão integral 2 fatias OU Cuscuz 130g OU Pão
      // francês 1 un" numa célula só, que o aluno tinha que decifrar.
      expect(await opcao(/Pão integral/)).toBeInTheDocument()
      expect(opcao(/Pão integral/)).toHaveTextContent('2 fatias')
      expect(opcao(/Cuscuz/)).toHaveTextContent('130 g')
      expect(opcao(/Pão francês/)).toHaveTextContent('1 unidade')
    })

    it('mostra os macros do item, que valem para qualquer alternativa', async () => {
      renderizar(1)
      const item = (await screen.findAllByRole('listitem'))[0]!
      expect(within(item).getByText(/4 g de proteína/)).toBeInTheDocument()
    })
  })

  describe('escolher a alternativa é registrar o consumo — um toque, não dois', () => {
    it('marca a opção tocada', async () => {
      renderizar(1)
      await userEvent.click(await opcao(/Cuscuz/))

      expect(opcao(/Cuscuz/)).toHaveAttribute('aria-pressed', 'true')
      expect(opcao(/Pão integral/)).toHaveAttribute('aria-pressed', 'false')
    })

    it('grava no vault, não na memória da tela', async () => {
      renderizar(1)
      await userEvent.click(await opcao(/Cuscuz/))
      expect(opcao(/Cuscuz/)).toHaveAttribute('aria-pressed', 'true')

      const bruto = await vault.ler(CAMINHOS.registro(SEGUNDA))
      expect(JSON.parse(bruto!).refeicoes[0].itens).toEqual([
        { itemDeRefeicaoId: 'r1i1', alimento: 'Cuscuz' },
      ])
    })

    it('trocar de alternativa desmarca a anterior — não se come as duas', async () => {
      renderizar(1)
      await userEvent.click(await opcao(/Cuscuz/))
      await userEvent.click(opcao(/Pão francês/))

      expect(opcao(/Cuscuz/)).toHaveAttribute('aria-pressed', 'false')
      expect(opcao(/Pão francês/)).toHaveAttribute('aria-pressed', 'true')
    })

    it('tocar de novo na mesma desmarca — dá para desfazer o engano', async () => {
      renderizar(1)
      await userEvent.click(await opcao(/Cuscuz/))
      await userEvent.click(opcao(/Cuscuz/))

      expect(opcao(/Cuscuz/)).toHaveAttribute('aria-pressed', 'false')
    })
  })

  describe('macros do dia', () => {
    it('somam conforme o aluno marca, contra o alvo do plano', async () => {
      renderizar(1)
      expect(await screen.findByText(/0 de 170 g/)).toBeInTheDocument()

      await userEvent.click(opcao(/Pão integral/))
      expect(await screen.findByText(/4 de 170 g/)).toBeInTheDocument()

      await userEvent.click(opcao(/Queijo cottage/))
      expect(await screen.findByText(/10 de 170 g/)).toBeInTheDocument()
    })
  })

  it('refeição que não existe no plano volta para Hoje em vez de quebrar', async () => {
    renderizar(99)
    expect(await screen.findByText('Linha do tempo')).toBeInTheDocument()
  })

  it('não deixa chave de tradução vazar para a tela', async () => {
    renderizar(1)
    await screen.findByRole('heading', { name: 'Café da manhã' })
    expect(document.body.textContent).not.toMatch(/refeicao\.|hoje\.|unidades\./)
  })
})
