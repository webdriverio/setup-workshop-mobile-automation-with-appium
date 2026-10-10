import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'

const apps = { hasApp: mock.fn(), downloadApp: mock.fn() }
mock.module('../scripts/lib/apps.mjs', {
  namedExports: { ...apps, appsDir: () => '/downloads/appium-workshop-apps', APPS: { android: { size: 123595826 }, ios: { size: 15981903 } } },
})
const { FLAGS } = await import('../scripts/lib/ui.mjs')
const { appHint, appStep } = await import('../scripts/steps/app.mjs')

let output
beforeEach(() => {
  output = []
  mock.method(console, 'log', (line = '') => output.push(line))
  for (const fn of Object.values(apps)) fn.mock.resetCalls()
  apps.hasApp.mock.mockImplementation(() => false)
  apps.downloadApp.mock.mockImplementation(async (platform) => `/downloads/appium-workshop-apps/${platform}-app`)
  FLAGS.dryRun = false
})
afterEach(() => mock.restoreAll())

test('the step says which app, how big it is and where it ends up', () => {
  const step = appStep('android')
  assert.equal(step.title, 'Android demo app')
  assert.match(step.description, /118 MB/)
  assert.match(step.description, /\/downloads\/appium-workshop-apps/)
  assert.equal(appStep('ios').title, 'iOS demo app')
  assert.match(appStep('ios').description, /15 MB/)
})

test('the step is done when the app is there', () => {
  assert.equal(appStep('android').done, false)
  apps.hasApp.mock.mockImplementation(() => true)
  assert.equal(appStep('android').done, true)
})

test('applying the step downloads the app and says where it is', async () => {
  assert.equal(await appStep('ios').apply(), true)
  assert.equal(apps.downloadApp.mock.calls[0].arguments[0], 'ios')
  assert.match(output.join('\n'), /Saved to \/downloads\/appium-workshop-apps\/ios-app/)
})

test('a failed download is explained and the setup can be run again', async () => {
  apps.downloadApp.mock.mockImplementation(async () => { throw new Error('offline') })
  assert.equal(await appStep('android').apply(), false)
  assert.match(output.join('\n'), /Android demo app failed: offline/)
  assert.match(output.join('\n'), /continues where it stopped/)
})

test('a dry run downloads nothing', async () => {
  FLAGS.dryRun = true
  assert.equal(await appStep('android').apply(), true)
  assert.equal(apps.downloadApp.mock.callCount(), 0)
  assert.match(output.join('\n'), /\[dry run\]/)
})

test('the hint tells where the app is', () => {
  appHint()
  assert.match(output.join('\n'), /demo app of the workshop is in \/downloads\/appium-workshop-apps/)
})
