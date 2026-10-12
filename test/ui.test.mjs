import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'

const confirm = mock.fn(async () => false)
mock.module('@inquirer/prompts', { namedExports: { confirm } })
const { FLAGS, ask, bold, dim, green, red, yellow, fail, header, info, ok, todo, warn } = await import('../scripts/lib/ui.mjs')

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

test('the colour helpers wrap the text and keep it readable', () => {
  for (const paint of [green, red, yellow, dim]) {
    assert.match(paint('text'), /text/)
    assert.notEqual(paint('text'), 'text')
  }
})

test('the spinner draws a line in a terminal and takes it away again', async () => {
  const { startSpinner } = await import('../scripts/lib/ui.mjs')
  const written = []
  const stop = startSpinner('Checking...', { isTTY: true, write: (text) => written.push(text) })
  assert.match(written[0], /Checking\.\.\. 0s/)
  stop()
  assert.equal(written.at(-1), '\r\x1b[2K')
})

test('the spinner prints nothing without a terminal', async () => {
  const { startSpinner } = await import('../scripts/lib/ui.mjs')
  const written = []
  startSpinner('Checking...', { isTTY: false, write: (text) => written.push(text) })()
  assert.deepEqual(written, [])
})
