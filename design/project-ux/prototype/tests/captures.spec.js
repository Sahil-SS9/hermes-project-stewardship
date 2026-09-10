import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const captures = path.resolve(here, '..', '..', 'captures')

async function open(page, route, theme, viewport) {
  await page.setViewportSize(viewport)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`/?theme=${theme}#${route}`)
  await expect(page.locator('h1')).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
}

async function save(page, name, fullPage = false) {
  await page.screenshot({ path: path.join(captures, name), fullPage, animations: 'disabled' })
}

test('capture onboarding review, desktop light', async ({ page }) => {
  await open(page, 'onboarding', 'light', { width: 1440, height: 900 })
  await page.getByLabel(/Project name/).fill('Atlas release readiness')
  await page.getByLabel(/Project key/).fill('ATLAS')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel(/Purpose statement/).fill('Give project leads exact, recoverable stewardship controls before production mutations ship.')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Choose lead' }).click()
  await page.getByLabel('Search discovered profiles').fill('alex')
  await page.getByLabel('Search discovered profiles').press('Enter')
  await page.getByRole('button', { name: 'Add member' }).click()
  await page.getByLabel('Search discovered profiles').fill('mina')
  await page.getByLabel('Search discovered profiles').press('Enter')
  await page.getByRole('button', { name: 'Continue' }).click()
  await save(page, 'onboarding-review-light-1440x900.png')
})

test('capture shared picker, desktop dark', async ({ page }) => {
  await open(page, 'team', 'dark', { width: 1280, height: 800 })
  await page.getByRole('button', { name: 'Add member' }).click()
  await page.getByRole('button', { name: 'Choose profile' }).click()
  await save(page, 'profile-picker-dark-1280x800.png')
})

test('capture team action, tablet light', async ({ page }) => {
  await open(page, 'team', 'light', { width: 768, height: 1024 })
  await page.getByRole('button', { name: 'Transfer lead' }).click()
  await page.getByRole('button', { name: 'Choose profile' }).click()
  await page.getByLabel('Search discovered profiles').fill('jordan')
  await page.getByLabel('Search discovered profiles').press('Enter')
  await save(page, 'team-transfer-light-768x1024.png', true)
})

test('capture member exit ready, desktop light', async ({ page }) => {
  await open(page, 'exit', 'light', { width: 1440, height: 900 })
  await save(page, 'member-exit-ready-light-1440x900.png')
})

test('capture stale preview, narrow dark', async ({ page }) => {
  await open(page, 'exit', 'dark', { width: 390, height: 844 })
  await page.getByRole('tab', { name: 'Stale preview' }).click()
  await save(page, 'member-exit-stale-dark-390x844.png', true)
})

test('capture partial transfer, desktop dark', async ({ page }) => {
  await open(page, 'exit', 'dark', { width: 1280, height: 800 })
  await page.getByRole('tab', { name: 'Partial transfer' }).click()
  await save(page, 'member-exit-partial-dark-1280x800.png', true)
})

test('capture goals and objectives, tablet light', async ({ page }) => {
  await open(page, 'outcomes', 'light', { width: 768, height: 1024 })
  await save(page, 'goals-objectives-light-768x1024.png', true)
})

test('capture lifecycle, narrow dark', async ({ page }) => {
  await open(page, 'lifecycle', 'dark', { width: 390, height: 844 })
  await page.getByRole('button', { name: 'Archive project' }).click()
  await save(page, 'project-archive-dark-390x844.png')
})

test('capture state lab, desktop light', async ({ page }) => {
  await open(page, 'states', 'light', { width: 1440, height: 900 })
  await save(page, 'state-lab-light-1440x900.png', true)
})
