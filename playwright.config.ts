import { defineConfig, devices } from '@playwright/test'

// OPFS não existe em jsdom: toda integração de armazenamento e o fluxo offline
// são verificados aqui, em Chromium de verdade.

// Em CI e em máquina de desenvolvimento, o Playwright resolve o próprio Chromium
// — é o caminho padrão e nada precisa ser configurado. A variável existe só para
// ambientes que trazem o browser pré-instalado fora do cache do Playwright
// (contêineres de desenvolvimento remoto), onde a resolução automática aponta
// para uma revisão que não está no disco.
const chromiumPreInstalado = process.env.PLAYWRIGHT_CHROMIUM_PATH

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173/my-fitness-app/',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      // O produto é usado com uma mão, no celular. O E2E roda no mesmo alvo.
      use: {
        ...devices['Pixel 7'],
        ...(chromiumPreInstalado
          ? { launchOptions: { executablePath: chromiumPreInstalado } }
          : {}),
      },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    url: 'http://localhost:4173/my-fitness-app/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
