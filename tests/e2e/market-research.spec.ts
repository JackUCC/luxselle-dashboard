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

test('deep-dive updates freshness badge and keeps results visible', async ({ page }) => {
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
          providerStatus: 'available',
          brand: 'Chanel',
          model: 'Classic Flap',
          estimatedMarketValueEur: 5100,
          priceRangeLowEur: 4700,
          priceRangeHighEur: 5600,
          suggestedBuyPriceEur: 3900,
          suggestedSellPriceEur: 5200,
          demandLevel: 'high',
          priceTrend: 'stable',
          marketLiquidity: 'moderate',
          recommendation: 'buy',
          confidence: 0.84,
          marketSummary: 'Initial analysis summary.',
          keyInsights: ['Initial'],
          riskFactors: [],
          comparables: [],
          intel: {
            freshnessStatus: 'live',
            snapshotAgeMinutes: 0,
            cached: false,
          },
        },
      }),
    })
  )

  await page.route('**/api/market-research/deep-dive', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          runId: 'run-test-1',
          snapshot: {
            id: 'snap-1',
            generatedAt: new Date(Date.now() - 120 * 60_000).toISOString(),
            freshnessStatus: 'stale',
            snapshotAgeMinutes: 120,
          },
          result: {
            provider: 'openai',
            providerStatus: 'available',
            brand: 'Chanel',
            model: 'Classic Flap',
            estimatedMarketValueEur: 5050,
            priceRangeLowEur: 4600,
            priceRangeHighEur: 5550,
            suggestedBuyPriceEur: 3800,
            suggestedSellPriceEur: 5100,
            demandLevel: 'high',
            priceTrend: 'stable',
            marketLiquidity: 'moderate',
            recommendation: 'buy',
            confidence: 0.82,
            marketSummary: 'Deep-dive summary.',
            keyInsights: ['Deep-dive'],
            riskFactors: [],
            comparables: [],
            intel: {
              freshnessStatus: 'stale',
              snapshotAgeMinutes: 120,
              cached: true,
              mode: 'deep_dive',
            },
          },
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
  await expect(page.getByTestId('market-research-freshness-badge')).toContainText(/Live|Fresh/)

  await page.getByTestId('market-research-deep-dive').click()
  await expect(page.getByTestId('market-research-freshness-badge')).toContainText(/Cached/)
  await expect(page.getByText('Deep-dive summary.')).toBeVisible()
})
