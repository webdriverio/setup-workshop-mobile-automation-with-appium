import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'

const lib = {
  detectXcode: mock.fn(), simulatorSdkVersion: mock.fn(), licenseAccepted: mock.fn(), firstLaunchDone: mock.fn(),
  acceptLicenseAndInstallComponents: mock.fn(), hasRuntime: mock.fn(), downloadRuntime: mock.fn(),
  registerDownloadedRuntime: mock.fn(), listSimulators: mock.fn(), createSimulator: mock.fn(),
}
const NAMES = ['Workshop_1_iPhone_17_Pro_iOS_27_0', 'Workshop_2_iPhone_17_Pro_iOS_27_0']
mock.module('../scripts/lib/ios.mjs', { namedExports: { ...lib, IPHONE_MODEL: 'iPhone 17 Pro', simulatorNames: () => NAMES } })
const apps = { hasApp: mock.fn(), downloadApp: mock.fn() }
mock.module('../scripts/lib/apps.mjs', {
  namedExports: { ...apps, appsDir: () => '/downloads/appium-workshop-apps', APPS: { android: { size: 123595826 }, ios: { size: 15981903 } } },
})
const { FLAGS } = await import('../scripts/lib/ui.mjs')
const { planIos, setupIos } = await import('../scripts/steps/ios.mjs')

const [XCODE, LICENCE, RUNTIME, SIMULATORS, APP] = [0, 1, 2, 3, 4]
let output

const readyMachine = () => {
  lib.detectXcode.mock.mockImplementation(() => ({ version: '27.0', path: '/Applications/Xcode.app/Contents/Developer' }))
  lib.simulatorSdkVersion.mock.mockImplementation(() => '27.0')
  lib.licenseAccepted.mock.mockImplementation(() => true)
  lib.firstLaunchDone.mock.mockImplementation(() => true)
  lib.acceptLicenseAndInstallComponents.mock.mockImplementation(() => true)
  lib.hasRuntime.mock.mockImplementation(() => true)
  lib.downloadRuntime.mock.mockImplementation(() => true)
  lib.registerDownloadedRuntime.mock.mockImplementation(() => false)
  lib.listSimulators.mock.mockImplementation(() => NAMES)
  lib.createSimulator.mock.mockImplementation(() => ({ output: '', exitCode: 0 }))
  apps.hasApp.mock.mockImplementation(() => true)
  apps.downloadApp.mock.mockImplementation(async () => '/downloads/appium-workshop-apps/app')
}
const withoutXcode = () => {
  readyMachine()
  lib.detectXcode.mock.mockImplementation(() => null)
  lib.simulatorSdkVersion.mock.mockImplementation(() => null)
  lib.hasRuntime.mock.mockImplementation(() => false)
  apps.hasApp.mock.mockImplementation(() => false)
}

beforeEach(() => {
  output = []
  mock.method(console, 'log', (line) => output.push(line))
  for (const fn of [...Object.values(lib), ...Object.values(apps)]) fn.mock.resetCalls()
  FLAGS.yes = true
  FLAGS.dryRun = false
  readyMachine()
})
afterEach(() => mock.restoreAll())

test('on a machine that is ready, every step is done', () => {
  assert.ok(planIos().every((s) => s.done))
})

test('without Xcode nothing else can be done, and nothing else is inspected', () => {
  withoutXcode()
  const steps = planIos()
  assert.ok(steps.every((s) => !s.done))
  assert.equal(lib.licenseAccepted.mock.callCount(), 0)
  assert.equal(lib.listSimulators.mock.callCount(), 0)
  assert.match(steps[RUNTIME].title, /^iOS simulator runtime$/)
  assert.match(steps[SIMULATORS].description, /iOS of your Xcode/)
})

test('the licence step is only done when the licence is accepted and the components are installed', () => {
  lib.licenseAccepted.mock.mockImplementation(() => false)
  assert.equal(planIos()[LICENCE].done, false)
  readyMachine()
  lib.firstLaunchDone.mock.mockImplementation(() => false)
  assert.equal(planIos()[LICENCE].done, false)
})

test('the runtime and simulators are named after the iOS version of Xcode', () => {
  lib.hasRuntime.mock.mockImplementation(() => false)
  const steps = planIos()
  assert.equal(steps[RUNTIME].title, 'iOS 27.0 simulator runtime')
  assert.equal(steps[RUNTIME].done, false)
  assert.equal(lib.listSimulators.mock.callCount(), 0, 'no simulators can exist without the runtime')
  assert.match(steps[SIMULATORS].description, /iPhone 17 Pro on iOS 27.0/)
})

test('a missing simulator is reported by name', () => {
  lib.listSimulators.mock.mockImplementation(() => [NAMES[0]])
  const steps = planIos()
  assert.equal(steps[SIMULATORS].done, false)
  assert.match(steps[SIMULATORS].description, new RegExp(`We create ${NAMES[1]}\\.`))
})

test('Xcode step cannot install Xcode, it explains how', async () => {
  withoutXcode()
  assert.equal(await planIos()[XCODE].apply(), false)
  assert.ok(output.some((line) => line.includes('App Store')))
})

