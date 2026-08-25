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

  test('o contador de água sobe, desce e sobrevive a recarregar', async ({ page }) => {
    const mais = page.getByRole('button', { name: 'Registrar mais um copo de água' })
    const menos = page.getByRole('button', { name: 'Tirar um copo de água' })

    await expect(menos).toBeDisabled()
    await mais.click()
    await mais.click()
    await expect(page.getByText('0,5 de 4 L')).toBeVisible()

    await menos.click()
    await expect(page.getByText('0,25 de 4 L')).toBeVisible()

    // Estava só na memória da tela: trocar de aba apagava o dia inteiro.
    await page.reload()
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
      // Sem musculação, o aeróbico ganha cartão próprio em vez de sumir.
      await expect(page.locator('.linha__item--aerobico')).toBeVisible()
    } else {
      expect(temTreino).toBe(1)
      expect(temDescanso).toBe(0)

      // O pré-treino e o aeróbico fazem parte da mesma ida à academia: moram
      // dentro do cartão do treino, não em cartões irmãos.
      const treino = page.locator('.linha__item--treino')
      await expect(treino.getByText('Antes de treinar')).toBeVisible()
      await expect(treino.getByText(/HIIT na esteira/)).toBeVisible()
    }
  })

  test('o suplemento aparece dentro da refeição a que pertence', async ({ page }) => {
    const cafe = page.locator('.linha__item--refeicao').first()
    await expect(cafe.getByText('Magnésio dimalato')).toBeVisible()
    await expect(cafe.getByText('Ômega 3')).toBeVisible()
  })

  test('a refeição abre o detalhe, escolhe a alternativa e soma os macros', async ({ page }) => {
    await page.getByText('Almoço').click()
    await expect(page.getByRole('heading', { name: 'Almoço' })).toBeVisible()

    // Na planilha isto era uma célula com "Filé de frango 150g OU Tilápia
    // 150g", que o aluno tinha que decifrar.
    await expect(page.getByText('0 de 170 g')).toBeVisible()
    await page.getByRole('button', { name: /Tilápia/ }).click()
    await expect(page.getByRole('button', { name: /Tilápia/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    await expect(page.getByText('45 de 170 g')).toBeVisible()

    await page.reload()
    await expect(page.getByRole('button', { name: /Tilápia/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    )

    await page.getByRole('button', { name: 'Voltar para Hoje' }).click()
    await expect(page.getByText('1 de 3 escolhidos')).toBeVisible()
  })

  test('escolher a refeição funciona offline — a cozinha também tem sinal ruim', async ({
    page,
    context,
  }) => {
    await page.getByText('Almoço').click()
    await expect(page.getByRole('heading', { name: 'Almoço' })).toBeVisible()
    await context.setOffline(true)

    await page.getByRole('button', { name: /Batata cozida/ }).click()
    await expect(page.getByRole('button', { name: /Batata cozida/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    )

    await page.reload()
    await expect(page.getByRole('button', { name: /Batata cozida/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })
})
