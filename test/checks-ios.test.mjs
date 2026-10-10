import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'

const lib = {
  detectXcode: mock.fn(), firstLaunchDone: mock.fn(), hasRuntime: mock.fn(), licenseAccepted: mock.fn(), listSimulators: mock.fn(),
  simulatorSdkVersion: mock.fn(),
}
const NAMES = ['Workshop_1_iPhone', 'Workshop_2_iPhone']
mock.module('../scripts/lib/ios.mjs', { namedExports: { ...lib, simulatorNames: () => NAMES } })
const { checkSimulators, checkXcode } = await import('../scripts/checks/ios.mjs')

let output
const text = () => output.join('\n')

beforeEach(() => {
  output = []
  mock.method(console, 'log', (line) => output.push(line))
  lib.detectXcode.mock.mockImplementation(() => ({ version: '27.0', path: '/Xcode' }))
  lib.licenseAccepted.mock.mockImplementation(() => true)
  lib.firstLaunchDone.mock.mockImplementation(() => true)
  lib.simulatorSdkVersion.mock.mockImplementation(() => '27.0')
  lib.hasRuntime.mock.mockImplementation(() => true)
  lib.listSimulators.mock.mockImplementation(() => NAMES)
})
afterEach(() => mock.restoreAll())

test('Xcode passes when it is installed, licensed and has its components', () => {
  assert.equal(checkXcode(), true)
  assert.match(text(), /Xcode 27\.0, \/Xcode/)
})

test('Xcode fails when it is missing, or when the licence or components are not done', () => {
  lib.detectXcode.mock.mockImplementation(() => null)
  assert.equal(checkXcode(), false)
  assert.match(text(), /Xcode not found/)

  lib.detectXcode.mock.mockImplementation(() => ({ version: '27.0', path: '/Xcode' }))
  lib.licenseAccepted.mock.mockImplementation(() => false)
  assert.equal(checkXcode(), false)
  lib.licenseAccepted.mock.mockImplementation(() => true)
  lib.firstLaunchDone.mock.mockImplementation(() => false)
  assert.equal(checkXcode(), false)
  assert.match(text(), /npm run setup/)
})

test('the simulators pass when the runtime and both workshop simulators exist', () => {
  assert.equal(checkSimulators(), true)
  assert.match(text(), /iOS 27\.0 simulator runtime/)
  assert.match(text(), /Workshop simulators: Workshop_1_iPhone, Workshop_2_iPhone/)
})

test('the simulators fail without the runtime, with or without a known iOS version', () => {
  lib.hasRuntime.mock.mockImplementation(() => false)
  assert.equal(checkSimulators(), false)
  assert.match(text(), /iOS 27\.0 simulator runtime not installed/)

  output.length = 0
  lib.simulatorSdkVersion.mock.mockImplementation(() => null)
  assert.equal(checkSimulators(), false)
  assert.match(text(), /iOS simulator runtime not installed/)
})

test('the simulators fail and name the workshop simulators that are missing', () => {
  lib.listSimulators.mock.mockImplementation(() => ['Workshop_1_iPhone'])
  assert.equal(checkSimulators(), false)
  assert.match(text(), /missing: Workshop_2_iPhone/)
})
