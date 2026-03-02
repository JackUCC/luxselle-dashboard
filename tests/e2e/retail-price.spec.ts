import { test, expect } from '@playwright/test'

test('Retail Price page loads with heading and lookup form', async ({ page }) => {
  await page.goto('/retail-price')

  await expect(page.getByRole('heading', { name: /Retail Price/i })).toBeVisible({ timeout: 15000 })
  await expect(page.getByTestId('retail-description')).toBeVisible()
  await expect(page.getByTestId('retail-lookup-btn')).toBeVisible()
})

test('Retail Price lookup error supports retry and resolves to result', async ({ page }) => {
  let shouldFail = true
  await page.route('**/api/ai/retail-lookup', async (route) => {
    if (shouldFail) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Lookup failed' }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          retailPriceEur: 8200,
          currency: 'EUR',
          productName: 'Chanel Classic Flap Medium',
          note: 'Estimated from recent official boutique references.',
        },
      }),
    })
  })

  await page.goto('/retail-price')
  await page.getByTestId('retail-description').fill('Chanel Classic Flap Medium, black caviar, gold hardware')
  await page.getByTestId('retail-lookup-btn').click()

  await expect(page.getByRole('button', { name: 'Retry lookup' })).toBeVisible()
  shouldFail = false
  await page.getByRole('button', { name: 'Retry lookup' }).click()
  await expect(page.getByTestId('retail-result')).toBeVisible()
  await expect(page.getByText('€8,200')).toBeVisible()
})
