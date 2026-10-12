import assert from 'node:assert/strict'
import { beforeEach, mock, test } from 'node:test'

const inspect = mock.fn(async () => ({ sdk: '/sdk' }))
const listEmulators = mock.fn(async () => ['Other', 'Workshop_2_Pixel', 'Workshop_1_Pixel'])
const findRunning = mock.fn(() => null)
const launchEmulator = mock.fn(() => ({ logFile: '/log', exited: null }))
const waitForEmulator = mock.fn(async () => ({ serial: 'emulator-5554', booted: true }))
mock.module('start-android-emulator', {
  namedExports: { adbBinary: (sdk) => `${sdk}/adb`, findRunning, inspect, launchEmulator, listEmulators, waitForBoot: waitForEmulator },
})
const listSimulators = mock.fn()
const bootSimulator = mock.fn(() => ({ ok: true, output: '' }))
const runFile = mock.fn(() => ({ output: '', exitCode: 0 }))
mock.module('../scripts/lib/shell.mjs', { namedExports: { runFile } })
const waitForSimulator = mock.fn(async () => {})
mock.module('start-ios-simulator', { namedExports: { bootSimulator, listSimulators, waitForBoot: waitForSimulator } })
const androidReady = mock.fn(() => true)
mock.module('../scripts/lib/smoke.mjs', { namedExports: { DEVICE_BOOT_TIMEOUT: 1000, androidReady } })
const { openSimulatorWindow, startEmulator, startSimulator, workshopEmulators, workshopSimulators } = await import('../scripts/lib/devices.mjs')

const simulator = (name, version, udid = name) => ({ name, version, udid, booted: false })

beforeEach(() => {
  for (const fn of [inspect, findRunning, launchEmulator, waitForEmulator, bootSimulator, waitForSimulator, runFile, androidReady, listEmulators, listSimulators]) fn.mock.resetCalls()
  inspect.mock.mockImplementation(async () => ({ sdk: '/sdk' }))
  listEmulators.mock.mockImplementation(async () => ['Other', 'Workshop_2_Pixel', 'Workshop_1_Pixel'])
  findRunning.mock.mockImplementation(() => null)
  androidReady.mock.mockImplementation(() => true)
  bootSimulator.mock.mockImplementation(() => ({ ok: true, output: '' }))
  runFile.mock.mockImplementation(() => ({ output: '', exitCode: 0 }))
})

test('the workshop emulators are the Workshop ones, in order', async () => {
  assert.deepEqual(await workshopEmulators(), { sdk: '/sdk', names: ['Workshop_1_Pixel', 'Workshop_2_Pixel'] })
})

test('without an Android SDK there are no workshop emulators', async () => {
  inspect.mock.mockImplementation(async () => ({ sdk: null }))
  assert.deepEqual(await workshopEmulators(), { sdk: null, names: [] })
})

test('when the module cannot list emulators there are none', async () => {
  listEmulators.mock.mockImplementation(async () => null)
  assert.deepEqual(await workshopEmulators(), { sdk: '/sdk', names: [] })
})

test('the workshop simulators are the Workshop ones on the newest iOS version they exist for', () => {
  listSimulators.mock.mockImplementation(() => [
    simulator('Workshop_2_iPhone', '27.0'),
    simulator('Workshop_1_iPhone', '27.0'),
    simulator('Workshop_1_iPhone', '26.0'),
    simulator('iPhone 17', '27.0'),
  ])
  assert.deepEqual(workshopSimulators().map((s) => `${s.name} ${s.version}`), ['Workshop_1_iPhone 27.0', 'Workshop_2_iPhone 27.0'])
})

test('without simctl there are no workshop simulators', () => {
  listSimulators.mock.mockImplementation(() => null)
  assert.deepEqual(workshopSimulators(), [])
})

test('an emulator is launched, awaited and checked for readiness', async () => {
  assert.equal(await startEmulator('/sdk', 'Workshop_1_Pixel'), 'emulator-5554')
  assert.equal(launchEmulator.mock.calls[0].arguments[1].name, 'Workshop_1_Pixel')
  assert.equal(androidReady.mock.calls[0].arguments[0], 'emulator-5554')
})

test('an emulator that already runs is not launched again', async () => {
  findRunning.mock.mockImplementation(() => ({ serial: 'emulator-5556', booted: true }))
  assert.equal(await startEmulator('/sdk', 'Workshop_1_Pixel'), 'emulator-5556')
  assert.equal(launchEmulator.mock.callCount(), 0)
})

test('an emulator that never gets ready is reported', async () => {
  androidReady.mock.mockImplementation(() => false)
  await assert.rejects(startEmulator('/sdk', 'Workshop_1_Pixel'), /did not get ready/)
})

test('a simulator is booted, awaited and shown in a window', async () => {
  assert.equal(await startSimulator(simulator('Workshop_1', '27.0', 'UDID-1')), 'UDID-1')
  assert.deepEqual(bootSimulator.mock.calls[0].arguments, ['UDID-1'])
  assert.deepEqual(runFile.mock.calls[0].arguments, ['open', ['-a', 'Simulator', '--args', '-CurrentDeviceUDID', 'UDID-1']])
})

test('a simulator that does not boot is reported', async () => {
  bootSimulator.mock.mockImplementation(() => ({ ok: false, output: 'no' }))
  await assert.rejects(startSimulator(simulator('Workshop_1', '27.0')), /did not boot/)
})

test('when the Simulator app cannot be opened, Device Hub is tried', () => {
  runFile.mock.mockImplementation((file, args) => ({ output: '', exitCode: args[0] === '-a' ? 1 : 0 }))
  assert.equal(openSimulatorWindow('UDID-1'), true)
  assert.deepEqual(runFile.mock.calls[1].arguments, ['open', ['devices://device/open?id=UDID-1']])
})

test('a simulator that cannot be shown in a window is not an error', () => {
  runFile.mock.mockImplementation(() => ({ output: '', exitCode: 1 }))
  assert.equal(openSimulatorWindow('UDID-1'), false)
})
