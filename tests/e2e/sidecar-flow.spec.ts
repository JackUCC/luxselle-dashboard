import { test, expect, type APIRequestContext, type Page } from '@playwright/test'

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

const expectNoPageLevelHorizontalOverflow = async (page: Page) => {
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  expect(hasOverflow).toBeFalsy()
}

test.beforeEach(async ({ request, page }) => {
  await clearFirestore(request)
  await page.setViewportSize({ width: 360, height: 900 })
})

test.afterEach(async ({ request }) => {
  await clearFirestore(request)
})

test('sidecar journey preserves mode across evaluator -> inventory -> invoices and exits to same route', async ({ page }) => {
  await page.goto('/buy-box?mode=sidecar')

  await expect(page.getByRole('heading', { name: 'Sidecar' })).toBeVisible()
  await expectNoPageLevelHorizontalOverflow(page)

  await page.getByRole('button', { name: 'Open navigation menu' }).click()
  await page.getByRole('link', { name: 'Inventory' }).click()

  await expect(page).toHaveURL(/\/inventory\?.*mode=sidecar/)
  await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Add$/ })).toBeVisible()
  await expectNoPageLevelHorizontalOverflow(page)

  await page.getByRole('button', { name: 'Open navigation menu' }).click()
  await page.getByRole('link', { name: 'Invoices' }).click()

  await expect(page).toHaveURL(/\/invoices\?.*mode=sidecar/)
  await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible()
  await expect(page.getByTestId('invoice-create-cta')).toBeVisible()
  await expectNoPageLevelHorizontalOverflow(page)

  await page.getByTestId('invoice-create-cta').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.getByRole('link', { name: 'Exit' }).click()
  await expect(page).toHaveURL(/\/invoices(\?.*)?$/)

  const urlState = await page.evaluate(() => {
    const params = new URLSearchParams(window.location.search)
    return {
      pathname: window.location.pathname,
      hasMode: params.has('mode'),
    }
  })

  expect(urlState.pathname).toBe('/invoices')
  expect(urlState.hasMode).toBeFalsy()
})
