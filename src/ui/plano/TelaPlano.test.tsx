import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import '../../infrastructure/i18n'
import { InMemoryVaultStorage } from '../../infrastructure/armazenamento/InMemoryVaultStorage'
import { CAMINHOS } from '../../domain/vault/caminhos'
import planoValido from '../../test/fixtures/plano-valido.json'
import { lerArquivoDePlano } from '../../domain/schema/arquivoDePlano'
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

  describe('consulta ao plano completo', () => {
    beforeEach(() => {
      useVault.setState({
        arquivo: lerArquivoDePlano(planoValido),
        carregando: false,
        problemas: null,
      })
    })

    it('sem plano, não mostra seção de prescrição nenhuma', () => {
      useVault.setState({ arquivo: null, carregando: false, problemas: null })
      renderizar()

      // Cabeçalhos de seção vazios seriam a promessa de um plano que não existe.
      expect(screen.queryByRole('heading', { name: 'Sua semana' })).not.toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Treinos' })).not.toBeInTheDocument()
    })

    describe('a semana', () => {
      it('mostra os sete dias, com o que cai em cada um', () => {
        renderizar()
        const semana = screen.getByRole('list', { name: 'Sua semana' })

        expect(within(semana).getAllByRole('listitem')).toHaveLength(7)
        expect(within(semana).getByText('Segunda-feira').closest('li')).toHaveTextContent(
          'Treino A'
        )
      })

      it('diz que quinta é descanso, em vez de deixar a linha vazia', () => {
        renderizar()
        const semana = screen.getByRole('list', { name: 'Sua semana' })

        expect(within(semana).getByText('Quinta-feira').closest('li')).toHaveTextContent('Descanso')
      })

      it('não chama de descanso o sábado, que tem aeróbico', () => {
        renderizar()
        const semana = screen.getByRole('list', { name: 'Sua semana' })
        const sabado = within(semana).getByText('Sábado').closest('li')

        // Sábado sem musculação ainda é dia de ir. Chamar de descanso mandaria
        // o aluno para casa num dia em que o profissional marcou trabalho.
        expect(sabado).toHaveTextContent('HIIT na esteira')
        expect(sabado).not.toHaveTextContent('Descanso')
      })
    })

    describe('os treinos', () => {
      it('mostra cada treino uma vez, com os dias em que cai', () => {
        renderizar()
        const treinos = screen.getByRole('region', { name: 'Treinos' })

        // O Treino A cai em dois dias. Na seção de treinos ele aparece uma vez
        // só: repetir a lista de exercícios embaixo de segunda e de quarta
        // seria a planilha de volta.
        expect(within(treinos).getAllByText(/^Treino A/)).toHaveLength(1)
        expect(
          within(treinos)
            .getByText(/Treino A/)
            .closest('details')
        ).toHaveTextContent('Segunda-feira e Quarta-feira')
      })

      it('deixa o detalhe atrás de um toque', async () => {
        renderizar()
        const treinos = screen.getByRole('region', { name: 'Treinos' })

        // Seis treinos abertos de uma vez são a planilha inteira na tela. O que
        // fica à vista é o suficiente para escolher qual abrir.
        const exercicio = screen.getByText('Puxada Frontal Pronada')
        expect(exercicio).not.toBeVisible()

        await userEvent.click(within(treinos).getByText(/Treino A/))
        expect(exercicio).toBeVisible()
      })

      it('aberto, mostra a prescrição e a observação do profissional', async () => {
        renderizar()
        const treinos = screen.getByRole('region', { name: 'Treinos' })
        await userEvent.click(within(treinos).getByText(/Treino A/))

        const item = screen.getByText('Puxada Frontal Pronada').closest('li')
        expect(item).toHaveTextContent('4 × 10–12')

        // A mesma Prancha Lateral aparece duas vezes, e o que distingue os dois
        // usos é a observação: sem ela o aluno faria um lado só.
        expect(screen.getAllByText('Prancha Lateral')).toHaveLength(2)
        expect(screen.getByText('Lado direito')).toBeVisible()
        expect(screen.getByText('Lado esquerdo')).toBeVisible()
      })
    })

    describe('a dieta', () => {
      it('mostra o alvo do dia, contra o qual a prescrição foi montada', () => {
        renderizar()
        const dieta = screen.getByRole('region', { name: 'Dieta' })

        expect(dieta).toHaveTextContent('170 g de proteína')
        expect(dieta).toHaveTextContent('Brócolis')
      })

      it('a refeição abre com as alternativas e o "ou" entre elas', async () => {
        renderizar()
        const dieta = screen.getByRole('region', { name: 'Dieta' })
        await userEvent.click(within(dieta).getByText(/Café da manhã/))

        // Os macros aparecem uma vez por item, acima das alternativas, porque
        // valem para qualquer uma delas — é o que identifica o item na tela.
        const item = within(dieta)
          .getByText('4 g de proteína · 28 g de carboidrato · 2 g de gordura')
          .closest('li')

        expect(item).toHaveTextContent('Pão integral')
        expect(item).toHaveTextContent('2 fatias')
        // Sem o "ou", a lista se lê como coisas a comer todas — o oposto do que
        // o profissional prescreveu.
        expect(item).toHaveTextContent('ou')
        expect(item).toHaveTextContent('Cuscuz')
      })
    })

    describe('os suplementos', () => {
      it('ficam agrupados por fórmula, como o profissional prescreveu', () => {
        renderizar()

        // O agrupamento é o raciocínio clínico dele. Uma lista achatada de
        // quatro suplementos perderia o motivo de cada um estar ali.
        const bemEstar = screen.getByRole('heading', { name: 'Bem-estar geral' })
        expect(within(bemEstar.closest('section')!).getAllByRole('listitem')).toHaveLength(2)
        expect(screen.getByRole('heading', { name: 'Treino', level: 3 })).toBeInTheDocument()
      })

      it('diz quando tomar pela refeição, não pelo número dela', () => {
        renderizar()
        const magnesio = screen.getByText('Magnésio dimalato').closest('li')

        expect(magnesio).toHaveTextContent('200 mg')
        // "Após a refeição 1" é o arquivo falando; o aluno lê o nome.
        expect(magnesio).toHaveTextContent('Café da manhã')

        expect(screen.getByText('Pré-treino').closest('li')).toHaveTextContent('Antes de treinar')
      })
    })

    it('é consulta, não registro: a prescrição é do profissional', async () => {
      renderizar()
      const dieta = screen.getByRole('region', { name: 'Dieta' })
      await userEvent.click(within(dieta).getByText(/Café da manhã/))

      // Em Hoje a alternativa é um botão que registra o consumo. Aqui não:
      // consultar o plano não é comer (princípio 5).
      expect(screen.queryByRole('button', { name: /Cuscuz/ })).not.toBeInTheDocument()
      expect(document.querySelector('[aria-pressed]')).toBeNull()
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })
  })
})
