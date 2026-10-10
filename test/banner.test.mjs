import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'
import { printBanner, printTeamMessage } from '../scripts/lib/banner.mjs'

let output
beforeEach(() => {
  output = []
  mock.method(console, 'log', (line = '') => output.push(line))
})
afterEach(() => mock.restoreAll())

test('the banner shows the robot, the name and the title', () => {
  printBanner('Workshop setup')
  assert.ok(output.some((line) => line.includes('WebdriverIO')))
  assert.ok(output.join('\n').split('\n').length > 15, 'the robot is shown')
  assert.ok(output.some((line) => line.includes('Workshop setup')))
})

test('the team message wishes a great workshop and is signed by the WebdriverIO team', () => {
  printTeamMessage()
  const text = output.join('\n')
  assert.match(text, /Everything is ready/)
  assert.match(text, /great workshop/)
  assert.match(text, /WebdriverIO.*team/s)
})
