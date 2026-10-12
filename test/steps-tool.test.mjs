import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'

const run = mock.fn()
const runFile = mock.fn()
mock.module('../scripts/lib/shell.mjs', { namedExports: { IS_WIN: false, run, runFile } })
const { FLAGS } = await import('../scripts/lib/ui.mjs')
const { hasGlobalTool, toolStep } = await import('../scripts/steps/tool.mjs')

let output

beforeEach(() => {
  output = []
  mock.method(console, 'log', (line = '') => output.push(line))
  for (const fn of [run, runFile]) fn.mock.resetCalls()
  run.mock.mockImplementation(() => JSON.stringify({ dependencies: {} }))
  FLAGS.dryRun = false
})
afterEach(() => mock.restoreAll())

test('a tool counts as installed when npm lists it among the global packages', () => {
  run.mock.mockImplementation(() => JSON.stringify({ dependencies: { 'start-ios-simulator': { version: '2.0.0' } } }))
  assert.equal(hasGlobalTool('start-ios-simulator'), true)
  assert.equal(hasGlobalTool('start-android-emulator'), false)
})

test('a tool counts as not installed when npm gives nothing usable', () => {
  run.mock.mockImplementation(() => null)
  assert.equal(hasGlobalTool('start-ios-simulator'), false)
})

test('the step is done when the tool is installed globally', () => {
  run.mock.mockImplementation(() => JSON.stringify({ dependencies: { 'start-ios-simulator': {} } }))
  assert.equal(toolStep('start-ios-simulator', 'simulators').done, true)
})

test('applying the step installs the tool globally', async () => {
  runFile.mock.mockImplementation(() => ({ output: '', exitCode: 0 }))
  assert.equal(await toolStep('start-ios-simulator', 'simulators').apply(), true)
  assert.deepEqual(runFile.mock.calls[0].arguments, ['npm', ['install', '-g', 'start-ios-simulator']])
})

test('a dry run says what it would do and installs nothing', async () => {
  FLAGS.dryRun = true
  assert.equal(await toolStep('start-ios-simulator', 'simulators').apply(), true)
  assert.equal(runFile.mock.callCount(), 0)
  assert.match(output.join('\n'), /would run npm install -g start-ios-simulator/)
})

test('a failed install does not stop the setup and points to npx', async () => {
  runFile.mock.mockImplementation(() => ({ output: 'npm error\nEACCES: permission denied', exitCode: 243 }))
  assert.equal(await toolStep('start-ios-simulator', 'simulators').apply(), true)
  const text = output.join('\n')
  assert.match(text, /EACCES: permission denied/)
  assert.match(text, /npx start-ios-simulator/)
})
