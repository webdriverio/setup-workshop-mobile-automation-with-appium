import assert from 'node:assert/strict'
import { beforeEach, mock, test } from 'node:test'

const run = mock.fn()
const runFile = mock.fn()
const spawnSync = mock.fn()
const readdirSync = mock.fn()
const system = { arch: 'arm64' }
mock.module('../scripts/lib/shell.mjs', { namedExports: { run, runFile } })
mock.module('node:child_process', { namedExports: { spawnSync } })
mock.module('node:fs', { namedExports: { readdirSync } })
mock.module('node:os', { namedExports: { arch: () => system.arch } })
const ios = await import('../scripts/lib/ios.mjs')

const result = (output = '', exitCode = 0) => ({ output, exitCode })
/** Answer `xcrun simctl ...` calls from a table, everything else succeeds with no output. */
const simctl = (table) =>
  runFile.mock.mockImplementation((file, args) => {
    const key = args.slice(1).join(' ')
    return file === 'xcrun' && key in table ? table[key] : result()
  })

beforeEach(() => {
  for (const fn of [run, runFile, spawnSync, readdirSync]) fn.mock.resetCalls()
  system.arch = 'arm64'
})

test('detectXcode reads the version and the developer folder', () => {
  run.mock.mockImplementation((cmd) => (cmd === 'xcodebuild -version' ? 'Xcode 27.0\nBuild version 27A266a' : '/Applications/Xcode.app/Contents/Developer'))
  assert.deepEqual(ios.detectXcode(), { version: '27.0', path: '/Applications/Xcode.app/Contents/Developer' })
})

test('detectXcode returns null when only the command line tools are there', () => {
  run.mock.mockImplementation(() => null)
  assert.equal(ios.detectXcode(), null)
})

test('simulatorSdkVersion asks Xcode for the iOS simulator SDK version', () => {
  run.mock.mockImplementation(() => '27.0')
  assert.equal(ios.simulatorSdkVersion(), '27.0')
  assert.equal(run.mock.calls.at(-1).arguments[0], 'xcodebuild -version -sdk iphonesimulator ProductVersion')
})

test('licence and first launch checks follow the exit code of xcodebuild', () => {
  runFile.mock.mockImplementation(() => result('', 0))
  assert.equal(ios.licenseAccepted(), true)
  assert.equal(ios.firstLaunchDone(), true)
  runFile.mock.mockImplementation(() => result('', 69))
  assert.equal(ios.licenseAccepted(), false)
  assert.equal(ios.firstLaunchDone(), false)
})

test('accepting the licence and installing components needs both sudo commands to work', () => {
  spawnSync.mock.mockImplementation(() => ({ status: 0 }))
  assert.equal(ios.acceptLicenseAndInstallComponents(), true)
  assert.deepEqual(spawnSync.mock.calls.map((c) => c.arguments[1]), [
    ['xcodebuild', '-license', 'accept'],
    ['xcodebuild', '-runFirstLaunch'],
  ])
  assert.equal(spawnSync.mock.calls[0].arguments[2].stdio, 'inherit') // so the password prompt is visible
})

test('when the licence is not accepted, the components are not installed', () => {
  spawnSync.mock.mockImplementation(() => ({ status: 1 }))
  assert.equal(ios.acceptLicenseAndInstallComponents(), false)
  assert.equal(spawnSync.mock.callCount(), 1)
})

test('runtimeId and simulatorNames follow the iOS version', () => {
  assert.equal(ios.runtimeId('27.0'), 'com.apple.CoreSimulator.SimRuntime.iOS-27-0')
  assert.deepEqual(ios.simulatorNames('26.4'), ['Workshop_1_iPhone_17_Pro_iOS_26_4', 'Workshop_2_iPhone_17_Pro_iOS_26_4'])
})

test('hasRuntime only counts an available iOS runtime of that exact version', () => {
  const runtimes = [
    { platform: 'iOS', version: '27.0', isAvailable: true },
    { platform: 'iOS', version: '26.5', isAvailable: false },
    { platform: 'tvOS', version: '26.4', isAvailable: true },
  ]
  simctl({ 'list runtimes -j': result(JSON.stringify({ runtimes })) })
  assert.equal(ios.hasRuntime('27.0'), true)
  assert.equal(ios.hasRuntime('26.5'), false)
  assert.equal(ios.hasRuntime('26.4'), false)
})

test('hasRuntime is false when simctl fails or prints something unexpected', () => {
  simctl({ 'list runtimes -j': result('', 1) })
  assert.equal(ios.hasRuntime('27.0'), false)
  simctl({ 'list runtimes -j': result('not json') })
  assert.equal(ios.hasRuntime('27.0'), false)
})

