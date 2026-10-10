import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createProgress } from '../scripts/lib/progress.mjs'

const fakeStream = () => {
  const chunks = []
  return { chunks, write: (text) => chunks.push(text), text: () => chunks.join('') }
}
const strip = (text) => text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')

test('in a terminal every task keeps one line that is rewritten in place', () => {
  const stream = fakeStream()
  const progress = createProgress(['Android', 'iOS'], { stream, interactive: true })
  progress.update('Android', 'Starting the emulator...')
  progress.done('iOS', true, 'Passed')
  progress.done('Android', false, 'Failed')
  progress.stop()
  const text = stream.text()
  assert.ok(text.includes('\x1b[2A'), 'moves the cursor back up over the two lines')
  assert.ok(text.includes('\x1b[2K'), 'clears a line before it is rewritten')
  const last = strip(text).split('\n').filter(Boolean).slice(-2)
  assert.deepEqual(last.map((l) => l.trim().replace(/^\S+\s+/, '')), ['[Android] Failed', '[iOS] Passed'])
  assert.match(last[0], /✘/)
  assert.match(last[1], /✔/)
})

test('the spinner moves on its own', async () => {
  const stream = fakeStream()
  const progress = createProgress(['Android'], { stream, interactive: true, interval: 5 })
  await new Promise((resolve) => setTimeout(resolve, 60))
  progress.stop()
  const frames = new Set(strip(stream.text()).match(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/g))
  assert.ok(frames.size > 1)
})

test('without a terminal a line is printed only when its text changes', () => {
  const stream = fakeStream()
  const progress = createProgress(['Android'], { stream, interactive: false })
  progress.update('Android', 'Starting')
  progress.update('Android', 'Starting')
  progress.done('Android', true, 'Passed')
  progress.stop()
  assert.equal(stream.text(), '  …  [Android] Starting\n  ✔  [Android] Passed\n')
})

test('the terminal is detected from the stream by default', () => {
  const stream = { ...fakeStream(), isTTY: false }
  createProgress(['Android'], { stream }).update('Android', 'Hi')
  assert.equal(stream.text(), '  …  [Android] Hi\n')
})

test('a line that is wider than the terminal is cut off, so it never wraps', () => {
  const stream = { ...fakeStream(), columns: 30 }
  const progress = createProgress(['Android'], { stream, interactive: true })
  progress.update('Android', 'A very long message that does not fit on one line')
  progress.stop()
  const lastLine = strip(stream.chunks.at(-1)).replace(/[\r\n]/g, '')
  assert.ok(lastLine.length <= 30)
  assert.match(lastLine, /…$/)
})
