import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import '../../infrastructure/i18n'
import { CAMINHOS } from '../../domain/vault/caminhos'
import { InMemoryVaultStorage } from '../../infrastructure/armazenamento/InMemoryVaultStorage'
import { useAluno } from '../estado/alunoStore'
import { usarVault } from '../estado/vaultStore'
import { TelaPerfil } from './TelaPerfil'

const HOJE = '2026-08-25'

const PERFIL = { nome: 'Aluno Exemplo', idade: 30, alturaMetros: 1.75 }

function renderizar(hoje = HOJE) {
  return render(
    <MemoryRouter>
      <TelaPerfil hoje={hoje} />
    </MemoryRouter>
  )
}

describe('TelaPerfil', () => {
  let vault: InMemoryVaultStorage

  async function semear(caminho: string, documento: unknown) {
    await vault.escrever(caminho, JSON.stringify(documento))
  }

  beforeEach(() => {
    vault = new InMemoryVaultStorage()
    usarVault(vault)
    useAluno.setState({ perfil: null, medidas: [], carregando: true })
  })

  describe('quem é o aluno', () => {
    it('mostra a identificação que veio do plano', async () => {
      await semear(CAMINHOS.perfil, PERFIL)
      renderizar()

      expect(await screen.findByText(/Aluno Exemplo/)).toBeInTheDocument()
      expect(screen.getByText(/30 anos/)).toBeInTheDocument()
      expect(screen.getByText(/1,75 m/)).toBeInTheDocument()
    })

    it('sem perfil nenhum, convida a importar o plano — é de lá que ele vem', async () => {
      renderizar()
      expect(await screen.findByText('Nenhum plano ainda')).toBeInTheDocument()
    })

    it('o aluno corrige a própria idade, e a correção vai para o vault', async () => {
      await semear(CAMINHOS.perfil, PERFIL)
      renderizar()

      await userEvent.click(await screen.findByRole('button', { name: 'Corrigir meus dados' }))
      const idade = screen.getByLabelText('Idade (anos)')
      await userEvent.clear(idade)
      await userEvent.type(idade, '31')
      await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

      expect(await screen.findByText(/31 anos/)).toBeInTheDocument()
      expect(JSON.parse((await vault.ler(CAMINHOS.perfil))!).idade).toBe(31)
    })

    it('desiste da correção sem gravar nada', async () => {
      await semear(CAMINHOS.perfil, PERFIL)
      renderizar()

      await userEvent.click(await screen.findByRole('button', { name: 'Corrigir meus dados' }))
      const idade = screen.getByLabelText('Idade (anos)')
      await userEvent.clear(idade)
      await userEvent.type(idade, '99')
      await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

      expect(await screen.findByText(/30 anos/)).toBeInTheDocument()
      expect(JSON.parse((await vault.ler(CAMINHOS.perfil))!).idade).toBe(30)
    })
  })

  describe('a aferição de hoje', () => {
    it('vem pré-preenchida com a última medida — o aluno confirma, não digita', async () => {
      // Princípio 2 da interface, o mesmo da carga na academia: o padrão já é a
      // resposta provável, e quem não mudou de peso só confirma.
      await semear(CAMINHOS.perfil, PERFIL)
      await semear(CAMINHOS.medida('2026-06-10'), {
        schemaVersion: 1,
        data: '2026-06-10',
        pesoKg: 85,
      })
      renderizar()

      expect(await screen.findByLabelText('Peso (kg)')).toHaveValue(85)
    })

    it('grava um ponto datado no vault', async () => {
      await semear(CAMINHOS.perfil, PERFIL)
      renderizar()

      await userEvent.type(await screen.findByLabelText('Peso (kg)'), '82.4')
      await userEvent.click(screen.getByRole('button', { name: 'Registrar aferição' }))

      await screen.findByRole('list', { name: 'Histórico de aferições' })
      const gravada = JSON.parse((await vault.ler(CAMINHOS.medida(HOJE)))!)
      expect(gravada).toMatchObject({ data: HOJE, pesoKg: 82.4 })
    })

    it('não sobrescreve a aferição anterior — o histórico é série temporal', async () => {
      await semear(CAMINHOS.perfil, PERFIL)
      await semear(CAMINHOS.medida('2026-06-10'), {
        schemaVersion: 1,
        data: '2026-06-10',
        pesoKg: 85,
      })
      renderizar()

      const peso = await screen.findByLabelText('Peso (kg)')
      await userEvent.clear(peso)
      await userEvent.type(peso, '82.4')
      await userEvent.click(screen.getByRole('button', { name: 'Registrar aferição' }))

      const historico = await screen.findByRole('list', { name: 'Histórico de aferições' })
      const pontos = within(historico).getAllByRole('listitem')
      expect(pontos).toHaveLength(2)
      // Mais recente primeiro: é assim que se lê o próprio histórico.
      expect(pontos[0]).toHaveTextContent('82,4 kg')
      expect(pontos[1]).toHaveTextContent('85 kg')
      expect(await vault.ler(CAMINHOS.medida('2026-06-10'))).not.toBeNull()
    })

    it('registra também a fita métrica, com vocabulário controlado', async () => {
      await semear(CAMINHOS.perfil, PERFIL)
      renderizar()

      await userEvent.type(await screen.findByLabelText('Peso (kg)'), '82.4')
      // O peso é o número de toda aferição; a fita métrica é de quem tem fita
      // na gaveta, e por isso fica atrás de um toque.
      await userEvent.click(screen.getByRole('button', { name: 'Fita métrica' }))
      await userEvent.type(screen.getByLabelText('Cintura (cm)'), '84')
      await userEvent.click(screen.getByRole('button', { name: 'Registrar aferição' }))

      await screen.findByRole('list', { name: 'Histórico de aferições' })
      const gravada = JSON.parse((await vault.ler(CAMINHOS.medida(HOJE)))!)
      expect(gravada.circunferenciasCm).toEqual({ cintura: 84 })
    })

    it('não deixa registrar aferição sem nenhum valor', async () => {
      await semear(CAMINHOS.perfil, PERFIL)
      renderizar()

      expect(await screen.findByRole('button', { name: 'Registrar aferição' })).toBeDisabled()
    })

    it('corrigir no mesmo dia atualiza aquele ponto, sem criar outro', async () => {
      await semear(CAMINHOS.perfil, PERFIL)
      renderizar()

      const peso = await screen.findByLabelText('Peso (kg)')
      await userEvent.type(peso, '28.4')
      await userEvent.click(screen.getByRole('button', { name: 'Registrar aferição' }))
      await screen.findByRole('list', { name: 'Histórico de aferições' })

      await userEvent.clear(screen.getByLabelText('Peso (kg)'))
      await userEvent.type(screen.getByLabelText('Peso (kg)'), '82.4')
      await userEvent.click(screen.getByRole('button', { name: 'Atualizar aferição de hoje' }))

      const historico = await screen.findByRole('list', { name: 'Histórico de aferições' })
      expect(within(historico).getAllByRole('listitem')).toHaveLength(1)
      expect(JSON.parse((await vault.ler(CAMINHOS.medida(HOJE)))!).pesoKg).toBe(82.4)
    })
  })

  describe('o histórico', () => {
    it('mostra cada aferição com a data em que foi feita', async () => {
      await semear(CAMINHOS.perfil, PERFIL)
      await semear(CAMINHOS.medida('2026-06-10'), {
        schemaVersion: 1,
        data: '2026-06-10',
        pesoKg: 85,
        circunferenciasCm: { cintura: 88 },
      })
      renderizar()

      const historico = await screen.findByRole('list', { name: 'Histórico de aferições' })
      const ponto = within(historico).getAllByRole('listitem')[0]!
      // A data do arquivo, no fuso do aluno — nunca a meia-noite UTC dela.
      expect(ponto).toHaveTextContent('10/06/2026')
      expect(ponto).toHaveTextContent('85 kg')
      expect(ponto).toHaveTextContent('Cintura 88 cm')
    })

    it('diz o que fazer quando ainda não há nenhuma aferição', async () => {
      await semear(CAMINHOS.perfil, PERFIL)
      renderizar()

      expect(
        await screen.findByText('Sua primeira aferição vira o ponto de partida da sua evolução.')
      ).toBeInTheDocument()
    })

    it('uma aferição corrompida não derruba a tela', async () => {
      await semear(CAMINHOS.perfil, PERFIL)
      await vault.escrever(CAMINHOS.medida('2026-06-10'), 'isto não é json')
      renderizar()

      expect(await screen.findByText(/Aluno Exemplo/)).toBeInTheDocument()
    })
  })
})