test('downloadRuntime asks for the arm64 variant on Apple Silicon, universal on Intel', () => {
  runFile.mock.mockImplementation(() => result())
  assert.equal(ios.downloadRuntime(), true)
  assert.deepEqual(runFile.mock.calls[0].arguments.slice(0, 2), ['xcodebuild', ['-downloadPlatform', 'iOS', '-architectureVariant', 'arm64']])
  system.arch = 'x64'
  ios.downloadRuntime()
  assert.equal(runFile.mock.calls[1].arguments[1].at(-1), 'universal')
})

test('downloadRuntime reports a failed download', () => {
  runFile.mock.mockImplementation(() => result('', 1))
  assert.equal(ios.downloadRuntime(), false)
})

const stuckImage = (extra = {}) => ({
  ABC: { runtimeIdentifier: 'com.apple.CoreSimulator.SimRuntime.iOS-27-0', state: 'Ready', signatureState: 'Unknown', path: '/assets/x.asset/AssetData', ...extra },
})

test('registerDownloadedRuntime adds the .dmg of a downloaded but unregistered runtime', () => {
  let registered = false
  runFile.mock.mockImplementation((file, args) => {
    const key = args.slice(1).join(' ')
    if (key === 'runtime list -j') return result(JSON.stringify(stuckImage()))
    if (key.startsWith('runtime add')) registered = true
    if (key === 'list runtimes -j') return result(JSON.stringify({ runtimes: registered ? [{ platform: 'iOS', version: '27.0', isAvailable: true }] : [] }))
    return result()
  })
  readdirSync.mock.mockImplementation(() => ['Firmware', 'Restore.plist', '043-70362-657.dmg'])

  assert.equal(ios.registerDownloadedRuntime('27.0'), true)
  assert.equal(readdirSync.mock.calls[0].arguments[0], '/assets/x.asset/AssetData/Restore')
  const add = runFile.mock.calls.find((c) => c.arguments[1].includes('add'))
  assert.deepEqual(add.arguments[1], ['simctl', 'runtime', 'add', '/assets/x.asset/AssetData/Restore/043-70362-657.dmg'])
})

test('registerDownloadedRuntime leaves alone what it should not touch', () => {
  const cases = [
    {}, // nothing downloaded
    stuckImage({ runtimeIdentifier: 'com.apple.CoreSimulator.SimRuntime.iOS-26-5' }), // another version
    stuckImage({ state: 'Unusable' }), // not ready
    stuckImage({ signatureState: 'Verified' }), // already fine
    stuckImage({ path: undefined }), // no folder to look in
  ]
  for (const images of cases) {
    simctl({ 'runtime list -j': result(JSON.stringify(images)) })
    assert.equal(ios.registerDownloadedRuntime('27.0'), false)
  }
  assert.ok(runFile.mock.calls.every((c) => !c.arguments[1].includes('add')))
})

test('registerDownloadedRuntime gives up when the download has no .dmg or adding fails', () => {
  simctl({ 'runtime list -j': result(JSON.stringify(stuckImage())) })
  readdirSync.mock.mockImplementation(() => ['Restore.plist'])
  assert.equal(ios.registerDownloadedRuntime('27.0'), false)

  readdirSync.mock.mockImplementation(() => ['a.dmg'])
  simctl({ 'runtime list -j': result(JSON.stringify(stuckImage())), 'runtime add /assets/x.asset/AssetData/Restore/a.dmg': result('', 1) })
  assert.equal(ios.registerDownloadedRuntime('27.0'), false)
})

test('listSimulators returns the names of the devices of every runtime', () => {
  const devices = { 'iOS 27.0': [{ name: 'A' }, { name: 'B' }], 'iOS 26.5': [{ name: 'C' }] }
  simctl({ 'list devices -j': result(JSON.stringify({ devices })) })
  assert.deepEqual(ios.listSimulators(), ['A', 'B', 'C'])
  simctl({ 'list devices -j': result('', 1) })
  assert.deepEqual(ios.listSimulators(), [])
})

test('createSimulator creates the iPhone on the runtime of that iOS version', () => {
  runFile.mock.mockImplementation(() => result('UDID'))
  assert.equal(ios.createSimulator('Workshop_1', '27.0').output, 'UDID')
  assert.deepEqual(runFile.mock.calls[0].arguments[1], ['simctl', 'create', 'Workshop_1', 'iPhone 17 Pro', 'com.apple.CoreSimulator.SimRuntime.iOS-27-0'])
})
