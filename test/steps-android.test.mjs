import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'

const lib = {
  detectSdkPath: mock.fn(), defaultSdkPath: mock.fn(), detectJava: mock.fn(), sdkTool: mock.fn(), listInstalledPackages: mock.fn(),
  listAvds: mock.fn(), isValidJavaHome: mock.fn(), javaMajor: mock.fn(), installJdk: mock.fn(), installCmdlineTools: mock.fn(),
  acceptLicenses: mock.fn(), installPackages: mock.fn(), hasSkin: mock.fn(), installSkin: mock.fn(), createAvd: mock.fn(),
  platformToolsDirs: mock.fn(),
}
const persistEnv = mock.fn()
const applyToProcess = mock.fn()
const run = mock.fn()
const REQUIRED_PACKAGES = ['platform-tools', 'emulator', 'platforms;android-37.0', 'system-image']
const AVD_NAMES = ['Workshop_1', 'Workshop_2']
mock.module('../scripts/lib/android.mjs', {
  namedExports: { ...lib, ANDROID_VERSION: 17, AVD_NAMES, MIN_JAVA: 17, PIXEL_MODEL: 10, REQUIRED_PACKAGES },
})
mock.module('../scripts/lib/env.mjs', { namedExports: { persistEnv, applyToProcess } })
mock.module('../scripts/lib/shell.mjs', { namedExports: { run } })
const { FLAGS } = await import('../scripts/lib/ui.mjs')
const { planAndroid, setupAndroid } = await import('../scripts/steps/android.mjs')

const JAVA = { home: '/jdk', major: 21, source: 'JAVA_HOME' }
const savedEnv = { ...process.env }
let output

/** A machine where everything for the workshop is in place. Tests change what they need. */
const readyMachine = () => {
  lib.detectSdkPath.mock.mockImplementation(() => '/sdk')
  lib.defaultSdkPath.mock.mockImplementation(() => '/default-sdk')
  lib.detectJava.mock.mockImplementation(() => JAVA)
  lib.sdkTool.mock.mockImplementation(() => '/sdk/cmdline-tools/latest/bin/sdkmanager')
  lib.listInstalledPackages.mock.mockImplementation(() => new Set(REQUIRED_PACKAGES))
  lib.listAvds.mock.mockImplementation(() => AVD_NAMES)
  lib.isValidJavaHome.mock.mockImplementation(() => true)
  lib.javaMajor.mock.mockImplementation(() => 21)
  lib.hasSkin.mock.mockImplementation(() => true)
  lib.platformToolsDirs.mock.mockImplementation((sdk) => [`${sdk}/platform-tools`])
  lib.createAvd.mock.mockImplementation(() => ({ output: '', exitCode: 0 }))
  for (const name of ['installJdk', 'installCmdlineTools', 'installSkin']) lib[name].mock.mockImplementation(async () => {})
  lib.installJdk.mock.mockImplementation(async () => '/downloaded-jdk')
  lib.acceptLicenses.mock.mockImplementation(() => true)
  lib.installPackages.mock.mockImplementation(() => true)
  run.mock.mockImplementation(() => 'Android Debug Bridge')
  process.env.ANDROID_HOME = '/sdk'
  process.env.JAVA_HOME = '/jdk'
}
const emptyMachine = () => {
  readyMachine()
  lib.detectSdkPath.mock.mockImplementation(() => null)
  lib.detectJava.mock.mockImplementation(() => null)
  lib.sdkTool.mock.mockImplementation(() => null)
  run.mock.mockImplementation(() => null)
  delete process.env.ANDROID_HOME
  delete process.env.JAVA_HOME
  lib.isValidJavaHome.mock.mockImplementation(() => false)
}
const step = (steps, title) => steps.find((s) => s.title.includes(title))
const status = (steps) => Object.fromEntries(steps.map((s) => [s.title, s.done]))

beforeEach(() => {
  output = []
  mock.method(console, 'log', (line) => output.push(line))
  for (const fn of [...Object.values(lib), persistEnv, applyToProcess, run]) fn.mock.resetCalls()
  FLAGS.yes = true
  FLAGS.dryRun = false
  readyMachine()
})
afterEach(() => {
  mock.restoreAll()
  for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key]
  Object.assign(process.env, savedEnv)
})

