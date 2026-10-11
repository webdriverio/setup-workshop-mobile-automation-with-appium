import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'

const { checkSimulators, checkXcode } = await import('../scripts/checks/ios.mjs')

const NAMES = ['Workshop_1_iPhone', 'Workshop_2_iPhone']
const target = { version: '27.0', simulators: NAMES.map((name) => ({ name })) }
let output
const text = () => output.join('\n')

/** What inspect() finds on a machine that is ready. Tests change what they need. */
const machine = (changes = {}) => ({
  xcode: { version: '27.0', path: '/Xcode' },
  xcodeApps: ['/Applications/Xcode.app'],
  licenseReady: true,
  runtimes: [{ version: '27.0' }],
  simulators: NAMES.map((name) => ({ name })),
  ...changes,
})

beforeEach(() => {
  output = []
  mock.method(console, 'log', (line) => output.push(line))
})
afterEach(() => mock.restoreAll())

test('Xcode passes when it is installed, licensed and has its components', () => {
  assert.equal(checkXcode(machine()), true)
  assert.match(text(), /Xcode 27\.0, \/Xcode/)
  assert.match(text(), /licence accepted/)
})

test('Xcode fails and points to the App Store when it is missing', () => {
  assert.equal(checkXcode(machine({ xcode: null, xcodeApps: [] })), false)
  assert.match(text(), /Xcode not found/)
  assert.match(text(), /App Store/)
})

test('Xcode fails and says so when it is installed but the terminal does not use it', () => {
  assert.equal(checkXcode(machine({ xcode: null })), false)
  assert.match(text(), /your terminal does not use it/)
  assert.match(text(), /npm run setup/)
})

test('Xcode fails when the licence is not accepted or the components are not installed', () => {
  assert.equal(checkXcode(machine({ licenseReady: false })), false)
  assert.match(text(), /licence not accepted/)
  assert.match(text(), /npm run setup/)
})

test('the simulators pass when the runtime and both workshop simulators exist', () => {
  assert.equal(checkSimulators(machine(), target), true)
  assert.match(text(), /iOS 27\.0 simulator runtime/)
  assert.match(text(), /Workshop simulators: Workshop_1_iPhone, Workshop_2_iPhone/)
})

test('the simulators fail when the runtime is not installed, or when the iOS version is not known', () => {
  assert.equal(checkSimulators(machine({ runtimes: [{ version: '26.4' }] }), target), false)
  assert.match(text(), /iOS 27\.0 simulator runtime not installed/)
  output = []
  assert.equal(checkSimulators(machine({ runtimes: [] }), { ...target, version: null }), false)
  assert.match(text(), /iOS simulator runtime not installed/)
})

test('the simulators fail and name the workshop simulators that are missing', () => {
  assert.equal(checkSimulators(machine({ simulators: [{ name: 'Workshop_1_iPhone' }] }), target), false)
  assert.match(text(), /missing: Workshop_2_iPhone/)
})
