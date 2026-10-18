import { defineConfig } from '@playwright/test'

// e2e of the web build (npm run e2e:web builds dist/ with BASE first): dist/ is served under BASE like GitHub Pages.
const BASE = process.env.BASE || '/GWENT-Thai-wiki/'
const PORT = 5193
export default defineConfig({
  testDir: 'tests/e2e-web',
  timeout: 90_000,
  workers: 1,
  reporter: 'list',
  use: { browserName: 'chromium', baseURL: `http://127.0.0.1:${PORT}${BASE}` },
  webServer: { command: 'node tests/e2e-web/serve.mjs', env: { BASE, PORT: String(PORT) }, url: `http://127.0.0.1:${PORT}${BASE}`, reuseExistingServer: false },
})
