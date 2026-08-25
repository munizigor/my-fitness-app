import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

const FIXTURE = fileURLToPath(new URL('./fixtures/plano-valido.fitvault.json', import.meta.url))

/**
 * A tela inicial depois de importar o plano.
 *
 * Aqui o app deixa de ser a planilha com CSS melhor: as três abas do arquivo
 * (treino, nutrição, suplementos) chegam ao aluno já cruzadas em uma linha do
 * tempo do dia.
 */
test.describe('Hoje', () => {
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
    await page.getByLabel('Importar arquivo do profissional').setInputFiles(FIXTURE)
    await expect(page.getByText('Prescrito por Ana Ribeiro')).toBeVisible()
    await page.getByRole('link', { name: 'Hoje', exact: true }).click()
  })

  test('abre no dia, com o alvo de água do plano', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Registrar mais um copo de água' })).toBeVisible()
    await expect(page.getByText(/de 4 L/)).toBeVisible()
  })

  test('mostra as refeições do plano em ordem', async ({ page }) => {
    await expect(page.getByText('Café da manhã')).toBeVisible()
    await expect(page.getByText('Lanche da manhã')).toBeVisible()
    await expect(page.getByText('Almoço')).toBeVisible()
  })

  test('o contador de água responde ao toque', async ({ page }) => {
    const botao = page.getByRole('button', { name: 'Registrar mais um copo de água' })
    await botao.click()
    await expect(page.getByText('0,25 de 4 L')).toBeVisible()
  })

  test('a linha do tempo sobrevive a recarregar', async ({ page }) => {
    await page.reload()
    await expect(page.getByText('Café da manhã')).toBeVisible()
  })

  test('o dia continua montado offline — a academia tem sinal ruim', async ({ page, context }) => {
    await context.setOffline(true)
    await page.reload()
    await expect(page.getByText('Café da manhã')).toBeVisible()
  })

  test('o dia da semana e o conteúdo batem com a agenda do plano', async ({ page }) => {
    // O fixture tem treino em seg/ter/qua/sex, só aeróbico no sábado e descanso
    // em qui/dom. Qual deles aparece depende do dia real em que o teste roda,
    // então a verificação é da coerência entre os dois, não de um dia fixo.
    const titulo = await page.locator('.hoje__dia').textContent()
    const temTreino = await page.locator('.linha__item--treino').count()
    const temDescanso = await page.getByText('Hoje é dia de descanso').count()

    if (titulo === 'Quinta-feira' || titulo === 'Domingo') {
      expect(temTreino).toBe(0)
      expect(temDescanso).toBe(1)
    } else if (titulo === 'Sábado') {
      expect(temTreino).toBe(0)
      await expect(page.getByText('Aeróbico')).toBeVisible()
    } else {
      expect(temTreino).toBe(1)
      expect(temDescanso).toBe(0)
      // O suplemento ancorado "antes do treino" só existe em dia de treino.
      await expect(page.getByText('Suplementos · antes do treino')).toBeVisible()
    }
  })

  test('o suplemento aparece grudado na refeição a que pertence', async ({ page }) => {
    const titulos = await page.locator('.linha__titulo').allTextContents()
    const indiceCafe = titulos.indexOf('Café da manhã')
    expect(titulos[indiceCafe + 1]).toBe('Suplementos · depois da refeição 1')
  })
})
