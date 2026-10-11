import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

const namedTarget = mock.fn((state, version, names, device) => ({ version, simulators: names.map((name) => ({ name, device })) }))
mock.module('start-ios-simulator', { namedExports: { namedTarget } })
const { IPHONE_MODEL, SIMULATOR_NAMES, workshopTarget } = await import('../scripts/lib/ios.mjs')

test('the workshop has two iPhone 17 Pro simulators, named after the iOS version', () => {
  assert.equal(IPHONE_MODEL, 'iPhone 17 Pro')
  assert.deepEqual(SIMULATOR_NAMES, ['Workshop_1_iPhone_17_Pro_iOS_{ios}', 'Workshop_2_iPhone_17_Pro_iOS_{ios}'])
})

test('the target is both simulators on the iOS version of the installed Xcode', () => {
  const state = { sdkVersion: '27.0' }
  const target = workshopTarget(state)
  assert.deepEqual(namedTarget.mock.calls[0].arguments, [state, '27.0', SIMULATOR_NAMES, 'iPhone 17 Pro'])
  assert.equal(target.version, '27.0')
})
