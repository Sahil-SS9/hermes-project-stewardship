import { expect, test } from '@playwright/test'

async function gotoRoute(page, route, theme = 'light') {
  await page.goto(`/?theme=${theme}#${route}`)
  await expect(page.locator('h1')).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
}

async function expectNoPageOverflow(page) {
  const geometry = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.getBoundingClientRect().width,
  }))
  expect(geometry.scrollWidth, JSON.stringify(geometry)).toBeLessThanOrEqual(geometry.clientWidth + 1)
  expect(geometry.bodyWidth, JSON.stringify(geometry)).toBeLessThanOrEqual(geometry.clientWidth + 1)
}

const tokens = {
  light: {
    '--dy-bg': '#f6f7f9', '--dy-surface': '#ffffff', '--dy-surface-subtle': '#f0f2f5', '--dy-surface-strong': '#e8ebf0',
    '--dy-text': '#15171c', '--dy-text-2': '#515968', '--dy-text-3': '#626c7b', '--dy-border': '#d7dce4',
    '--dy-control-border': '#87909d', '--dy-action': '#3654c7', '--dy-action-hover': '#2945b4', '--dy-accent-text': '#293f9e',
    '--dy-accent-soft': '#eef1ff', '--dy-accent-border': '#b8c4f0', '--dy-shadow': '0 10px 28px rgba(31, 42, 68, 0.08)',
    '--dy-success': '#136c4a', '--dy-success-bg': '#e7f6ef',
    '--dy-warning': '#805200', '--dy-warning-bg': '#fff3d4', '--dy-danger': '#a72a2a', '--dy-danger-bg': '#ffeded',
    '--dy-info': '#315ca8', '--dy-info-bg': '#eaf2ff', '--dy-neutral': '#596273', '--dy-neutral-bg': '#edf0f4',
    '--dy-focus': '#3654c7', '--dy-disabled-text': '#515968', '--dy-disabled-bg': '#e8ebf0',
  },
  dark: {
    '--dy-bg': '#0f1217', '--dy-surface': '#171b22', '--dy-surface-subtle': '#1d222b', '--dy-surface-strong': '#252b36',
    '--dy-text': '#f3f5f7', '--dy-text-2': '#b6beca', '--dy-text-3': '#949eac', '--dy-border': '#2e3541',
    '--dy-control-border': '#5f6977', '--dy-action': '#3654c7', '--dy-action-hover': '#4662d4', '--dy-accent-text': '#c2cbff',
    '--dy-accent-soft': '#232c4f', '--dy-accent-border': '#46558f', '--dy-shadow': '0 12px 30px rgba(0, 0, 0, 0.24)',
    '--dy-success': '#72cda2', '--dy-success-bg': '#16372a',
    '--dy-warning': '#f0bd64', '--dy-warning-bg': '#3a2c14', '--dy-danger': '#ff9188', '--dy-danger-bg': '#40201f',
    '--dy-info': '#9ab9ff', '--dy-info-bg': '#1c2d4a', '--dy-neutral': '#bac2ce', '--dy-neutral-bg': '#2a303a',
    '--dy-focus': '#8fa2ff', '--dy-disabled-text': '#b6beca', '--dy-disabled-bg': '#252b36',
  },
}

for (const theme of ['light', 'dark']) {
  test(`exact Dockyard colour token mapping: ${theme}`, async ({ page }) => {
    await gotoRoute(page, 'overview', theme)
    const actual = await page.evaluate((names) => {
      const styles = getComputedStyle(document.documentElement)
      return Object.fromEntries(names.map((name) => [name, styles.getPropertyValue(name).trim().toLowerCase()]))
    }, Object.keys(tokens[theme]))
    expect(actual).toEqual(tokens[theme])
  })
}

const viewports = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
]

for (const viewport of viewports) {
  for (const theme of ['light', 'dark']) {
    test(`baseline layout ${viewport.width}x${viewport.height} ${theme}`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await gotoRoute(page, 'overview', theme)
      await expect(page.getByRole('navigation', { name: 'Prototype journeys' })).toBeVisible()
      await expect(page.getByRole('button', { name: /Overview/ })).toHaveAttribute('aria-current', 'page')
      await expectNoPageOverflow(page)
      if (viewport.width <= 880) {
        const bounds = await page.evaluate(() => {
          const nav = document.querySelector('nav[aria-label="Prototype journeys"]').getBoundingClientRect()
          const active = document.querySelector('.nav-item[aria-current="page"]').getBoundingClientRect()
          return { navLeft: nav.left, navRight: nav.right, activeLeft: active.left, activeRight: active.right }
        })
        expect(bounds.activeLeft).toBeGreaterThanOrEqual(bounds.navLeft - 1)
        expect(bounds.activeRight).toBeLessThanOrEqual(bounds.navRight + 1)
      }
    })
  }
}

