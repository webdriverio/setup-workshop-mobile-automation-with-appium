import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'

const lib = {
  androidEnvGaps: mock.fn(), detectJava: mock.fn(), detectSdkPath: mock.fn(), javaMajor: mock.fn(), platformToolsDirs: mock.fn(),
}
const applyToProcess = mock.fn()
const run = mock.fn()
const fileExists = mock.fn()
const AVD_NAMES = ['Workshop_1', 'Workshop_2']
mock.module('../scripts/lib/system.mjs', { namedExports: { fileExists } })
mock.module('../scripts/lib/android.mjs', { namedExports: { ...lib, AVD_NAMES, MIN_JAVA: 17 } })
mock.module('../scripts/lib/env.mjs', { namedExports: { applyToProcess } })
mock.module('../scripts/lib/shell.mjs', { namedExports: { run } })
const { checkAcceleration, checkAndroidSdk, checkEmulators, checkJava } = await import('../scripts/checks/android.mjs')

const savedEnv = { ...process.env }
let output
const text = () => output.join('\n')

beforeEach(() => {
  output = []
  mock.method(console, 'log', (line) => output.push(line))
  for (const fn of [...Object.values(lib), applyToProcess, run]) fn.mock.resetCalls()
  lib.androidEnvGaps.mock.mockImplementation(() => ({ vars: [], pathMissing: false }))
  lib.detectJava.mock.mockImplementation(() => null)
  lib.detectSdkPath.mock.mockImplementation(() => '/sdk')
  lib.javaMajor.mock.mockImplementation(() => 21)
  lib.platformToolsDirs.mock.mockImplementation((sdk) => [`${sdk}/platform-tools`, `${sdk}/emulator`])
  fileExists.mock.mockImplementation(() => true)
  run.mock.mockImplementation(() => 'Android Debug Bridge version 1.0.41\nmore')
  Object.assign(process.env, { ANDROID_HOME: '/sdk', JAVA_HOME: '/jdk' })
})
afterEach(() => {
  mock.restoreAll()
  for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key]
  Object.assign(process.env, savedEnv)
})

test('Java passes with a JAVA_HOME of Java 17 or newer', () => {
  assert.equal(checkJava(), true)
  assert.match(text(), /JAVA_HOME = \/jdk \(Java 21\)/)
})

test('Java fails when JAVA_HOME is not set, and mentions the Java that setup downloaded', () => {
  delete process.env.JAVA_HOME
  lib.androidEnvGaps.mock.mockImplementation(() => ({ vars: ['JAVA_HOME'], pathMissing: false }))
  lib.javaMajor.mock.mockImplementation(() => null)
  lib.detectJava.mock.mockImplementation(() => ({ home: '/downloaded', major: 21 }))
  assert.equal(checkJava(), false)
  assert.match(text(), /JAVA_HOME is not set/)
  assert.match(text(), /Java 21 is available at \/downloaded/)
  assert.match(text(), /npm run setup/)
})

test('Java fails when JAVA_HOME has no java or an old java', () => {
  lib.androidEnvGaps.mock.mockImplementation(() => ({ vars: ['JAVA_HOME'], pathMissing: false }))
  lib.javaMajor.mock.mockImplementation(() => null)
  assert.equal(checkJava(), false)
  assert.match(text(), /no java was found there/)

  output.length = 0
  lib.javaMajor.mock.mockImplementation(() => 11)
  assert.equal(checkJava(), false)
  assert.match(text(), /points to Java 11, Appium needs Java 17 or newer/)
})

test('the Android SDK passes when ANDROID_HOME, the PATH and adb are fine', () => {
  assert.equal(checkAndroidSdk(), true)
  assert.match(text(), /ANDROID_HOME = \/sdk/)
  assert.match(text(), /adb, Android Debug Bridge version 1\.0\.41/)
  assert.equal(applyToProcess.mock.callCount(), 0)
})

test('an unset ANDROID_HOME fails, but the SDK that was found is used for the next checks', () => {
  delete process.env.ANDROID_HOME
  lib.androidEnvGaps.mock.mockImplementation(() => ({ vars: ['ANDROID_HOME'], pathMissing: true }))
  assert.equal(checkAndroidSdk(), false)
  assert.match(text(), /ANDROID_HOME is not set, but an Android SDK exists at \/sdk/)
  assert.match(text(), /not in your PATH/)
  assert.deepEqual(applyToProcess.mock.calls[0].arguments[0], {
    vars: { ANDROID_HOME: '/sdk' },
    paths: ['/sdk/platform-tools', '/sdk/emulator'],
  })
})

test('an unset ANDROID_HOME without any SDK says so and has nothing to fall back on', () => {
  delete process.env.ANDROID_HOME
  lib.androidEnvGaps.mock.mockImplementation(() => ({ vars: ['ANDROID_HOME'], pathMissing: false }))
  lib.detectSdkPath.mock.mockImplementation(() => null)
  run.mock.mockImplementation(() => null)
  assert.equal(checkAndroidSdk(), false)
  assert.match(text(), /no Android SDK was found/)
  assert.match(text(), /adb not found/)
  assert.equal(applyToProcess.mock.callCount(), 0)
})

test('an ANDROID_HOME that points nowhere fails', () => {
  fileExists.mock.mockImplementation(() => false)
  assert.equal(checkAndroidSdk(), false)
  assert.match(text(), /that folder does not exist/)
})

test('the emulator check passes when both workshop emulators exist', () => {
  run.mock.mockImplementation(() => 'INFO | some warning\nWorkshop_1\nWorkshop_2\nPixel_9_API_37_0')
  assert.equal(checkEmulators(), true)
  assert.match(text(), /Workshop emulators: Workshop_1, Workshop_2/)
})

test('the emulator check names the workshop emulators that are missing, and lists the others', () => {
  run.mock.mockImplementation(() => 'Workshop_1\nPixel_9_API_37_0')
  assert.equal(checkEmulators(), false)
  assert.match(text(), /missing: Workshop_2/)
  assert.match(text(), /Other emulators on this machine: Workshop_1, Pixel_9_API_37_0/)

  output.length = 0
  run.mock.mockImplementation(() => '')
  assert.equal(checkEmulators(), false)
  assert.doesNotMatch(text(), /Other emulators/)
})

test('the emulator check fails without the emulator binary', () => {
  run.mock.mockImplementation(() => null)
  assert.equal(checkEmulators(), false)
  assert.match(text(), /emulator not found/)
})

test('acceleration passes when the emulator can use it', () => {
  assert.equal(checkAcceleration(), true)
  assert.match(text(), /Hardware acceleration for the emulator/)
})

test('missing acceleration is only a warning, with what to do', () => {
  run.mock.mockImplementation(() => null)
  assert.equal(checkAcceleration(), true)
  assert.match(text(), /acceleration is not available/)
  assert.match(text(), /emulator -accel-check/)
})
