import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

const fetchVersions = mock.fn(async () => ({ versions: [{ api: '37.0' }], source: 'live' }))
const resolveVersion = mock.fn((requested, versions) => versions[0])
const namedTarget = mock.fn((version, avds) => ({ version, avds }))
mock.module('start-android-emulator', { namedExports: { fetchVersions, resolveVersion, namedTarget } })
const { API_LEVEL, AVD_DEVICE, AVD_NAMES, workshopTarget } = await import('../scripts/lib/android.mjs')

test('the workshop has two Pixel 10 emulators on Android 17', () => {
  assert.equal(API_LEVEL, '37.0')
  assert.deepEqual(AVD_NAMES, ['Workshop_1_Pixel_10_API_37_0', 'Workshop_2_Pixel_10_API_37_0'])
})

test('the Pixel 10 screen is made with the Pixel 9 profile and the Pixel 10 device frame', () => {
  assert.deepEqual(AVD_DEVICE, { profile: 'pixel_9', skin: 'pixel_10' })
})

test('the target is the pinned Android version with both emulators', async () => {
  const target = await workshopTarget()
  assert.equal(resolveVersion.mock.calls[0].arguments[0], '37.0')
  assert.deepEqual(target.version, { api: '37.0' })
  assert.deepEqual(target.avds, AVD_NAMES.map((name) => ({ name, device: AVD_DEVICE })))
})