test('on a machine that is ready, every step is done', () => {
  assert.ok(planAndroid().every((s) => s.done))
})

test('on an empty machine, every step is missing and nothing is inspected', () => {
  emptyMachine()
  const steps = planAndroid()
  assert.ok(steps.every((s) => !s.done))
  assert.equal(lib.listInstalledPackages.mock.callCount(), 0, 'cannot list packages without Java and sdkmanager')
  assert.equal(lib.listAvds.mock.callCount(), 0)
})

test('missing SDK packages and emulators are reported separately', () => {
  lib.listInstalledPackages.mock.mockImplementation(() => new Set(['platform-tools', 'emulator']))
  lib.listAvds.mock.mockImplementation(() => ['Workshop_1'])
  const steps = planAndroid()
  assert.equal(step(steps, 'SDK packages').done, false)
  assert.equal(step(steps, 'emulators').done, false)
  assert.match(step(steps, 'emulators').description, /We create Workshop_2\./)
  assert.equal(step(steps, 'Java').done, true)
})

test('a failing sdkmanager or avdmanager counts as nothing installed', () => {
  lib.listInstalledPackages.mock.mockImplementation(() => null)
  lib.listAvds.mock.mockImplementation(() => null)
  const steps = planAndroid()
  assert.equal(step(steps, 'SDK packages').done, false)
  assert.equal(step(steps, 'emulators').done, false)
})

test('environment variables are missing when JAVA_HOME is too old or invalid, or adb is not on the PATH', () => {
  lib.javaMajor.mock.mockImplementation(() => 11)
  assert.equal(step(planAndroid(), 'Environment').done, false)

  readyMachine()
  lib.isValidJavaHome.mock.mockImplementation(() => false)
  assert.equal(step(planAndroid(), 'Environment').done, false)

  readyMachine()
  run.mock.mockImplementation(() => null)
  assert.equal(step(planAndroid(), 'Environment').done, false)
})

test('Java step: downloads Java and remembers it for the next steps', async () => {
  emptyMachine()
  const steps = planAndroid()
  assert.equal(await step(steps, 'Java').apply(), true)
  assert.ok(output.some((line) => line.includes('/downloaded-jdk')))
  await step(steps, 'SDK packages').apply() // uses the downloaded Java
  assert.equal(lib.acceptLicenses.mock.calls[0].arguments[1], '/downloaded-jdk')
})

test('Java step: reports a failed download and how to fix it', async () => {
  emptyMachine()
  lib.installJdk.mock.mockImplementation(async () => { throw new Error('offline') })
  assert.equal(await step(planAndroid(), 'Java').apply(), false)
  assert.ok(output.some((line) => line.includes('Downloading Java failed: offline')))
  assert.ok(output.some((line) => line.includes('adoptium.net')))
})

test('command-line tools step: installs them, or reports the failure', async () => {
  emptyMachine()
  assert.equal(await step(planAndroid(), 'command-line').apply(), true)
  assert.deepEqual(lib.installCmdlineTools.mock.calls[0].arguments, ['/default-sdk'])

  lib.installCmdlineTools.mock.mockImplementation(async () => { throw new Error('HTTP 503') })
  assert.equal(await step(planAndroid(), 'command-line').apply(), false)
  assert.ok(output.some((line) => line.includes('HTTP 503')))
})

test('SDK packages step: accepts the licences, installs what is missing, reports failures', async () => {
  lib.listInstalledPackages.mock.mockImplementation(() => new Set(['platform-tools']))
  assert.equal(await step(planAndroid(), 'SDK packages').apply(), true)
  assert.deepEqual(lib.installPackages.mock.calls[0].arguments, ['/sdk', '/jdk', ['emulator', 'platforms;android-37.0', 'system-image']])

  lib.installPackages.mock.mockImplementation(() => false)
  assert.equal(await step(planAndroid(), 'SDK packages').apply(), false)

  lib.acceptLicenses.mock.mockImplementation(() => false)
  lib.installPackages.mock.resetCalls()
  assert.equal(await step(planAndroid(), 'SDK packages').apply(), false)
  assert.equal(lib.installPackages.mock.callCount(), 0, 'no install when the licences are not accepted')
})

test('SDK packages step: nothing to install is fine', async () => {
  assert.equal(await step(planAndroid(), 'SDK packages').apply(), true)
  assert.equal(lib.installPackages.mock.callCount(), 0)
})

