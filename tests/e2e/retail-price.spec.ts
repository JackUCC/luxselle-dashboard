import { test, expect } from '@playwright/test'

test('Retail Price page loads with heading and lookup form', async ({ page }) => {
  await page.goto('/retail-price')

  await expect(page.getByRole('heading', { name: /Retail Price/i })).toBeVisible({ timeout: 15000 })
  await expect(page.getByTestId('retail-description')).toBeVisible()
  await expect(page.getByTestId('retail-lookup-btn')).toBeVisible()
})