test('licence step: asks for the password through sudo, and gives the commands when it fails', async () => {
  assert.equal(await planIos()[LICENCE].apply(), true)
  assert.ok(output.some((line) => line.includes('Mac password')))

  lib.acceptLicenseAndInstallComponents.mock.mockImplementation(() => false)
  assert.equal(await planIos()[LICENCE].apply(), false)
  assert.ok(output.some((line) => line.includes('sudo xcodebuild -runFirstLaunch')))
})

test('licence step: needs Xcode first', async () => {
  withoutXcode()
  assert.equal(await planIos()[LICENCE].apply(), false)
  assert.equal(lib.acceptLicenseAndInstallComponents.mock.callCount(), 0)
})

test('runtime step: downloads the runtime when it is not there yet', async () => {
  const installed = { value: false }
  lib.hasRuntime.mock.mockImplementation(() => installed.value)
  lib.downloadRuntime.mock.mockImplementation(() => (installed.value = true))
  assert.equal(await planIos()[RUNTIME].apply(), true)
  assert.equal(lib.downloadRuntime.mock.callCount(), 1)
  assert.equal(lib.registerDownloadedRuntime.mock.callCount(), 0)
})

test('runtime step: registers a runtime that Xcode downloaded but did not list (Xcode 27)', async () => {
  const steps = planIos()
  lib.hasRuntime.mock.mockImplementation(() => false)
  lib.registerDownloadedRuntime.mock.mockImplementation(() => true)
  assert.equal(await steps[RUNTIME].apply(), true)
  assert.equal(lib.downloadRuntime.mock.callCount(), 1)
  assert.deepEqual(lib.registerDownloadedRuntime.mock.calls[0].arguments, ['27.0'])
})

test('runtime step: skips the download when the runtime is already there', async () => {
  assert.equal(await planIos()[RUNTIME].apply(), true)
  assert.equal(lib.downloadRuntime.mock.callCount(), 0)
})

test('runtime step: tells what to check when the runtime cannot be installed', async () => {
  lib.hasRuntime.mock.mockImplementation(() => false)
  assert.equal(await planIos()[RUNTIME].apply(), false)
  assert.ok(output.some((line) => line.includes('disk space')))
  assert.ok(output.some((line) => line.includes('Settings > Components')))
})

test('runtime step: needs Xcode first', async () => {
  withoutXcode()
  assert.equal(await planIos()[RUNTIME].apply(), false)
  assert.equal(lib.downloadRuntime.mock.callCount(), 0)
})

test('simulators step: creates the missing simulators on the runtime of this iOS version', async () => {
  lib.listSimulators.mock.mockImplementation(() => [NAMES[0]])
  assert.equal(await planIos()[SIMULATORS].apply(), true)
  assert.deepEqual(lib.createSimulator.mock.calls.map((c) => c.arguments), [[NAMES[1], '27.0']])
})

test('simulators step: reports a simulator that could not be created and still tries the others', async () => {
  lib.listSimulators.mock.mockImplementation(() => [])
  lib.createSimulator.mock.mockImplementationOnce(() => ({ output: 'Invalid runtime', exitCode: 1 }))
  assert.equal(await planIos()[SIMULATORS].apply(), false)
  assert.equal(lib.createSimulator.mock.callCount(), 2)
  assert.ok(output.some((line) => line.includes('Invalid runtime')))
})

test('simulators step: needs the runtime first', async () => {
  const steps = planIos()
  lib.hasRuntime.mock.mockImplementation(() => false)
  assert.equal(await steps[SIMULATORS].apply(), false)

  withoutXcode()
  assert.equal(await planIos()[SIMULATORS].apply(), false)
  assert.equal(lib.createSimulator.mock.callCount(), 0)
})

test('a dry run changes nothing and says what it would do', async () => {
  withoutXcode()
  FLAGS.dryRun = true
  const steps = planIos()
  for (const s of steps.slice(1)) assert.equal(await s.apply(), true)
  for (const fn of [lib.acceptLicenseAndInstallComponents, lib.downloadRuntime, lib.registerDownloadedRuntime, lib.createSimulator]) {
    assert.equal(fn.mock.callCount(), 0)
  }
  assert.equal(output.filter((line) => line.includes('[dry run]')).length, 4)
})

test('setupIos on a ready machine only prints how to start the simulators', async () => {
  assert.equal(await setupIos(), true)
  const text = output.join('\n')
  assert.match(text, /Everything for iOS is already set up/)
  assert.match(text, /npm install -g start-ios-simulator/)
  assert.match(text.replace(/\x1b\[[0-9;]*m/g, ''), /^\s*start-ios-simulator$/m)
  assert.match(text, new RegExp(`xcrun simctl boot ${NAMES[1]}`))
  assert.match(text, /open -a Simulator \(Xcode 26 and older\) or Device Hub \(Xcode 27\)/)
})

test('setupIos stops at the first step that fails', async () => {
  lib.licenseAccepted.mock.mockImplementation(() => false)
  lib.acceptLicenseAndInstallComponents.mock.mockImplementation(() => false)
  assert.equal(await setupIos(), false)
  assert.equal(lib.downloadRuntime.mock.callCount(), 0)
})
