import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'

const select = mock.fn()
const setupAndroid = mock.fn(async () => true)
const setupIos = mock.fn(async () => true)
const spawnSync = mock.fn(() => ({ status: 0 }))
mock.module('@inquirer/prompts', { namedExports: { select, confirm: mock.fn() } })
mock.module('node:child_process', { namedExports: { spawnSync } })
mock.module('../scripts/steps/android.mjs', { namedExports: { setupAndroid } })
mock.module('../scripts/steps/ios.mjs', { namedExports: { setupIos } })
mock.module('../scripts/lib/shell.mjs', { namedExports: { IS_MAC: false, IS_WIN: true } })
const { FLAGS } = await import('../scripts/lib/ui.mjs')
const { runWizard } = await import('../scripts/wizard.mjs')

const answers = (...values) => select.mock.mockImplementation(async () => values.shift())
let output
beforeEach(() => {
  output = []
  mock.method(console, 'log', (line = '') => output.push(line))
  for (const fn of [select, setupAndroid, setupIos]) fn.mock.resetCalls()
  setupAndroid.mock.mockImplementation(async () => true)
  setupIos.mock.mockImplementation(async () => true)
  FLAGS.yes = false
  FLAGS.dryRun = false
})
afterEach(() => mock.restoreAll())

test('--yes leaves iOS out', async () => {
  FLAGS.yes = true
  assert.equal(await runWizard(), 0)
  assert.equal(setupAndroid.mock.callCount(), 1)
  assert.equal(setupIos.mock.callCount(), 0)
})

test('the menu has no iOS, and says why', async () => {
  answers('finish')
  await runWizard()
  assert.deepEqual(select.mock.calls[0].arguments[0].choices.map((c) => c.value), ['android', 'finish'])
  assert.ok(output.some((line) => line.includes('iOS is only available on macOS')))
})

test('on Windows the check runs through a shell, so npm.cmd is found', async () => {
  FLAGS.yes = true
  await runWizard()
  assert.equal(spawnSync.mock.calls.at(-1).arguments[2].shell, true)
})
