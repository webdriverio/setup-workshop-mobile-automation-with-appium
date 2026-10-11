import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'

const hasApp = mock.fn()
mock.module('../scripts/lib/apps.mjs', { namedExports: { hasApp, appPath: (platform) => `/downloads/${platform}-app` } })
const { checkApp } = await import('../scripts/checks/apps.mjs')

let output
beforeEach(() => {
  output = []
  mock.method(console, 'log', (line = '') => output.push(line))
})
afterEach(() => mock.restoreAll())

test('the app passes when it is there', () => {
  hasApp.mock.mockImplementation(() => true)
  assert.equal(checkApp('android'), true)
  assert.match(output.join('\n'), /Android demo app, \/downloads\/android-app/)
})

test('a missing app fails and points to the setup', () => {
  hasApp.mock.mockImplementation(() => false)
  assert.equal(checkApp('ios'), false)
  assert.match(output.join('\n'), /iOS demo app not found/)
  assert.match(output.join('\n'), /npm run setup/)
})
