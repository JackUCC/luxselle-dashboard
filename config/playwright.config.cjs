const path = require('path')
const { defineConfig } = require('@playwright/test')

const root = path.resolve(__dirname, '..')

module.exports = defineConfig({
  testDir: path.join(root, 'tests/e2e'),
  timeout: 120000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120000,
  },
})
