import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'

const FIXTURE = fileURLToPath(new URL('./fixtures/plano-valido.fitvault.json', import.meta.url))

/**
 * O modo execução, no navegador de verdade.
 *
 * É a tela que decide o produto, e a primeira que **escreve** no vault. Os
 * testes aqui cobrem o que nenhum unitário alcança: que a série gravada
 * sobrevive a recarregar a página e que tudo funciona sem rede.
 */
test.describe('executar o treino', () => {
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
    // A linha do tempo precisa estar montada antes de qualquer contagem:
    // `count()` não espera, e sem isto todo teste abaixo se pularia em silêncio.
    await expect(page.locator('.linha__item').first()).toBeVisible()
  })

  /** O fixture só tem treino em seg/ter/qua/sex; nos outros dias não há o que executar. */
  async function temTreinoHoje(page: Page) {
    return (await page.getByRole('link', { name: 'Começar treino' }).count()) > 0
  }

  test('Hoje leva ao modo execução', async ({ page }) => {
    test.skip(!(await temTreinoHoje(page)), 'hoje é dia de descanso no plano do fixture')

    await page.getByRole('link', { name: 'Começar treino' }).click()
    await expect(page.locator('.execucao__exercicio')).toBeVisible()
    await expect(page.locator('.execucao__contagem')).toContainText('/')
  })

  test('a série gravada sobrevive a recarregar — está no vault, não na memória', async ({
    page,
  }) => {
    test.skip(!(await temTreinoHoje(page)), 'hoje é dia de descanso no plano do fixture')

    await page.getByRole('link', { name: 'Começar treino' }).click()
    await page.getByLabel('Carga da série 1, em quilos').fill('72,5'.replace(',', '.'))
    await page.getByRole('button', { name: 'Concluir série 1' }).click()
    await expect(page.getByRole('button', { name: 'Concluir série 1' })).toHaveText('Feita')

    await page.reload()
    await expect(page.getByRole('button', { name: 'Concluir série 1' })).toHaveText('Feita')
    await expect(page.getByLabel('Carga da série 1, em quilos')).toHaveValue('72.5')
  })

  test('o cronômetro de descanso dispara sozinho ao concluir a série', async ({ page }) => {
    test.skip(!(await temTreinoHoje(page)), 'hoje é dia de descanso no plano do fixture')

    await page.getByRole('link', { name: 'Começar treino' }).click()
    await expect(page.getByRole('timer')).toHaveCount(0)

    await page.getByRole('button', { name: 'Concluir série 1' }).click()

    // Na planilha, o intervalo é uma linha de texto que ninguém obedece.
    const cronometro = page.getByRole('timer')
    await expect(cronometro).toBeVisible()
    await expect(cronometro).toContainText('Faltam')
  })

  test('registra offline — a academia tem sinal ruim', async ({ page, context }) => {
    test.skip(!(await temTreinoHoje(page)), 'hoje é dia de descanso no plano do fixture')

    await page.getByRole('link', { name: 'Começar treino' }).click()
    await context.setOffline(true)

    await page.getByRole('button', { name: 'Concluir série 1' }).click()
    await expect(page.getByRole('button', { name: 'Concluir série 1' })).toHaveText('Feita')

    await page.reload()
    await expect(page.getByRole('button', { name: 'Concluir série 1' })).toHaveText('Feita')
  })

  test('grava o registro como JSON legível, por dia', async ({ page }) => {
    test.skip(!(await temTreinoHoje(page)), 'hoje é dia de descanso no plano do fixture')

    await page.getByRole('link', { name: 'Começar treino' }).click()
    await page.getByRole('button', { name: 'Concluir série 1' }).click()
    await expect(page.getByRole('button', { name: 'Concluir série 1' })).toHaveText('Feita')

    const conteudo = await page.evaluate(async () => {
      const raiz = await navigator.storage.getDirectory()
      const vault = await raiz.getDirectoryHandle('vault')
      const registros = await vault.getDirectoryHandle('registros')
      for await (const [nome, handle] of registros.entries()) {
        if (handle.kind === 'file')
          return (await (await registros.getFileHandle(nome)).getFile()).text()
      }
      return null
    })

    expect(conteudo).not.toBeNull()
    expect(conteudo).toContain('\n  ')
    expect(JSON.parse(conteudo!).series).toHaveLength(1)
  })

  test('a carga da série 1 se propaga para as seguintes', async ({ page }) => {
    test.skip(!(await temTreinoHoje(page)), 'hoje é dia de descanso no plano do fixture')

    await page.getByRole('link', { name: 'Começar treino' }).click()
    await page.getByLabel('Carga da série 1, em quilos').fill('80')
    await page.getByRole('button', { name: 'Concluir série 1' }).click()

    // Quem subiu a carga não pode ter que corrigir as outras à mão, entre séries.
    await expect(page.getByLabel('Carga da série 2, em quilos')).toHaveValue('80')
  })
})
