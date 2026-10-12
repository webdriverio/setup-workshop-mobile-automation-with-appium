import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'

const runFileAsync = mock.fn()
const runFile = mock.fn()
mock.module('../scripts/lib/shell.mjs', { namedExports: { IS_WIN: false, runFile, runFileAsync } })
const { FLAGS } = await import('../scripts/lib/ui.mjs')
const { hasGlobalTool, knownGlobalTool, toolStep } = await import('../scripts/steps/tool.mjs')

let output
const listing = (json) => runFileAsync.mock.mockImplementation(async () => ({ output: JSON.stringify(json), exitCode: 0 }))

beforeEach(() => {
  output = []
  mock.method(console, 'log', (line = '') => output.push(line))
  for (const fn of [runFileAsync, runFile]) fn.mock.resetCalls()
  listing({ dependencies: {} })
  FLAGS.dryRun = false
})
afterEach(() => mock.restoreAll())

test('a tool counts as installed when npm lists it among the global packages', async () => {
  listing({ dependencies: { 'start-ios-simulator': { version: '2.0.0' } } })
  assert.equal(await hasGlobalTool('start-ios-simulator'), true)
  assert.equal(await hasGlobalTool('start-android-emulator'), false)
})

test('a tool counts as not installed when npm gives nothing usable', async () => {
  runFileAsync.mock.mockImplementation(async () => ({ output: '', exitCode: 1 }))
  assert.equal(await hasGlobalTool('start-ios-simulator'), false)
})

test('the step is done when the tool is installed globally', async () => {
  listing({ dependencies: { 'start-ios-simulator': {} } })
  assert.equal((await toolStep('start-ios-simulator', 'simulators')).done, true)
})

test('applying the step installs the tool globally', async () => {
  runFile.mock.mockImplementation(() => ({ output: '', exitCode: 0 }))
  assert.equal(await (await toolStep('start-ios-simulator', 'simulators')).apply(), true)
  assert.deepEqual(runFile.mock.calls[0].arguments, ['npm', ['install', '-g', 'start-ios-simulator']])
})

test('a dry run says what it would do and installs nothing', async () => {
  FLAGS.dryRun = true
  assert.equal(await (await toolStep('start-ios-simulator', 'simulators')).apply(), true)
  assert.equal(runFile.mock.callCount(), 0)
  assert.match(output.join('\n'), /would run npm install -g start-ios-simulator/)
})

test('a failed install does not stop the setup and points to npx', async () => {
  runFile.mock.mockImplementation(() => ({ output: 'npm error\nEACCES: permission denied', exitCode: 243 }))
  assert.equal(await (await toolStep('start-ios-simulator', 'simulators')).apply(), true)
  const text = output.join('\n')
  assert.match(text, /EACCES: permission denied/)
  assert.match(text, /npx start-ios-simulator/)
})

test('a missing tool is named and explained in yellow, and asks its own question when it is the only missing item', async () => {
  const step = await toolStep('start-ios-simulator', 'simulators')
  assert.equal(step.action, 'install start-ios-simulator globally')
  assert.match(step.title, /^\x1b\[33mGlobal start-ios-simulator command/)
  assert.match(step.description, /^\x1b\[33mNot installed globally yet/)
})

test('an installed tool keeps a plain title', async () => {
  listing({ dependencies: { 'start-ios-simulator': {} } })
  assert.equal((await toolStep('start-ios-simulator', 'simulators')).title, 'Global start-ios-simulator command')
})

test('the closing hint knows from the check and the install whether the tool is there, without asking npm again', async () => {
  listing({ dependencies: {} })
  const step = await toolStep('start-ios-simulator', 'simulators')
  assert.equal(knownGlobalTool('start-ios-simulator'), false)
  runFile.mock.mockImplementation(() => ({ output: '', exitCode: 0 }))
  await step.apply()
  assert.equal(knownGlobalTool('start-ios-simulator'), true)
  assert.equal(runFileAsync.mock.callCount(), 1)
})
