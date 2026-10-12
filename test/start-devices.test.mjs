import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'

const workshopEmulators = mock.fn()
const workshopSimulators = mock.fn()
const startEmulator = mock.fn(async () => 'emulator-5554')
const startSimulator = mock.fn(async () => 'UDID')
mock.module('../scripts/lib/devices.mjs', { namedExports: { LAUNCH_GAP: 4000, startEmulator, startSimulator, workshopEmulators, workshopSimulators } })
const { planDevices, platformsToStart } = await import('../scripts/start-devices.mjs')

beforeEach(() => {
  workshopEmulators.mock.mockImplementation(async () => ({ sdk: '/sdk', names: ['Workshop_1', 'Workshop_2'] }))
  workshopSimulators.mock.mockImplementation(() => [{ name: 'Workshop_1_iPhone', udid: 'A' }, { name: 'Workshop_2_iPhone', udid: 'B' }])
  startEmulator.mock.resetCalls()
  startSimulator.mock.resetCalls()
})
afterEach(() => mock.restoreAll())

test('without arguments both platforms start on a Mac', () => {
  assert.deepEqual(platformsToStart([], true), { android: true, ios: true, requestedIosOnWrongOs: false })
})

test('with an argument only that platform starts', () => {
  assert.deepEqual(platformsToStart(['android'], true), { android: true, ios: false, requestedIosOnWrongOs: false })
  assert.deepEqual(platformsToStart(['ios'], true), { android: false, ios: true, requestedIosOnWrongOs: false })
})

test('iOS is never started on another system than a Mac', () => {
  assert.deepEqual(platformsToStart([], false), { android: true, ios: false, requestedIosOnWrongOs: false })
  assert.equal(platformsToStart(['ios'], false).requestedIosOnWrongOs, true)
})

test('every workshop device becomes a job with a label, the second emulator starting a little later', async () => {
  const { jobs, missing } = await planDevices({ android: true, ios: true })
  assert.deepEqual(jobs.map((job) => [job.label, job.name, job.delay]), [
    ['Emulator 1', 'Workshop_1', 0],
    ['Emulator 2', 'Workshop_2', 4000],
    ['Simulator 1', 'Workshop_1_iPhone', 0],
    ['Simulator 2', 'Workshop_2_iPhone', 0],
  ])
  assert.deepEqual(missing, [])
  await jobs[1].start()
  await jobs[3].start()
  assert.deepEqual(startEmulator.mock.calls[0].arguments, ['/sdk', 'Workshop_2'])
  assert.deepEqual(startSimulator.mock.calls[0].arguments, [{ name: 'Workshop_2_iPhone', udid: 'B' }])
})

test('only the asked platform is planned, and missing devices are named', async () => {
  workshopEmulators.mock.mockImplementation(async () => ({ sdk: null, names: [] }))
  const { jobs, missing } = await planDevices({ android: true, ios: false })
  assert.deepEqual(jobs, [])
  assert.deepEqual(missing, ['emulators'])
  workshopSimulators.mock.mockImplementation(() => [])
  assert.deepEqual((await planDevices({ android: false, ios: true })).missing, ['simulators'])
})
