import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, mock, test } from 'node:test'

const run = mock.fn()
const runFile = mock.fn()
const runFileAsync = mock.fn()
const spawn = mock.fn()
mock.module('../scripts/lib/shell.mjs', { namedExports: { run, runFile, runFileAsync } })
mock.module('node:child_process', { namedExports: { spawn } })
const smoke = await import('../scripts/lib/smoke.mjs')
const { androidCapabilities, iosCapabilities } = await import('../scripts/smoke/capabilities.mjs')

const result = (output = '', exitCode = 0) => ({ output, exitCode })

// Waiting is pointless in tests: make every sleep immediate
const realSetTimeout = globalThis.setTimeout
globalThis.setTimeout = (fn) => realSetTimeout(fn, 0)

const ADB_ONE = 'List of devices attached\nemulator-5554\tdevice\n'
const sims = (...devices) => JSON.stringify({ devices: { 'iOS 27.0': devices } })

beforeEach(() => {
  for (const fn of [run, runFile, runFileAsync, spawn]) {
    fn.mock.resetCalls()
    fn.mock.mockImplementation(() => undefined)
  }
})

// ─── capabilities ───────────────────────────────────────────────────────────

test('the capabilities open the Settings app on the given device, like exercise 1 does', () => {
  const android = androidCapabilities('emulator-5554')
  assert.equal(android['appium:udid'], 'emulator-5554')
  assert.equal(android['appium:appPackage'], 'com.android.settings')
  const ios = iosCapabilities('ABC-123')
  assert.equal(ios['appium:udid'], 'ABC-123')
  assert.equal(ios['appium:bundleId'], 'com.apple.Preferences')
})

// ─── devices ────────────────────────────────────────────────────────────────

test('parseAdbDevices only returns emulators that are fully connected', () => {
  const output = 'List of devices attached\nemulator-5554\tdevice\nemulator-5556\toffline\nR58M123\tdevice\n\n'
  assert.deepEqual(smoke.parseAdbDevices(output), ['emulator-5554'])
  assert.deepEqual(smoke.parseAdbDevices(null), [])
  assert.deepEqual(smoke.parseAdbDevices(''), [])
})

test('pickAvd prefers a workshop emulator, then any emulator', () => {
  assert.equal(smoke.pickAvd(['Pixel_9', 'Workshop_1_Pixel_10_API_37_0']), 'Workshop_1_Pixel_10_API_37_0')
  assert.equal(smoke.pickAvd(['Pixel_9']), 'Pixel_9')
  assert.equal(smoke.pickAvd([]), null)
})

test('an Android emulator that is already running is used and not stopped', async () => {
  run.mock.mockImplementation(() => ADB_ONE)
  assert.deepEqual(await smoke.ensureAndroidDevice(), { udid: 'emulator-5554', stop: null })
  assert.equal(spawn.mock.callCount(), 0)
})

test('without an AVD there is no Android device to test with', async () => {
  run.mock.mockImplementation((cmd) => (cmd === 'adb devices' ? 'List of devices attached\n' : ''))
  await assert.rejects(smoke.ensureAndroidDevice(), /NO_DEVICE/)
  run.mock.mockImplementation(() => null)
  await assert.rejects(smoke.ensureAndroidDevice(), /NO_DEVICE/)
})

test('an emulator is started when none runs, and the caller can stop it afterwards', async () => {
  const unref = mock.fn()
  spawn.mock.mockImplementation(() => ({ unref }))
  const statuses = []
  let adbCalls = 0
  run.mock.mockImplementation((cmd) => {
    if (cmd === 'emulator -list-avds') return 'Pixel_9\nWorkshop_2_Pixel_10_API_37_0'
    if (cmd === 'adb devices') return ++adbCalls < 3 ? 'List of devices attached\n' : ADB_ONE
    if (cmd === 'adb -s emulator-5554 shell getprop sys.boot_completed') return adbCalls < 4 ? '' : '1'
    if (cmd === 'adb -s emulator-5554 shell getprop init.svc.bootanim') return 'stopped'
    if (cmd === 'adb -s emulator-5554 shell pm path com.android.settings') return 'package:/system/priv-app/Settings/Settings.apk'
    if (cmd === 'adb -s emulator-5554 forward tcp:0 tcp:6790') return '41234'
  })
  const device = await smoke.ensureAndroidDevice({ onStatus: (m) => statuses.push(m) })
  assert.equal(device.udid, 'emulator-5554')
  assert.deepEqual(spawn.mock.calls[0].arguments.slice(0, 2), ['emulator', ['-avd', 'Workshop_2_Pixel_10_API_37_0', '-no-snapshot-save', '-no-audio']])
  assert.equal(unref.mock.callCount(), 1)
  assert.match(statuses[0], /Workshop_2/)
  device.stop()
  assert.deepEqual(runFile.mock.calls[0].arguments, ['adb', ['-s', 'emulator-5554', 'emu', 'kill']])
})

