import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '../infrastructure/i18n'
import { App } from './App'

describe('casca do app', () => {
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

  it('não deixa nenhuma string de UI escapar do dicionário', () => {
    render(<App />)
    // Se uma chave i18n vazar para a tela, ela aparece crua como "navegacao.hoje".
    expect(document.body.textContent).not.toMatch(/\b\w+\.\w+\.\w+\b/)
    expect(document.body.textContent).not.toMatch(/navegacao\.|vazio\.|rodape\./)
  })
})
