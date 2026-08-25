import { expect, test } from '@playwright/test'
import { importarPlano, planoValido } from './fixture'

/**
 * Perfil e histórico de medidas, no OPFS de verdade.
 *
 * É o único lugar onde a promessa central do modelo pode ser conferida como o
 * aluno a viveria: **trocar de profissional não apaga o corpo dele**. Em jsdom
 * isso é asserção sobre um `Map`; aqui é o arquivo que sobreviveu no disco do
 * navegador, atravessando um recarregamento e um plano novo.
 */
test.describe('Perfil', () => {
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
    await page.getByRole('link', { name: 'Perfil', exact: true }).click()
  })

  test('mostra a identificação que veio do arquivo do profissional', async ({ page }) => {
    await expect(page.getByText(/Aluno Exemplo/)).toBeVisible()
    await expect(page.getByText(/1,75 m/)).toBeVisible()
  })

  test('a aferição sobrevive a recarregar — está no disco, não na tela', async ({ page }) => {
    await page.getByLabel('Peso (kg)').fill('82.4')
    await page.getByRole('button', { name: 'Fita métrica' }).click()
    await page.getByLabel('Cintura (cm)').fill('84')
    await page.getByRole('button', { name: 'Registrar aferição' }).click()

    const historico = page.getByRole('list', { name: 'Histórico de aferições' })
    await expect(historico.getByRole('listitem')).toHaveCount(1)
    await expect(historico).toContainText('82,4 kg')

    await page.reload()
    await expect(page.getByRole('list', { name: 'Histórico de aferições' })).toContainText(
      'Cintura 84 cm'
    )
  })

  test('a última aferição já vem preenchida na próxima visita', async ({ page }) => {
    await page.getByLabel('Peso (kg)').fill('82.4')
    await page.getByRole('button', { name: 'Registrar aferição' }).click()
    await expect(page.getByRole('list', { name: 'Histórico de aferições' })).toBeVisible()

    await page.reload()
    // Princípio 2: o aluno confirma, não digita de novo.
    await expect(page.getByLabel('Peso (kg)')).toHaveValue('82.4')
  })

  test('a correção do perfil vai para o disco', async ({ page }) => {
    await page.getByRole('button', { name: 'Corrigir meus dados' }).click()
    await page.getByLabel('Idade (anos)').fill('31')
    await page.getByRole('button', { name: 'Salvar' }).click()

    await expect(page.getByText(/31 anos/)).toBeVisible()
    await page.reload()
    await expect(page.getByText(/31 anos/)).toBeVisible()
  })

  test('trocar de profissional não apaga o histórico do corpo', async ({ page }) => {
    await page.getByLabel('Peso (kg)').fill('82.4')
    await page.getByRole('button', { name: 'Registrar aferição' }).click()
    await expect(page.getByRole('list', { name: 'Histórico de aferições' })).toContainText(
      '82,4 kg'
    )

    // O aluno trocou de nutricionista e importou o arquivo novo.
    const outroPlano = planoValido()
    ;(outroPlano.profissional as { nome: string }).nome = 'Outro Profissional'
    ;(outroPlano.aluno as { idade: number }).idade = 44
    await page.getByRole('link', { name: 'Plano', exact: true }).click()
    await importarPlano(page, outroPlano)
    await expect(page.getByText('Prescrito por Outro Profissional')).toBeVisible()

    await page.getByRole('link', { name: 'Perfil', exact: true }).click()
    await expect(page.getByRole('list', { name: 'Histórico de aferições' })).toContainText(
      '82,4 kg'
    )
    // E o perfil já existente também não é sobrescrito pelo arquivo novo.
    await expect(page.getByText(/30 anos/)).toBeVisible()
  })
})
