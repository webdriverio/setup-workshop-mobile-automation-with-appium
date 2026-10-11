import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'

const adbBinary = mock.fn()
const run = mock.fn()
const runFile = mock.fn()
const fileExists = mock.fn()
const AVD_NAMES = ['Workshop_1', 'Workshop_2']
mock.module('start-android-emulator', { namedExports: { adbBinary } })
mock.module('../scripts/lib/system.mjs', { namedExports: { fileExists } })
mock.module('../scripts/lib/android.mjs', { namedExports: { AVD_NAMES } })
mock.module('../scripts/lib/shell.mjs', { namedExports: { run, runFile } })
const { checkAcceleration, checkAndroidSdk, checkEmulators, checkJava } = await import('../scripts/checks/android.mjs')

const savedEnv = { ...process.env }
let output
const text = () => output.join('\n')

/** What inspect() finds on a machine that is ready. Tests change what they need. */
const machine = (changes = {}) => ({
  sdk: '/sdk',
  sdkFound: true,
  java: { home: '/jdk', major: 21, source: 'JAVA_HOME' },
  avds: AVD_NAMES,
  env: { vars: [], pathMissing: false },
  ...changes,
})

beforeEach(() => {
  output = []
  mock.method(console, 'log', (line) => output.push(line))
  for (const fn of [adbBinary, run, runFile]) fn.mock.resetCalls()
  adbBinary.mock.mockImplementation(() => '/sdk/platform-tools/adb')
  runFile.mock.mockImplementation(() => ({ output: 'Android Debug Bridge version 1.0.41\nmore', exitCode: 0 }))
  run.mock.mockImplementation(() => 'accelerated')
  fileExists.mock.mockImplementation(() => true)
  Object.assign(process.env, { ANDROID_HOME: '/sdk', JAVA_HOME: '/jdk' })
})
afterEach(() => {
  mock.restoreAll()
  for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key]
  Object.assign(process.env, savedEnv)
})

test('Java passes with a JAVA_HOME of Java 17 or newer', () => {
  assert.equal(checkJava(machine()), true)
  assert.match(text(), /JAVA_HOME = \/jdk \(Java 21\)/)
})

test('Java passes without the version when the Java found is not the one of JAVA_HOME', () => {
  assert.equal(checkJava(machine({ java: { home: '/other', major: 21 } })), true)
  assert.match(text(), /JAVA_HOME = \/jdk$/m)
})

test('Java fails when JAVA_HOME is not set, and mentions the Java that setup downloaded', () => {
  delete process.env.JAVA_HOME
  const state = machine({ env: { vars: ['JAVA_HOME'], pathMissing: false }, java: { home: '/downloaded', major: 21 } })
  assert.equal(checkJava(state), false)
  assert.match(text(), /JAVA_HOME is not set/)
  assert.match(text(), /Java 21 is available at \/downloaded/)
  assert.match(text(), /npm run setup/)
})

test('Java fails when JAVA_HOME has no Java 17 or newer', () => {
  assert.equal(checkJava(machine({ env: { vars: ['JAVA_HOME'], pathMissing: false }, java: null })), false)
  assert.match(text(), /no Java 17 or newer there/)
  assert.doesNotMatch(text(), /is available at/)
})

test('the SDK passes with ANDROID_HOME, adb in the PATH and a working adb', () => {
  assert.equal(checkAndroidSdk(machine()), true)
  assert.match(text(), /ANDROID_HOME = \/sdk/)
  assert.match(text(), /adb, Android Debug Bridge version 1\.0\.41/)
  assert.deepEqual(runFile.mock.calls[0].arguments, ['/sdk/platform-tools/adb', ['--version']])
})

test('the SDK fails when ANDROID_HOME is not set, and says where an SDK was found', () => {
  delete process.env.ANDROID_HOME
  assert.equal(checkAndroidSdk(machine({ env: { vars: ['ANDROID_HOME'], pathMissing: false } })), false)
  assert.match(text(), /ANDROID_HOME is not set, but an Android SDK exists at \/sdk/)
})

test('the SDK fails when ANDROID_HOME is not set and there is no SDK at all', () => {
  delete process.env.ANDROID_HOME
  adbBinary.mock.mockImplementation(() => null)
  assert.equal(checkAndroidSdk(machine({ sdkFound: false, env: { vars: ['ANDROID_HOME'], pathMissing: true } })), false)
  assert.match(text(), /ANDROID_HOME is not set and no Android SDK was found/)
  assert.match(text(), /adb not found/)
})

test('the SDK fails when ANDROID_HOME points to a folder that does not exist', () => {
  fileExists.mock.mockImplementation(() => false)
  assert.equal(checkAndroidSdk(machine()), false)
  assert.match(text(), /ANDROID_HOME is set to "\/sdk" but that folder does not exist/)
})

test('the SDK fails when adb and the emulator are not in the PATH, but still tests the adb of the SDK', () => {
  assert.equal(checkAndroidSdk(machine({ env: { vars: [], pathMissing: true } })), false)
  assert.match(text(), /adb and the emulator are not in your PATH/)
  assert.match(text(), /adb, Android Debug Bridge/)
})

test('the SDK fails when the adb of the SDK prints nothing', () => {
  runFile.mock.mockImplementation(() => ({ output: '', exitCode: 1 }))
  assert.equal(checkAndroidSdk(machine()), false)
  assert.match(text(), /adb not found/)
})

test('the emulators pass when both workshop emulators exist', () => {
  assert.equal(checkEmulators(machine()), true)
  assert.match(text(), /Workshop emulators: Workshop_1, Workshop_2/)
})

test('the emulators fail when one is missing, and list the others on this machine', () => {
  assert.equal(checkEmulators(machine({ avds: ['Workshop_1', 'Pixel_9'] })), false)
  assert.match(text(), /Workshop emulator\(s\) missing: Workshop_2/)
  assert.match(text(), /Other emulators on this machine: Workshop_1, Pixel_9/)
})

test('the emulators fail without a list of others when there are none', () => {
  assert.equal(checkEmulators(machine({ avds: [] })), false)
  assert.doesNotMatch(text(), /Other emulators/)
})

test('acceleration passes when the emulator says it is available', () => {
  assert.equal(checkAcceleration(), true)
  assert.match(text(), /Hardware acceleration/)
})

test('acceleration is only a warning when the emulator says it is not available', () => {
  run.mock.mockImplementation(() => null)
  assert.equal(checkAcceleration(), true)
  assert.match(text(), /hardware acceleration is not available/)
})
