import { expect, test } from '@playwright/test'

/**
 * Prova o pipeline antes de existir produto: o app shell carrega sob o base path
 * do GitHub Pages, o service worker registra e o manifest habilita instalação.
 */
test.describe('casca publicada', () => {
  test('carrega sob o base path e abre em Hoje', async ({ page }) => {
    await page.goto('./')
    await expect(page).toHaveURL(/\/my-fitness-app\/#\/hoje$/)
    await expect(page.getByRole('heading', { name: 'Nenhum plano ainda' })).toBeVisible()
  })

  test('oferece os quatro destinos e navega entre eles', async ({ page }) => {
    await page.goto('./')
    for (const destino of ['Hoje', 'Evolução', 'Perfil', 'Plano']) {
      await expect(page.getByRole('link', { name: destino, exact: true })).toBeVisible()
    }
    await page.getByRole('link', { name: 'Perfil', exact: true }).click()
    await expect(page).toHaveURL(/#\/perfil$/)
  })

  test('registra o service worker (requisito de uso offline)', async ({ page }) => {
    await page.goto('./')
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
      timeout: 15_000,
    })
    expect(await page.evaluate(() => navigator.serviceWorker.controller?.state)).toBe('activated')
  })

  test('publica um manifest instalável em pt-BR', async ({ page, request }) => {
    await page.goto('./')
    const href = await page.getAttribute('link[rel="manifest"]', 'href')
    expect(href).toBeTruthy()
    const manifest = await (await request.get(new URL(href!, page.url()).toString())).json()
    expect(manifest.display).toBe('standalone')
    expect(manifest.lang).toBe('pt-BR')
    expect(manifest.start_url).toContain('/my-fitness-app/')
  })

  test('OPFS está disponível — é onde o vault do aluno vai morar', async ({ page }) => {
    await page.goto('./')
    const temOpfs = await page.evaluate(async () => {
      const raiz = await navigator.storage.getDirectory()
      return typeof raiz.getFileHandle === 'function'
    })
    expect(temOpfs).toBe(true)
  })
})
