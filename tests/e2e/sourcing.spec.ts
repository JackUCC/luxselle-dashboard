import { test, expect, type APIRequestContext } from '@playwright/test'

const projectId = 'luxselle-dashboard'
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

test('New Request opens form and submit creates request', async ({ page }) => {
  await page.goto('/sourcing')

  await page.getByRole('button', { name: 'New Request' }).click()
  await expect(page.getByRole('heading', { name: 'New Sourcing Request' })).toBeVisible()

  await page.locator('input[name="customerName"]').fill('E2E Customer')
  await page.locator('textarea[name="queryText"]').fill('Chanel Classic Flap')
  await page.locator('input[name="budget"]').fill('5000')
  await page.getByRole('button', { name: 'Create Request' }).click()

  await expect(page.getByText('Sourcing request created')).toBeVisible({ timeout: 10000 })
  await expect(page.getByRole('heading', { name: 'New Sourcing Request' })).toHaveCount(0)
})
