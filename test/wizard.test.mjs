import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'

const needsCodeCommand = mock.fn(() => false)
const setupVscode = mock.fn(async () => true)
const select = mock.fn()
const confirm = mock.fn(async () => true)
const spawnSync = mock.fn(() => ({ status: 0 }))
const setupAndroid = mock.fn(async () => true)
const setupIos = mock.fn(async () => true)
mock.module('@inquirer/prompts', { namedExports: { select, confirm } })
mock.module('node:child_process', { namedExports: { spawnSync } })
mock.module('../scripts/steps/android.mjs', { namedExports: { setupAndroid } })
mock.module('../scripts/steps/ios.mjs', { namedExports: { setupIos } })
mock.module('../scripts/steps/vscode.mjs', { namedExports: { needsCodeCommand, setupVscode } })
mock.module('../scripts/lib/shell.mjs', { namedExports: { IS_MAC: true, IS_WIN: false } })
const { FLAGS } = await import('../scripts/lib/ui.mjs')
const { runWizard } = await import('../scripts/wizard.mjs')

const answers = (...values) => select.mock.mockImplementation(async () => values.shift())
let output
beforeEach(() => {
  output = []
  mock.method(console, 'log', (line = '') => output.push(line))
  for (const fn of [select, confirm, spawnSync, setupAndroid, setupIos, needsCodeCommand, setupVscode]) fn.mock.resetCalls()
  needsCodeCommand.mock.mockImplementation(() => false)
  confirm.mock.mockImplementation(async () => true)
  spawnSync.mock.mockImplementation(() => ({ status: 0 }))
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

test('when a platform is ready the wizard offers to run the check and runs it', async () => {
  answers('android', 'finish')
  assert.equal(await runWizard(), 0)
  assert.equal(confirm.mock.callCount(), 1)
  assert.deepEqual(spawnSync.mock.calls[0].arguments.slice(0, 2), ['npm', ['run', 'check']])
  assert.equal(spawnSync.mock.calls[0].arguments[2].stdio, 'inherit') // so the attendee sees the output
})

test('--yes runs the check without asking', async () => {
  FLAGS.yes = true
  await runWizard()
  assert.equal(confirm.mock.callCount(), 0)
  assert.equal(spawnSync.mock.callCount(), 1)
})

test('the check is skipped when the attendee says no, and the wizard points to it', async () => {
  confirm.mock.mockImplementation(async () => false)
  answers('android', 'finish')
  assert.equal(await runWizard(), 0)
  assert.equal(spawnSync.mock.callCount(), 0)
  assert.ok(output.some((line) => line.includes('run it later')))
})

test('a failing check makes the wizard exit with code 1', async () => {
  spawnSync.mock.mockImplementation(() => ({ status: 1 }))
  answers('android', 'finish')
  assert.equal(await runWizard(), 1)
})

test('the check is still offered when only one of the platforms is ready', async () => {
  setupIos.mock.mockImplementation(async () => false)
  answers('android', 'ios', 'finish')
  assert.equal(await runWizard(), 1)
  assert.equal(spawnSync.mock.callCount(), 1)
})

test('no check when no platform is ready, in a dry run, or when nothing was chosen', async () => {
  setupAndroid.mock.mockImplementation(async () => false)
  answers('android', 'finish')
  assert.equal(await runWizard(), 1)
  FLAGS.dryRun = true
  answers('android', 'finish')
  await runWizard()
  FLAGS.dryRun = false
  answers('finish')
  assert.equal(await runWizard(), 0)
  assert.ok(output.some((line) => line.includes('Next:')))
  assert.equal(spawnSync.mock.callCount(), 0)
  assert.equal(confirm.mock.callCount(), 0)
})

test('the menu offers the code command only while it is missing, and it does not count as a platform', async () => {
  needsCodeCommand.mock.mockImplementation(() => true)
  answers('vscode', 'finish')
  assert.equal(await runWizard(), 0)
  assert.equal(setupVscode.mock.callCount(), 1)
  assert.ok(select.mock.calls[0].arguments[0].choices.some((c) => c.value === 'vscode'))
  assert.equal(spawnSync.mock.callCount(), 0)

  needsCodeCommand.mock.mockImplementation(() => false)
  answers('finish')
  await runWizard()
  assert.ok(!select.mock.calls.at(-1).arguments[0].choices.some((c) => c.value === 'vscode'))
})

test('--yes also adds the code command when it is missing', async () => {
  FLAGS.yes = true
  needsCodeCommand.mock.mockImplementation(() => true)
  await runWizard()
  assert.equal(setupVscode.mock.callCount(), 1)
})
