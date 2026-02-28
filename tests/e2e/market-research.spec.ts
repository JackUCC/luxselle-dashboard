import { test, expect, type APIRequestContext } from '@playwright/test'

const projectId = '[REDACTED]'
const emulatorBaseUrl = 'http://127.0.0.1:8082'

const clearFirestore = async (request: APIRequestContext) => {
  try {
    await request.delete(
      `${emulatorBaseUrl}/emulator/v1/projects/${projectId}/databases/(default)/documents`,
      { timeout: 5000 }
    )
  } catch {
    // Emulator may not be ready yet. Tests can continue.
  }
}

test.beforeEach(async ({ request }) => {
  await clearFirestore(request)
})

test.afterEach(async ({ request }) => {
  await clearFirestore(request)
})

test('run research shows result or loading then content', async ({ page }) => {
  const selectOption = async (label: string, option: string | RegExp) => {
    await page.getByRole('button', { name: label }).click()
    await page.getByRole('option', { name: option }).first().click()
  }

  await page.route('**/api/market-research/analyse', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          provider: 'openai',
          brand: 'Chanel',
          model: 'Classic Flap',
          estimatedMarketValueEur: 5000,
          priceRangeLowEur: 4500,
          priceRangeHighEur: 5500,
          suggestedBuyPriceEur: 4000,
          suggestedSellPriceEur: 5200,
          demandLevel: 'high',
          priceTrend: 'stable',
          marketLiquidity: 'moderate',
          recommendation: 'buy',
          confidence: 0.85,
          marketSummary: 'Test summary.',
          keyInsights: ['Test insight'],
          riskFactors: [],
          comparables: [],
        },
      }),
    })
  )

  await page.goto('/market-research')

  await selectOption('Brand', 'Chanel')
  await selectOption('Model', 'Classic Flap')
  await selectOption('Category', 'Handbag')
  await selectOption('Condition', /Excellent/)

  await page.getByRole('button', { name: 'Research Market' }).click()

  await expect(page.getByText('Price Intelligence')).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('€5,000')).toBeVisible({ timeout: 15000 })
})