test('androidReady only says yes when the emulator accepts the port forwarding of the driver', () => {
  const answers = { boot: '1', anim: 'stopped', pm: 'package:/x', forward: '41234' }
  run.mock.mockImplementation((cmd) => ({
    'adb -s e shell getprop sys.boot_completed': answers.boot,
    'adb -s e shell getprop init.svc.bootanim': answers.anim,
    'adb -s e shell pm path com.android.settings': answers.pm,
    'adb -s e forward tcp:0 tcp:6790': answers.forward,
  })[cmd] ?? null)
  assert.equal(smoke.androidReady('e'), true)
  assert.equal(run.mock.calls.at(-1).arguments[0], 'adb -s e forward --remove tcp:41234') // leave nothing behind
  for (const [key, bad] of [['boot', ''], ['anim', 'running'], ['pm', null], ['forward', null]]) {
    const saved = answers[key]
    answers[key] = bad
    assert.equal(smoke.androidReady('e'), false, key)
    answers[key] = saved
  }
})

test('giving up on an emulator that never finishes booting', async () => {
  spawn.mock.mockImplementation(() => ({ unref() {} }))
  run.mock.mockImplementation((cmd) => (cmd === 'emulator -list-avds' ? 'Pixel_9' : 'List of devices attached\n'))
  const now = mock.method(Date, 'now')
  let t = 0
  now.mock.mockImplementation(() => (t += smoke.DEVICE_BOOT_TIMEOUT / 2))
  try {
    await assert.rejects(smoke.ensureAndroidDevice(), /DEVICE_BOOT_TIMEOUT/)
  } finally {
    now.mock.restore()
  }
})

test('a booted iOS simulator is used and not stopped', async () => {
  run.mock.mockImplementation(() => sims({ name: 'iPhone 17', udid: 'U1', state: 'Booted' }))
  assert.deepEqual(await smoke.ensureIosDevice(), { udid: 'U1', stop: null })
})

test('without a simulator there is no iOS device to test with', async () => {
  run.mock.mockImplementation(() => sims({ name: 'Apple Watch', udid: 'W1', state: 'Shutdown' }))
  await assert.rejects(smoke.ensureIosDevice(), /NO_DEVICE/)
  run.mock.mockImplementation(() => 'not json')
  await assert.rejects(smoke.ensureIosDevice(), /NO_DEVICE/)
  run.mock.mockImplementation(() => null)
  await assert.rejects(smoke.ensureIosDevice(), /NO_DEVICE/)
  run.mock.mockImplementation(() => '{}')
  await assert.rejects(smoke.ensureIosDevice(), /NO_DEVICE/)
})

test('a workshop simulator is booted when none runs, and shut down by the caller', async () => {
  run.mock.mockImplementation(() => sims(
    { name: 'iPhone 17', udid: 'U1', state: 'Shutdown' },
    { name: 'Workshop_1_iPhone_17_Pro_iOS_27_0', udid: 'U2', state: 'Shutdown' },
  ))
  runFile.mock.mockImplementation(() => result())
  runFileAsync.mock.mockImplementation(async () => result())
  const statuses = []
  const device = await smoke.ensureIosDevice({ onStatus: (m) => statuses.push(m) })
  assert.equal(device.udid, 'U2')
  assert.match(statuses[0], /Workshop_1/)
  assert.deepEqual(runFileAsync.mock.calls.map((c) => c.arguments[1].slice(0, 2)), [['simctl', 'boot'], ['simctl', 'bootstatus']])
  device.stop()
  assert.deepEqual(runFile.mock.calls.at(-1).arguments[1], ['simctl', 'shutdown', 'U2'])
})

test('any iPhone simulator will do when the workshop ones are missing, and a failing boot is reported', async () => {
  run.mock.mockImplementation(() => sims({ name: 'iPhone 17', udid: 'U1', state: 'Shutdown' }))
  runFileAsync.mock.mockImplementation(async () => result('', 1))
  await assert.rejects(smoke.ensureIosDevice(), /DEVICE_BOOT_FAILED/)
  assert.equal(runFileAsync.mock.calls[0].arguments[1][2], 'U1')
})

// ─── Appium ─────────────────────────────────────────────────────────────────

test('freePort gives a usable port number', async () => {
  const port = await smoke.freePort()
  assert.ok(Number.isInteger(port) && port > 0)
})

test('freePort rejects when the server cannot listen', async () => {
  const net = await import('node:net')
  const original = net.Server.prototype.listen
  net.Server.prototype.listen = function () {
    queueMicrotask(() => this.emit('error', new Error('EACCES')))
    return this
  }
  try {
    await assert.rejects(smoke.freePort(), /EACCES/)
  } finally {
    net.Server.prototype.listen = original
  }
})

