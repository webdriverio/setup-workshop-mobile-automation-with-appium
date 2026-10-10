import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'

const confirm = mock.fn(async () => false)
mock.module('@inquirer/prompts', { namedExports: { confirm } })
const { FLAGS, ask, bold, fail, header, info, ok, todo, warn } = await import('../scripts/lib/ui.mjs')

let lines
beforeEach(() => {
  lines = []
  mock.method(console, 'log', (line) => lines.push(line))
  confirm.mock.resetCalls()
})
afterEach(() => {
  mock.restoreAll()
  FLAGS.yes = false
})

test('every message type prints its text', () => {
  for (const print of [ok, fail, warn, todo, info, header]) print('some message')
  assert.equal(lines.length, 6)
  assert.ok(lines.every((line) => line.includes('some message')))
})

test('bold wraps the text and keeps it readable', () => {
  assert.match(bold('Android'), /Android/)
  assert.notEqual(bold('Android'), 'Android')
})

test('with --yes (or no terminal) ask returns the default and does not prompt', async () => {
  FLAGS.yes = true
  assert.equal(await ask('Continue?'), true)
  assert.equal(await ask('Continue?', false), false)
  assert.equal(confirm.mock.callCount(), 0)
})

test('without --yes ask prompts and returns the answer', async () => {
  FLAGS.yes = false
  assert.equal(await ask('Continue?'), false)
  assert.deepEqual(confirm.mock.calls[0].arguments[0], { message: 'Continue?', default: true })
})
