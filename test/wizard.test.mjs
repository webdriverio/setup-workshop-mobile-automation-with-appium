import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'

const select = mock.fn()
const setupAndroid = mock.fn(async () => true)
const setupIos = mock.fn(async () => true)
mock.module('@inquirer/prompts', { namedExports: { select, confirm: mock.fn() } })
mock.module('../scripts/steps/android.mjs', { namedExports: { setupAndroid } })
mock.module('../scripts/steps/ios.mjs', { namedExports: { setupIos } })
mock.module('../scripts/lib/shell.mjs', { namedExports: { IS_MAC: true } })
const { FLAGS } = await import('../scripts/lib/ui.mjs')
const { runWizard } = await import('../scripts/wizard.mjs')

const answers = (...values) => select.mock.mockImplementation(async () => values.shift())
let output
beforeEach(() => {
  output = []
  mock.method(console, 'log', (line) => output.push(line))
  for (const fn of [select, setupAndroid, setupIos]) fn.mock.resetCalls()
  setupAndroid.mock.mockImplementation(async () => true)
  setupIos.mock.mockImplementation(async () => true)
  FLAGS.yes = false
  FLAGS.dryRun = false
})
afterEach(() => mock.restoreAll())

test('--yes sets up Android and iOS without asking anything', async () => {
  FLAGS.yes = true
  assert.equal(await runWizard(), 0)
  assert.equal(setupAndroid.mock.callCount(), 1)
  assert.equal(setupIos.mock.callCount(), 1)
  assert.equal(select.mock.callCount(), 0)
})

test('the menu runs the chosen platform and returns to the menu until Finish', async () => {
  answers('android', 'ios', 'finish')
  assert.equal(await runWizard(), 0)
  assert.equal(setupAndroid.mock.callCount(), 1)
  assert.equal(setupIos.mock.callCount(), 1)
  assert.equal(select.mock.callCount(), 3)
})

test('the menu shows the result of a platform you already did', async () => {
  setupAndroid.mock.mockImplementationOnce(async () => true)
  setupIos.mock.mockImplementationOnce(async () => false)
  answers('android', 'ios', 'finish')
  await runWizard()
  const menuAtEnd = select.mock.calls[2].arguments[0].choices.map((c) => c.name)
  assert.deepEqual(menuAtEnd, ['Android  ✔ ready', 'iOS  ⚠ needs attention', 'Finish'])
})

test('a platform that is not ready makes the wizard exit with code 1', async () => {
  setupAndroid.mock.mockImplementation(async () => false)
  answers('android', 'finish')
  assert.equal(await runWizard(), 1)
  assert.ok(output.some((line) => line.includes('still need your attention')))
})

test('a dry run says that nothing is changed', async () => {
  FLAGS.dryRun = true
  answers('finish')
  await runWizard()
  assert.ok(output.some((line) => line.includes('Dry run')))
})
