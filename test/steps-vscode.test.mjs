import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'

const fileExists = mock.fn()
const run = mock.fn()
const persistEnv = mock.fn(() => '~/.zshrc')
const applyToProcess = mock.fn()
mock.module('../scripts/lib/system.mjs', { namedExports: { fileExists } })
mock.module('../scripts/lib/shell.mjs', { namedExports: { run } })
mock.module('start-android-emulator', { namedExports: { persistEnv, applyToProcess } })
const { FLAGS } = await import('../scripts/lib/ui.mjs')
const { VSCODE_MAC_BIN, needsCodeCommand, planVscode, setupVscode } = await import('../scripts/steps/vscode.mjs')

let output
beforeEach(() => {
  output = []
  mock.method(console, 'log', (line = '') => output.push(line))
  for (const fn of [persistEnv, applyToProcess]) fn.mock.resetCalls()
  persistEnv.mock.mockImplementation(() => '~/.zshrc')
  fileExists.mock.mockImplementation(() => true)
  run.mock.mockImplementation(() => null)
  FLAGS.yes = true
  FLAGS.dryRun = false
})
afterEach(() => mock.restoreAll())

test('the code command is needed when VS Code is installed and code does not work', () => {
  assert.equal(needsCodeCommand(), true)
  run.mock.mockImplementation(() => '1.100.0')
  assert.equal(needsCodeCommand(), false)
  run.mock.mockImplementation(() => null)
  fileExists.mock.mockImplementation(() => false)
  assert.equal(needsCodeCommand(), false)
})

test('the step is done when the code command already works', () => {
  assert.equal(planVscode()[0].done, false)
  run.mock.mockImplementation(() => '1.100.0')
  assert.equal(planVscode()[0].done, true)
})

test('setup adds the VS Code folder to the PATH in its own block', async () => {
  assert.equal(await setupVscode(), true)
  assert.deepEqual(persistEnv.mock.calls[0].arguments[0], { paths: [VSCODE_MAC_BIN], block: 'appium workshop setup vscode' })
  assert.deepEqual(applyToProcess.mock.calls[0].arguments[0], { paths: [VSCODE_MAC_BIN] })
  assert.match(output.join('\n'), /new terminal/)
})

test('a dry run changes nothing', async () => {
  FLAGS.dryRun = true
  assert.equal(await setupVscode(), true)
  assert.equal(persistEnv.mock.callCount(), 0)
  assert.match(output.join('\n'), /\[dry run\]/)
})

test('a profile that cannot be written is explained', async () => {
  persistEnv.mock.mockImplementation(() => { throw new Error('read-only') })
  assert.equal(await setupVscode(), false)
  assert.match(output.join('\n'), /read-only/)
  assert.match(output.join('\n'), /export PATH=/)
})

test('nothing to do when the code command works', async () => {
  run.mock.mockImplementation(() => '1.100.0')
  assert.equal(await setupVscode(), true)
  assert.equal(persistEnv.mock.callCount(), 0)
})
