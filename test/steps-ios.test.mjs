import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'

const configure = mock.fn()
const inspect = mock.fn(async () => ({ sdkVersion: '27.0' }))
const planIos = mock.fn()
const runPlan = mock.fn()
mock.module('start-ios-simulator', { namedExports: { configure, inspect, planIos, runPlan } })
const NAMES = ['Workshop_1_iPhone_17_Pro_iOS_27_0', 'Workshop_2_iPhone_17_Pro_iOS_27_0']
const target = { version: '27.0', simulators: NAMES.map((name) => ({ name, device: 'iPhone 17 Pro' })) }
const workshopTarget = mock.fn(() => target)
mock.module('../scripts/lib/ios.mjs', { namedExports: { workshopTarget } })
const apps = { hasApp: mock.fn(() => false), downloadApp: mock.fn() }
mock.module('../scripts/lib/apps.mjs', {
  namedExports: { ...apps, appsDir: () => '/downloads/appium-workshop-apps', APPS: { android: { size: 123595826 }, ios: { size: 15981903 } } },
})
const { FLAGS } = await import('../scripts/lib/ui.mjs')
const { planIosSteps, setupIos } = await import('../scripts/steps/ios.mjs')

const moduleSteps = () => ['xcode', 'license', 'runtime', 'simulators'].map((id) => ({ id, title: id, description: `the ${id} step`, done: false }))
let output

beforeEach(() => {
  output = []
  mock.method(console, 'log', (line = '') => output.push(line))
  for (const fn of [configure, inspect, planIos, runPlan, workshopTarget]) fn.mock.resetCalls()
  planIos.mock.mockImplementation(moduleSteps)
  runPlan.mock.mockImplementation(async () => ({ ok: true, applied: [], declined: false }))
  FLAGS.yes = true
  FLAGS.dryRun = false
})
afterEach(() => mock.restoreAll())

test('the plan is made by the module, for the workshop target, on what it found on this machine', async () => {
  await planIosSteps()
  assert.deepEqual(workshopTarget.mock.calls[0].arguments, [{ sdkVersion: '27.0' }])
  assert.deepEqual(planIos.mock.calls[0].arguments, [{ sdkVersion: '27.0' }, target])
})

test('the demo app comes after the module steps, which stay as they are', async () => {
  const steps = await planIosSteps()
  assert.deepEqual(steps.map((s) => s.id), ['xcode', 'license', 'runtime', 'simulators', 'app-ios'])
  assert.equal(steps[0].title, 'xcode')
})

test('the simulators step is named the way the workshop talks about it', async () => {
  const simulators = (await planIosSteps()).find((s) => s.id === 'simulators')
  assert.equal(simulators.title, '2 workshop simulators')
  assert.equal(simulators.description, 'the simulators step')
})

test('the flags of the setup are given to the module before the plan is run', async () => {
  FLAGS.yes = false
  FLAGS.dryRun = true
  await setupIos()
  assert.deepEqual(configure.mock.calls[0].arguments, [{ yes: false, dryRun: true }])
  assert.equal(runPlan.mock.calls[0].arguments[0], 'This is what we need for the workshop:')
})

test('when iOS is ready, the start hint tells how to start both simulators', async () => {
  assert.equal(await setupIos(), true)
  const text = output.join('\n')
  assert.match(text, /Start the simulators/)
  assert.match(text, /npm install -g start-ios-simulator/)
  assert.match(text.replace(/\x1b\[[0-9;]*m/g, ''), /^\s*start-ios-simulator$/m)
  assert.match(text, /xcrun simctl boot Workshop_1_iPhone_17_Pro_iOS_27_0/)
  assert.match(text, /xcrun simctl boot Workshop_2_iPhone_17_Pro_iOS_27_0/)
  assert.match(text, /demo app of the workshop is in \/downloads\/appium-workshop-apps/)
})

test('no hint and a failure when the plan was declined or a step failed', async () => {
  runPlan.mock.mockImplementation(async () => ({ ok: false, applied: [], declined: true }))
  assert.equal(await setupIos(), false)
  assert.doesNotMatch(output.join('\n'), /Start the simulators/)
})