/** Pretend to be the runner: look at what it was started with and finish with the given exit code and output. */
function fakeRunner(...runs) {
  const seen = []
  runFileAsync.mock.mockImplementation(async (file, args, options) => {
    const { SMOKE_PLATFORM, SMOKE_UDID, SMOKE_PORT, SMOKE_LOG_DIR } = options.env
    seen.push({ file, args, platform: SMOKE_PLATFORM, udid: SMOKE_UDID, port: SMOKE_PORT, timeout: options.timeout })
    const { output = '', exitCode = 0, appiumLog } = runs[Math.min(seen.length, runs.length) - 1]
    if (appiumLog) writeFileSync(join(SMOKE_LOG_DIR, 'wdio-appium.log'), appiumLog)
    return { output, exitCode }
  })
  return seen
}

test('runSmokeTest runs the WebdriverIO runner in its own process, for the given platform and device', async () => {
  const seen = fakeRunner({ output: 'PASSED', appiumLog: 'Appium started\n' })
  const result = await smoke.runSmokeTest({ platform: 'android', udid: 'emulator-5554' })
  assert.deepEqual(result, { passed: true, log: ['PASSED', 'Appium started'] })
  assert.equal(seen.length, 1)
  assert.equal(seen[0].file, process.execPath)
  assert.deepEqual(seen[0].args, [smoke.RUNNER])
  assert.match(smoke.RUNNER, /smoke[\\/]run\.mjs$/)
  assert.equal(seen[0].platform, 'android')
  assert.equal(seen[0].udid, 'emulator-5554')
  assert.ok(Number(seen[0].port) > 0)
  assert.equal(seen[0].timeout, smoke.SESSION_TIMEOUT)
})

test('runSmokeTest reports a failure with the output of the runner, and cleans up its log folder', async () => {
  let logDir
  runFileAsync.mock.mockImplementation(async (file, args, options) => {
    logDir = options.env.SMOKE_LOG_DIR
    return { output: ' FAILED  \n\nboom ', exitCode: 1 }
  })
  const result = await smoke.runSmokeTest({ platform: 'ios', udid: 'U1' })
  assert.deepEqual(result, { passed: false, log: ['FAILED', 'boom'] })
  assert.throws(() => readFileSync(logDir), /ENOENT/)
})

test('runSmokeTest tries once more with a new port when the first port was taken', async () => {
  const seen = fakeRunner({ output: 'Unable to connect to "http://127.0.0.1:1/"', exitCode: 1 }, { output: 'PASSED' })
  assert.equal((await smoke.runSmokeTest({ platform: 'android', udid: 'e' })).passed, true)
  assert.equal(seen.length, 2)
})

test('runSmokeTest gives up after the second try, and does not retry other failures', async () => {
  let seen = fakeRunner({ output: 'EADDRINUSE', exitCode: 1 })
  assert.equal((await smoke.runSmokeTest({ platform: 'android', udid: 'e' })).passed, false)
  assert.equal(seen.length, 2)
  seen = fakeRunner({ output: 'Cannot find any free port in range 8200..8299', exitCode: 1 }, { output: 'PASSED' })
  assert.equal((await smoke.runSmokeTest({ platform: 'android', udid: 'e' })).passed, true)
  assert.equal(seen.length, 2)
  seen = fakeRunner({ output: 'Error: no such app', exitCode: 1 })
  assert.equal((await smoke.runSmokeTest({ platform: 'android', udid: 'e' })).passed, false)
  assert.equal(seen.length, 1)
})

// ─── failure hints ──────────────────────────────────────────────────────────

test('explainFailure gives plain advice for the failures we know', () => {
  const advice = (message, platform = 'android') => smoke.explainFailure(new Error(message), platform)
  assert.match(advice('NO_DEVICE'), /no emulator.*npm run setup/)
  assert.match(advice('NO_DEVICE', 'ios'), /no simulator.*npm run setup/)
  assert.match(advice('DEVICE_BOOT_TIMEOUT'), /emulator did not start/)
  assert.match(advice('DEVICE_BOOT_FAILED', 'ios'), /simulator did not start/)
  assert.match(advice('JAVA_HOME is not set'), /Java was not found/)
  assert.match(advice('Neither ANDROID_HOME nor ANDROID_SDK_ROOT'), /Android SDK was not found/)
  assert.match(advice('xcodebuild failed with code 65', 'ios'), /Open Xcode once/)
  assert.match(advice('connect ECONNREFUSED 127.0.0.1:4723'), /connection to Appium was lost/)
  assert.match(advice('Request timed out'), /too long/)
})

test('explainFailure always returns a line, even for errors it does not know', () => {
  assert.match(smoke.explainFailure(new Error('something odd'), 'android'), /issue/)
  assert.match(smoke.explainFailure('plain string', 'android'), /issue/)
  assert.match(smoke.explainFailure(undefined, 'android'), /issue/)
})

test('appiumErrorLines keeps the last lines that look like an error', () => {
  const log = ['starting', 'Error: one', 'ok', 'Failed two', 'unable three', 'cannot four']
  assert.deepEqual(smoke.appiumErrorLines(log, 2), ['unable three', 'cannot four'])
  assert.deepEqual(smoke.appiumErrorLines(log), ['Error: one', 'Failed two', 'unable three', 'cannot four'])
  assert.deepEqual(smoke.appiumErrorLines(), [])
})
