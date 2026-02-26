import { test, expect, type APIRequestContext } from '@playwright/test'

const projectId = '[REDACTED]'
const emulatorBaseUrl = 'http://127.0.0.1:8082'

const clearFirestore = async (request: APIRequestContext) => {
  try {
    await request.delete(
      `${emulatorBaseUrl}/emulator/v1/projects/${projectId}/databases/(default)/documents`
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

test('Invoices page loads and shows list or empty state', async ({ page }) => {
  await page.goto('/invoices')

  await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible({ timeout: 15000 })
  // Either empty state or list is visible
  const emptyOrList = page.getByText('No invoices yet').or(page.getByText('All invoices'))
  await expect(emptyOrList).toBeVisible({ timeout: 5000 })
})

test('Create in-person invoice opens modal and can be closed', async ({ page }) => {
  await page.goto('/invoices')

  await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible({ timeout: 15000 })

  // Click create CTA (header button or empty state)
  const createCta = page.getByRole('button', { name: /Create invoice/i }).first()
  await createCta.click()

  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Create in-person invoice' })).toBeVisible()

  // Close via X or Cancel
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
