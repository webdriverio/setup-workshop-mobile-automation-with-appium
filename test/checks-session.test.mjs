import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'

const runSmokeTest = mock.fn()
mock.module('../scripts/lib/smoke.mjs', {
  namedExports: {
    runSmokeTest,
    explainFailure: (error, platform) => `hint for ${platform}: ${error?.message ?? error}`,
    appiumErrorLines: (log) => log.filter((line) => line.startsWith('error')),
  },
})
const { checkSessions } = await import('../scripts/checks/session.mjs')

let output
let events
const text = () => output.join('\n')
const stop = mock.fn()
const progress = {
  update: (name, text) => events.push(['update', name, text]),
  done: (name, passed, text) => events.push(['done', name, passed, text]),
  stop: () => events.push(['stop']),
}
const device = (extra = {}) => async () => ({ udid: 'emulator-5554', stop, ...extra })

beforeEach(() => {
  output = []
  events = []
  mock.method(console, 'log', (line) => output.push(line))
  stop.mock.resetCalls()
  runSmokeTest.mock.mockImplementation(async () => ({ passed: true, log: [] }))
})
afterEach(() => mock.restoreAll())

test('sessions that open pass, and the device we started is stopped', async () => {
  assert.equal(await checkSessions([{ name: 'Android', ensureDevice: device() }], progress), true)
  assert.deepEqual(runSmokeTest.mock.calls[0].arguments[0], { platform: 'android', udid: 'emulator-5554' })
  assert.ok(events.some((e) => e[0] === 'done' && e[1] === 'Android' && e[2] === true))
  assert.equal(stop.mock.callCount(), 1)
})

test('both platforms run at the same time', async () => {
  const order = []
  const slow = (name, ms) => async ({ onStatus }) => {
    onStatus('Starting...')
    order.push(`${name} start`)
    await new Promise((resolve) => setTimeout(resolve, ms))
    order.push(`${name} ready`)
    return { udid: name, stop: null }
  }
  const platforms = [{ name: 'Android', ensureDevice: slow('Android', 40) }, { name: 'iOS', ensureDevice: slow('iOS', 5) }]
  assert.equal(await checkSessions(platforms, progress), true)
  assert.deepEqual(order, ['Android start', 'iOS start', 'iOS ready', 'Android ready'])
  assert.ok(events.some((e) => e[0] === 'update' && e[1] === 'iOS' && e[2] === 'Starting...'))
})

test('a failed session explains why after the live lines, with the platform in front', async () => {
  runSmokeTest.mock.mockImplementation(async () => ({ passed: false, log: ['fine', 'error: boom'] }))
  assert.equal(await checkSessions([{ name: 'Android', ensureDevice: device() }], progress), false)
  assert.ok(events.some((e) => e[0] === 'done' && e[2] === false && /could not open a session/.test(e[3])))
  assert.match(text(), /\[Android\] hint for android: fine\nerror: boom/)
  assert.match(text(), /\[Android\]   error: boom/)
  assert.equal(stop.mock.callCount(), 1)
})

test('one platform failing does not stop the other', async () => {
  const failing = async () => { throw new Error('NO_DEVICE') }
  const platforms = [{ name: 'Android', ensureDevice: failing }, { name: 'iOS', ensureDevice: device() }]
  assert.equal(await checkSessions(platforms, progress), false)
  assert.ok(events.some((e) => e[0] === 'done' && e[1] === 'Android' && /could not get a device/.test(e[3])))
  assert.ok(events.some((e) => e[0] === 'done' && e[1] === 'iOS' && e[2] === true))
  assert.match(text(), /\[Android\] hint for android: NO_DEVICE/)
})

test('a device that was already running has no stop and is left alone', async () => {
  assert.equal(await checkSessions([{ name: 'iOS', ensureDevice: async () => ({ udid: 'U', stop: null }) }], progress), true)
})

test('without a given progress the sessions still run (it writes to the terminal itself)', async () => {
  assert.equal(await checkSessions([{ name: 'iOS', ensureDevice: async () => ({ udid: 'U', stop: null }) }]), true)
})
