import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import '../infrastructure/i18n'
import { CAMINHOS } from '../domain/vault/caminhos'
import { InMemoryVaultStorage } from '../infrastructure/armazenamento/InMemoryVaultStorage'
import planoValido from '../test/fixtures/plano-valido.json'
import { usarVault, useVault } from './estado/vaultStore'
import { App } from './App'

describe('casca do app', () => {
  let vault: InMemoryVaultStorage

  beforeEach(() => {
    // O App carrega o vault ao montar. Sem injetar, cairia no OPFS real, que
    // não existe em jsdom.
    vault = new InMemoryVaultStorage()
    usarVault(vault)
    useVault.setState({ arquivo: null, carregando: false, problemas: null })
  })

  it('abre em Hoje, não numa tela de escolha', () => {
    render(<App />)
    // Princípio 1 da interface: a tela inicial é o dia, não um menu.
    expect(window.location.hash).toBe('#/hoje')
  })

  it('oferece os quatro destinos da arquitetura de informação', () => {
    render(<App />)
    for (const destino of ['Hoje', 'Evolução', 'Perfil', 'Plano']) {
      expect(screen.getByRole('link', { name: destino })).toBeInTheDocument()
    }
  })

  it('sem plano importado, mostra o estado vazio com a única ação possível', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Nenhum plano ainda' })).toBeInTheDocument()
    expect(
      screen.getByText(/Importe o arquivo que seu nutricionista ou treinador enviou/)
    ).toBeInTheDocument()
  })

  it('com plano no vault, carrega ao abrir e para de dizer que não há plano', async () => {
    // Testa o caminho real: o App lê o vault ao montar. Semear só o estado da
    // store afirmaria sobre algo que o próprio efeito sobrescreveria em
    // seguida — o teste passaria por acidente de ordem.
    await vault.escrever(CAMINHOS.planoAtual, JSON.stringify(planoValido))

    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Ainda não construído' })).toBeInTheDocument()
    })
    expect(screen.queryByRole('heading', { name: 'Nenhum plano ainda' })).not.toBeInTheDocument()
  })

  it('não deixa nenhuma string de UI escapar do dicionário', () => {
    render(<App />)
    // Se uma chave i18n vazar para a tela, ela aparece crua como "navegacao.hoje".
    expect(document.body.textContent).not.toMatch(/\b\w+\.\w+\.\w+\b/)
    expect(document.body.textContent).not.toMatch(/navegacao\.|vazio\.|rodape\./)
  })
})