test('emulators step: creates every missing emulator', async () => {
  lib.listAvds.mock.mockImplementation(() => ['Workshop_1'])
  assert.equal(await step(planAndroid(), 'emulators').apply(), true)
  assert.deepEqual(lib.createAvd.mock.calls.map((c) => c.arguments[2]), ['Workshop_2'])
  assert.equal(lib.installSkin.mock.callCount(), 0, 'the skin is already there')
})

test('emulators step: downloads the skin first, and carries on without it when that fails', async () => {
  lib.listAvds.mock.mockImplementation(() => [])
  lib.hasSkin.mock.mockImplementation(() => false)
  assert.equal(await step(planAndroid(), 'emulators').apply(), true)
  assert.equal(lib.installSkin.mock.callCount(), 1)

  lib.installSkin.mock.mockImplementation(async () => { throw new Error('offline') })
  assert.equal(await step(planAndroid(), 'emulators').apply(), true)
  assert.ok(output.some((line) => line.includes('without a device frame')))
})

test('emulators step: reports an emulator that could not be created and still tries the others', async () => {
  lib.listAvds.mock.mockImplementation(() => [])
  lib.createAvd.mock.mockImplementationOnce(() => ({ output: 'Error: package missing', exitCode: 1 }))
  assert.equal(await step(planAndroid(), 'emulators').apply(), false)
  assert.equal(lib.createAvd.mock.callCount(), 2)
  assert.ok(output.some((line) => line.includes('Error: package missing')))
})

test('environment step: saves only what is missing, and tells to open a new terminal', async () => {
  delete process.env.ANDROID_HOME
  run.mock.mockImplementation(() => null)
  assert.equal(await step(planAndroid(), 'Environment').apply(), true)
  const saved = { vars: { ANDROID_HOME: '/sdk' }, paths: ['/sdk/platform-tools'] }
  assert.deepEqual(persistEnv.mock.calls[0].arguments[0], saved)
  assert.deepEqual(applyToProcess.mock.calls[0].arguments[0], saved)
  assert.ok(output.some((line) => line.includes('new terminal')))
})

test('environment step: also saves JAVA_HOME when it is not valid', async () => {
  lib.isValidJavaHome.mock.mockImplementation(() => false)
  assert.equal(await step(planAndroid(), 'Environment').apply(), true)
  assert.equal(persistEnv.mock.calls[0].arguments[0].vars.JAVA_HOME, '/jdk')
})

test('environment step: reports when the variables cannot be saved', async () => {
  delete process.env.ANDROID_HOME
  persistEnv.mock.mockImplementation(() => { throw new Error('read-only profile') })
  assert.equal(await step(planAndroid(), 'Environment').apply(), false)
  assert.ok(output.some((line) => line.includes('read-only profile')))
})

test('a dry run changes nothing and says what it would do', async () => {
  emptyMachine()
  FLAGS.dryRun = true
  const steps = planAndroid()
  for (const s of steps) assert.equal(await s.apply(), true)
  for (const fn of [lib.installJdk, lib.installCmdlineTools, lib.acceptLicenses, lib.installPackages, lib.installSkin, lib.createAvd, persistEnv, applyToProcess]) {
    assert.equal(fn.mock.callCount(), 0)
  }
  assert.equal(output.filter((line) => line.includes('[dry run]')).length, steps.length)
})

test('setupAndroid on a ready machine only prints how to start the emulators', async () => {
  assert.equal(await setupAndroid(), true)
  const text = output.join('\n')
  assert.match(text, /Everything for Android is already set up/)
  assert.match(text, /npx start-android-emulator/)
  assert.match(text, /emulator -avd Workshop_1/)
  assert.doesNotMatch(text, /in a new terminal/)
})

test('setupAndroid installs what is missing and points to a new terminal after changing the environment', async () => {
  delete process.env.ANDROID_HOME
  assert.equal(await setupAndroid(), true)
  assert.match(output.join('\n'), /in a new terminal/)
})

test('setupAndroid stops at the first step that fails', async () => {
  emptyMachine()
  lib.installJdk.mock.mockImplementation(async () => { throw new Error('offline') })
  assert.equal(await setupAndroid(), false)
  assert.equal(lib.installCmdlineTools.mock.callCount(), 0)
})
