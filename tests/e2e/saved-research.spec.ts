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

test('Saved Research page shows empty state and primary CTA when no items exist', async ({ page }) => {
  await page.goto('/saved-research')

  await expect(page.getByRole('heading', { level: 1, name: 'Saved Research' })).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('button', { name: 'All' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Starred' })).toBeVisible()
  await expect(page.getByText('No saved research yet')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Go to Market Research' })).toBeVisible()
})
