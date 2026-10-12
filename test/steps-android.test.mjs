import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'

const configure = mock.fn()
const inspect = mock.fn(async () => ({ sdk: '/sdk' }))
const planAndroid = mock.fn()
const runPlan = mock.fn()
mock.module('start-android-emulator', { namedExports: { configure, inspect, planAndroid, runPlan } })
const target = { version: { api: '37.0' }, avds: [] }
mock.module('../scripts/lib/android.mjs', {
  namedExports: { AVD_NAMES: ['Workshop_1', 'Workshop_2'], PIXEL_MODEL: 10, workshopTarget: async () => target },
})
const apps = { hasApp: mock.fn(() => false), downloadApp: mock.fn() }
mock.module('../scripts/lib/apps.mjs', {
  namedExports: { ...apps, appsDir: () => '/downloads/appium-workshop-apps', APPS: { android: { size: 123595826 }, ios: { size: 15981903 } } },
})
const globalTools = new Set()
mock.module('../scripts/steps/tool.mjs', {
  namedExports: { knownGlobalTool: (name) => globalTools.has(name), toolStep: async (name) => ({ id: `tool-${name}`, title: name, description: '', done: false }) },
})
const { FLAGS } = await import('../scripts/lib/ui.mjs')
const { planAndroidSteps, setupAndroid } = await import('../scripts/steps/android.mjs')

const moduleSteps = () => ['java', 'tools', 'packages', 'avds', 'env'].map((id) => ({ id, title: id, description: `the ${id} step`, done: false }))
let output

beforeEach(() => {
  output = []
  mock.method(console, 'log', (line = '') => output.push(line))
  for (const fn of [configure, inspect, planAndroid, runPlan]) fn.mock.resetCalls()
  planAndroid.mock.mockImplementation(moduleSteps)
  runPlan.mock.mockImplementation(async () => ({ ok: true, applied: [], declined: false }))
  globalTools.clear()
  FLAGS.yes = true
  FLAGS.dryRun = false
})
afterEach(() => mock.restoreAll())

test('the plan is made by the module, for the workshop target, on what it found on this machine', async () => {
  await planAndroidSteps()
  assert.deepEqual(planAndroid.mock.calls[0].arguments, [{ sdk: '/sdk' }, target])
})

test('the demo app comes before the environment variables, the module steps stay as they are', async () => {
  const steps = await planAndroidSteps()
  assert.deepEqual(steps.map((s) => s.id), ['java', 'tools', 'packages', 'avds', 'app-android', 'tool-start-android-emulator', 'env'])
  assert.equal(steps[0].title, 'java')
})

test('the emulators step is described the way the workshop talks about it', async () => {
  const avds = (await planAndroidSteps()).find((s) => s.id === 'avds')
  assert.equal(avds.title, '2 workshop emulators')
  assert.match(avds.description, /^the avds step/)
  assert.match(avds.description, /Pixel 10 with the device frame/)
})

test('the packages step says how much disk space is needed, not the size of the download', async () => {
  planAndroid.mock.mockImplementation(() => moduleSteps().map((s) => (s.id === 'packages' ? { ...s, description: 'Android 17, the emulator and a system image (about 3 GB).' } : s)))
  const packages = (await planAndroidSteps()).find((s) => s.id === 'packages')
  assert.equal(packages.description, 'Android 17, the emulator and a system image (about 6 GB of disk space once installed).')
})

test('the flags of the setup are given to the module before the plan is run', async () => {
  FLAGS.yes = false
  FLAGS.dryRun = true
  await setupAndroid()
  assert.deepEqual(configure.mock.calls[0].arguments, [{ yes: false, dryRun: true }])
  assert.equal(runPlan.mock.calls[0].arguments[0], 'This is what we need for the workshop:')
})

test('when Android is ready, the start hint tells how to start both emulators', async () => {
  assert.equal(await setupAndroid(), true)
  const text = output.join('\n')
  assert.match(text, /Start the emulators/)
  assert.match(text, /npm install -g start-android-emulator/)
  assert.match(text.replace(/\x1b\[[0-9;]*m/g, ''), /^\s*start-android-emulator$/m)
  assert.match(text, /emulator -avd Workshop_1/)
  assert.match(text, /emulator -avd Workshop_2/)
  assert.match(text, /demo app of the workshop is in \/downloads\/appium-workshop-apps/)
})

test('the hint asks for a new terminal when the environment variables were just saved', async () => {
  runPlan.mock.mockImplementation(async () => ({ ok: true, applied: ['env'], declined: false }))
  await setupAndroid()
  assert.match(output.join('\n'), /in a new terminal, so the new settings apply/)
})

test('no hint and a failure when the plan was declined or a step failed', async () => {
  runPlan.mock.mockImplementation(async () => ({ ok: false, applied: [], declined: true }))
  assert.equal(await setupAndroid(), false)
  assert.doesNotMatch(output.join('\n'), /Start the emulators/)
})

test('when start-android-emulator is already installed globally, the start hint does not ask to install it', async () => {
  globalTools.add('start-android-emulator')
  await setupAndroid()
  assert.doesNotMatch(output.join('\n'), /npm install -g start-android-emulator/)
})