const pairwiseRoutes = [
  ['onboarding', 'dark', { width: 1280, height: 800 }],
  ['team', 'light', { width: 768, height: 1024 }],
  ['exit', 'dark', { width: 390, height: 844 }],
  ['outcomes', 'light', { width: 1440, height: 900 }],
  ['lifecycle', 'dark', { width: 390, height: 844 }],
  ['states', 'light', { width: 768, height: 1024 }],
]

for (const [route, theme, viewport] of pairwiseRoutes) {
  test(`route layout ${route} ${viewport.width}x${viewport.height} ${theme}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await gotoRoute(page, route, theme)
    await expectNoPageOverflow(page)
    if (viewport.width <= 880) {
      const bounds = await page.evaluate(() => {
        const nav = document.querySelector('nav[aria-label="Prototype journeys"]').getBoundingClientRect()
        const active = document.querySelector('.nav-item[aria-current="page"]').getBoundingClientRect()
        return { navLeft: nav.left, navRight: nav.right, activeLeft: active.left, activeRight: active.right }
      })
      expect(bounds.activeLeft).toBeGreaterThanOrEqual(bounds.navLeft - 1)
      expect(bounds.activeRight).toBeLessThanOrEqual(bounds.navRight + 1)
    }
  })
}

test('onboarding validates all steps and keeps assessment separate', async ({ page }) => {
  await gotoRoute(page, 'onboarding')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByTestId('onboarding-validation')).toContainText('Project name is required')

  await page.getByLabel(/Project name/).fill('Atlas release readiness')
  await page.getByLabel(/Project key/).fill('atlas!')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByTestId('onboarding-validation')).toContainText('Project key')
  await page.getByLabel(/Project key/).fill('ATLAS')
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.getByLabel(/Purpose statement/).fill('Give project leads exact, recoverable stewardship controls before production mutations ship.')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Choose lead' }).click()
  await page.getByLabel('Search discovered profiles').fill('alex')
  await page.getByLabel('Search discovered profiles').press('Enter')
  await expect(page.getByText('Alex Morgan', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Add member' }).click()
  await page.getByLabel('Search discovered profiles').fill('mina')
  await page.getByLabel('Search discovered profiles').press('Enter')
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByTestId('preflight')).toContainText('Assessment excluded')
  await expect(page.getByRole('button', { name: 'Run first assessment' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Create synthetic project' }).click()
  await expect(page.getByText('No assessment was started as part of onboarding.')).toBeVisible()
  await page.getByRole('button', { name: 'Run first assessment' }).click()
  await expect(page.getByTestId('assessment-success')).toContainText('ASSESS-SYNTH-001')
})

test('shared picker supports disabled availability, arrows, Enter, Escape, and focus restoration', async ({ page }) => {
  await gotoRoute(page, 'team')
  await page.getByRole('button', { name: 'Add member' }).click()
  const trigger = page.getByRole('button', { name: 'Choose profile' })
  await trigger.click()
  const search = page.getByLabel('Search discovered profiles')
  await expect(search).toBeFocused()
  const unavailable = page.getByRole('option', { name: /Orbit.*Unavailable/i })
  await expect(unavailable).toBeVisible()
  await expect(unavailable).toBeDisabled()
  await expect(page.getByText('Hermes profiles are created outside Project Stewardship')).toBeVisible()

  await search.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(trigger).toBeFocused()

  await trigger.click()
  await expect(search).toBeFocused()
  await search.press('ArrowDown')
  await search.press('ArrowUp')
  await search.press('Enter')
  await expect(page.getByTestId('add-panel')).toContainText('Teo Brooks')
  await page.getByRole('button', { name: 'Confirm add' }).click()
  await expect(page.getByTestId('team-success')).toContainText('Teo Brooks joined')
})

test('dialog focus is trapped, Escape closes, and trigger focus is restored', async ({ page }) => {
  await gotoRoute(page, 'team')
  const minaRow = page.getByRole('row').filter({ hasText: 'Mina Patel' })
  const remove = minaRow.getByRole('button', { name: 'Remove' })
  await remove.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const close = dialog.getByRole('button', { name: /Close Remove member/ })
  const confirm = dialog.getByRole('button', { name: 'Confirm removal' })
  await close.focus()
  await page.keyboard.press('Shift+Tab')
  await expect(confirm).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(close).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(remove).toBeFocused()
})

test('dialog and failure states expose screen-reader names and live severity', async ({ page }) => {
  await gotoRoute(page, 'team')
  await page.getByRole('button', { name: 'Add member' }).click()
  await page.getByRole('button', { name: 'Choose profile' }).click()
  const picker = page.getByRole('dialog', { name: 'Choose a profile to add' })
  await expect(picker).toHaveAttribute('aria-modal', 'true')
  await expect(picker.getByRole('combobox', { name: 'Search discovered profiles' })).toBeVisible()
  await expect(picker.getByRole('listbox', { name: 'Hermes profiles' })).toBeVisible()
  await expect(picker.getByRole('option', { name: /Orbit.*Unavailable/i })).toHaveAttribute('aria-disabled', 'true')
  await page.keyboard.press('Escape')

  await gotoRoute(page, 'exit')
  await page.getByRole('tab', { name: 'Permission denied' }).click()
  const denied = page.getByRole('alert')
  await expect(denied).toContainText('Permission denied')
  await expect(denied).toContainText('No preview authorisation or transfer write was attempted')
})

test('add, remove-with-zero-work, lead transfer, and only-lead guard are interactive', async ({ page }) => {
  await gotoRoute(page, 'team')
  const alexRow = page.getByRole('row').filter({ hasText: 'Alex Morgan' })
  await expect(alexRow.getByRole('button', { name: 'Remove lead (blocked)' })).toBeDisabled()

  const minaRow = page.getByRole('row').filter({ hasText: 'Mina Patel' })
  await minaRow.getByRole('button', { name: 'Remove' }).click()
  await page.getByRole('button', { name: 'Confirm removal' }).click()
  await expect(page.getByTestId('team-success')).toContainText('0 affected items')
  await expect(page.getByRole('row').filter({ hasText: 'Mina Patel' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Add member' }).click()
  await page.getByRole('button', { name: 'Choose profile' }).click()
  await page.getByLabel('Search discovered profiles').fill('teo')
  await page.getByLabel('Search discovered profiles').press('Enter')
  await page.getByRole('button', { name: 'Confirm add' }).click()
  await expect(page.getByRole('row').filter({ hasText: 'Teo Brooks' })).toBeVisible()

  await page.getByRole('button', { name: 'Transfer lead' }).click()
  await page.getByRole('button', { name: 'Choose profile' }).click()
  await page.getByLabel('Search discovered profiles').fill('jordan')
  await page.getByLabel('Search discovered profiles').press('Enter')
  await page.getByRole('button', { name: 'Confirm lead transfer' }).click()
  const jordanRow = page.getByRole('row').filter({ hasText: 'Jordan Lee' })
  await expect(jordanRow).toContainText('Lead')
  await expect(jordanRow.getByRole('button', { name: 'Remove lead (blocked)' })).toBeDisabled()
})

test('member exit enforces exact complete scope and confirms fingerprint', async ({ page }) => {
  await gotoRoute(page, 'exit')
  await expect(page.getByText('4 of 4 · complete')).toBeVisible()
  await expect(page.locator('.work-list input[type="checkbox"]')).toHaveCount(0)
  await expect(page.getByText('There is no subset selection.')).toBeVisible()
  await page.getByRole('button', { name: 'Choose replacement' }).click()
  await page.getByLabel('Search discovered profiles').fill('mina')
  await page.getByLabel('Search discovered profiles').press('Enter')
  await page.getByLabel('I confirm this exact 4-item scope and fingerprint.').check()
  await page.getByRole('button', { name: 'Start exact transfer' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('sha256:8a37c0e7b214b3ad')
  await expect(dialog.getByRole('button', { name: /cancel|rollback|reverse/i })).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Confirm and start' }).click()
  await expect(page.getByTestId('exit-complete')).toContainText('all 4 items')
})

test('stale, incomplete, blocked, unreadable, offline, denied, and partial recovery states are exercised', async ({ page }) => {
  await gotoRoute(page, 'exit')
  await page.getByRole('tab', { name: 'Stale preview' }).click()
  await expect(page.getByTestId('stale-preview')).toContainText('No transfer was started')
  await page.getByRole('button', { name: 'Refresh exact preview' }).click()
  await expect(page.getByText('Membership revision advanced from 42 to 43')).toBeVisible()
  await expect(page.getByText('sha256:9bd1f77e4c089c31')).toBeVisible()

  await page.getByRole('tab', { name: 'Incomplete list' }).click()
  await expect(page.getByTestId('incomplete-preview')).toContainText('cannot produce a confirmation fingerprint')
  await expect(page.getByRole('button', { name: 'Start exact transfer' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Load every page' }).click()
  await expect(page.getByText('8 of 8 · complete')).toBeVisible()

  await page.getByRole('tab', { name: 'Active blockers' }).click()
  await expect(page.getByTestId('active-blockers')).toContainText('claimed/running and scheduled', { ignoreCase: true })
  await expect(page.getByText('TASK-190')).toBeVisible()
  await expect(page.getByText('TASK-191')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start exact transfer' })).toHaveCount(0)

  await page.getByRole('tab', { name: 'Unreadable' }).click()
  await expect(page.getByTestId('unreadable-state')).toContainText('member cannot depart')
  await page.getByRole('button', { name: 'Retry canonical read' }).click()
  await expect(page.getByText('Canonical read recovered')).toBeVisible()

  await page.getByRole('tab', { name: 'Offline' }).click()
  await expect(page.getByTestId('offline-state')).toContainText('no mutation was sent', { ignoreCase: true })
  await page.getByRole('button', { name: 'Retry connection' }).click()
  await expect(page.locator('.exit-stage')).toHaveAttribute('data-scenario', 'ready')

  await page.getByRole('tab', { name: 'Permission denied' }).click()
  await expect(page.getByTestId('permission-state')).toContainText('membership.admin')
  await page.getByRole('button', { name: 'Retry access check' }).click()
  await expect(page.getByText('Access is still denied')).toBeVisible()

  await page.getByRole('tab', { name: 'Partial transfer' }).click()
  await expect(page.getByTestId('partial-transfer')).toContainText('Two host writes are committed')
  await expect(page.getByRole('button', { name: /cancel|rollback|reverse/i })).toHaveCount(0)
  await page.getByRole('button', { name: 'Resume remaining items' }).click()
  await expect(page.getByTestId('partial-transfer')).toContainText('Canonical readback proves all 4 assignments')
  await expect(page.getByText('departed', { exact: true })).toBeVisible()
})

test('goals and objectives create, edit, archive, restore, and preserve unlinked items', async ({ page }) => {
  await gotoRoute(page, 'outcomes')
  const firstGoal = page.locator('.goal-card').filter({ hasText: 'Make project handoffs boring' })
  await expect(firstGoal.locator('.objective-row')).toHaveCount(2)
  await expect(page.locator('.unlinked-card').filter({ hasText: 'Explore operator training format' })).toBeVisible()

  await page.getByRole('button', { name: 'Create goal' }).click()
  await page.getByLabel('Title').fill('Clarify operator recovery')
  await page.getByLabel('Description').fill('Make resumable operations legible to project administrators.')
  await page.getByRole('button', { name: 'Save goal' }).click()
  let createdGoal = page.locator('.goal-card').filter({ hasText: 'Clarify operator recovery' })
  await expect(createdGoal).toBeVisible()
  await createdGoal.getByRole('button', { name: 'Edit' }).click()
  await page.getByLabel('Title').fill('Clarify operator recovery paths')
  await page.getByRole('button', { name: 'Save goal' }).click()
  createdGoal = page.locator('.goal-card').filter({ hasText: 'Clarify operator recovery paths' })
  await createdGoal.getByRole('button', { name: 'Archive' }).click()
  await expect(createdGoal).toHaveCount(0)
  const archivedGoal = page.locator('.archive-items > div').filter({ hasText: 'Clarify operator recovery paths' })
  await archivedGoal.getByRole('button', { name: 'Restore goal' }).click()
  await expect(page.locator('.goal-card').filter({ hasText: 'Clarify operator recovery paths' })).toBeVisible()

  await page.getByRole('button', { name: 'Create objective' }).click()
  await page.getByLabel('Title').fill('Document recovery ownership')
  await page.getByRole('button', { name: 'Save objective' }).click()
  let createdObjective = page.locator('.unlinked-card').filter({ hasText: 'Document recovery ownership' })
  await expect(createdObjective).toBeVisible()
  await createdObjective.getByRole('button', { name: 'Edit or link' }).click()
  await page.getByLabel('Goal link').selectOption('GOAL-01')
  await page.getByRole('button', { name: 'Save objective' }).click()
  createdObjective = firstGoal.locator('.objective-row').filter({ hasText: 'Document recovery ownership' })
  await expect(createdObjective).toBeVisible()
  await createdObjective.getByRole('button', { name: 'Archive' }).click()
  const archivedObjective = page.locator('.archive-items > div').filter({ hasText: 'Document recovery ownership' })
  await archivedObjective.getByRole('button', { name: 'Restore objective' }).click()
  await expect(firstGoal.locator('.objective-row').filter({ hasText: 'Document recovery ownership' })).toBeVisible()
})

test('milestone and project archive/restore are archive-first and avoid workflow pause claims', async ({ page }) => {
  await gotoRoute(page, 'lifecycle')
  await expect(page.getByRole('button', { name: /delete|purge/i })).toHaveCount(0)
  await page.getByRole('button', { name: 'Archive project' }).click()
  const projectDialog = page.getByRole('dialog')
  await expect(projectDialog).toContainText('Workflow execution is not represented as paused')
  await expect(projectDialog).toContainText('Canonical project, board, tasks, and repository remain untouched')
  const archiveActions = projectDialog.locator('.modal-actions button')
  await expect(archiveActions.nth(0)).toHaveText('Keep active')
  await expect(archiveActions.nth(1)).toHaveText('Confirm archive')
  await expect(archiveActions.nth(1)).toHaveClass(/warning-action/)
  await projectDialog.getByRole('button', { name: 'Confirm archive' }).click()
  await expect(page.getByRole('button', { name: 'Restore project' })).toBeVisible()
  await page.getByRole('button', { name: 'Restore project' }).click()
  await expect(page.getByRole('button', { name: 'Archive project' })).toBeVisible()

  const activeMilestone = page.locator('.milestone-row').filter({ hasText: 'Phase 2 interaction approval' })
  await activeMilestone.getByRole('button', { name: 'Archive' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm archive' }).click()
  await expect(activeMilestone.getByRole('button', { name: 'Restore' })).toBeVisible()
  await activeMilestone.getByRole('button', { name: 'Restore' }).click()
  await expect(activeMilestone.getByRole('button', { name: 'Archive' })).toBeVisible()
})

test('reduced motion removes meaningful animation and transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await gotoRoute(page, 'onboarding', 'dark')
  const values = await page.evaluate(() => {
    const content = getComputedStyle(document.querySelector('.wizard-content'))
    const nav = getComputedStyle(document.querySelector('.nav-item'))
    const skeletonHost = document.querySelector('.skeleton-stack span')
    return {
      animationDuration: content.animationDuration,
      transitionDuration: nav.transitionDuration,
      skeletonPresent: Boolean(skeletonHost),
    }
  })
  expect(parseFloat(values.animationDuration)).toBeLessThanOrEqual(0.00001)
  expect(parseFloat(values.transitionDuration)).toBeLessThanOrEqual(0.00001)
})

function channel(value) {
  const numeric = value / 255
  return numeric <= 0.04045 ? numeric / 12.92 : ((numeric + 0.055) / 1.055) ** 2.4
}
function luminance(rgb) {
  const match = rgb.match(/[\d.]+/g).map(Number)
  return 0.2126 * channel(match[0]) + 0.7152 * channel(match[1]) + 0.0722 * channel(match[2])
}
function ratio(foreground, background) {
  const a = luminance(foreground)
  const b = luminance(background)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

for (const theme of ['light', 'dark']) {
  test(`selected, disabled, warning, and error contrast meet AA in ${theme}`, async ({ page }) => {
    await gotoRoute(page, 'states', theme)
    const samples = await page.evaluate(() => {
      const read = (selector) => {
        const style = getComputedStyle(document.querySelector(selector))
        return { color: style.color, background: style.backgroundColor }
      }
      return {
        selected: read('[data-contrast="selected"]'),
        disabled: read('[data-contrast="disabled"]'),
        warning: read('[data-contrast="warning"]'),
        danger: read('[data-contrast="danger"]'),
      }
    })
    for (const [name, sample] of Object.entries(samples)) {
      expect(ratio(sample.color, sample.background), `${name}: ${JSON.stringify(sample)}`).toBeGreaterThanOrEqual(4.5)
    }
  })
}
