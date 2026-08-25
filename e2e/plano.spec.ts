import { expect, test } from '@playwright/test'
import { importarPlano, planoValido } from './fixture'

/**
 * Consultar o plano completo, como o aluno faria.
 *
 * O que só este teste prova: o aluno abre a aba, encontra o treino de quinta
 * sem ter que abrir seis blocos, e o que ele lê é a prescrição que veio no
 * arquivo — não uma cópia que a tela montou por conta própria. E prova o
 * contrário também: aqui não se registra nada.
 */
test.describe('Plano', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./')
    await page.evaluate(async () => {
      const raiz = await navigator.storage.getDirectory()
      for await (const [nome] of raiz.entries()) {
        await raiz.removeEntry(nome, { recursive: true })
      }
    })
    await page.reload()
    await page.getByRole('link', { name: 'Plano', exact: true }).click()
    await importarPlano(page)
    await expect(page.getByText('Prescrito por Ana Ribeiro')).toBeVisible()
  })

  test('a semana inteira aparece assim que o plano entra', async ({ page }) => {
    const semana = page.getByRole('list', { name: 'Sua semana' })

    await expect(semana.getByRole('listitem')).toHaveCount(7)
    await expect(semana.getByRole('listitem').filter({ hasText: 'Segunda-feira' })).toContainText(
      'Treino A'
    )
    await expect(semana.getByRole('listitem').filter({ hasText: 'Quinta-feira' })).toContainText(
      'Descanso'
    )
  })

  test('o treino abre com um toque e mostra a prescrição do profissional', async ({ page }) => {
    const treinos = page.getByRole('region', { name: 'Treinos' })
    const puxada = treinos.getByText('Puxada Frontal Pronada')

    // Fechado por padrão: o plano inteiro aberto é a planilha de volta.
    await expect(puxada).toBeHidden()

    await treinos.getByText(/Treino A/).click()
    await expect(puxada).toBeVisible()
    await expect(treinos).toContainText('4 × 10–12')
    // A observação distingue os dois lados da Prancha Lateral; sem ela o aluno
    // faria um lado e acharia que terminou.
    await expect(treinos).toContainText('Lado direito')
    await expect(treinos).toContainText('Lado esquerdo')
  })

  test('os suplementos vêm agrupados por fórmula, com o quando por extenso', async ({ page }) => {
    const suplementos = page.getByRole('region', { name: 'Suplementos' })

    await expect(suplementos.getByRole('heading', { name: 'Bem-estar geral' })).toBeVisible()
    await expect(
      suplementos.getByRole('listitem').filter({ hasText: 'Magnésio dimalato' })
    ).toContainText('Café da manhã')
    await expect(suplementos.getByRole('listitem').filter({ hasText: 'Pré-treino' })).toContainText(
      'Antes de treinar'
    )
  })

  test('consultar não é registrar: a prescrição é do profissional', async ({ page }) => {
    const dieta = page.getByRole('region', { name: 'Dieta' })
    await dieta.getByText(/Café da manhã/).click()

    await expect(dieta).toContainText('Pão integral')
    await expect(dieta).toContainText('ou')
    // Em Hoje a mesma alternativa é um botão que grava o consumo. Aqui é texto.
    await expect(dieta.getByRole('button')).toHaveCount(0)
    await expect(dieta.locator('[aria-pressed]')).toHaveCount(0)
  })

  test('a consulta segue de pé offline — o plano está no disco', async ({ page, context }) => {
    await context.setOffline(true)
    await page.reload()

    const treinos = page.getByRole('region', { name: 'Treinos' })
    await treinos.getByText(/Treino B/).click()
    await expect(treinos.getByText('Agachamento Livre')).toBeVisible()
    await expect(treinos).toContainText('Descer até o talo')

    await context.setOffline(false)
  })

  test('o treino que a agenda não marca continua visível na consulta', async ({ page }) => {
    // Semana em que o profissional deixou o Treino B escrito para quando o
    // aluno puder ir mais vezes. Sumir com ele seria esconder prescrição.
    const plano = planoValido<{
      plano: { treino: { agendaSemanal: Record<string, { sessaoId: string | null }> } }
    }>()
    plano.plano.treino.agendaSemanal.ter.sessaoId = 'A'
    plano.plano.treino.agendaSemanal.sex.sessaoId = 'A'

    await importarPlano(page, plano)

    const treinos = page.getByRole('region', { name: 'Treinos' })
    await expect(treinos.getByText(/Treino B/).locator('..')).toContainText(
      'Sem dia marcado nesta semana'
    )
  })
})
