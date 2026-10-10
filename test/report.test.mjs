import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, beforeEach, test } from 'node:test'
import { failedItems, record, recordFailure, recordLog, reportText, resetReport, stripAnsi, writeReport } from '../scripts/lib/report.mjs'

const dir = mkdtempSync(join(tmpdir(), 'workshop-report-'))
after(() => rmSync(dir, { recursive: true, force: true }))
beforeEach(resetReport)

test('colours are removed from what is kept', () => {
  assert.equal(stripAnsi('\x1b[32m✔\x1b[0m  done'), '✔  done')
})

test('the report has the system, the output of the check and the extra logs', () => {
  record('\x1b[32m✔\x1b[0m  node v24')
  record()
  recordLog('Android log', ['line one', '\x1b[2mline two\x1b[0m'])
  const text = reportText(new Date('2026-10-10T12:00:00Z'))
  assert.match(text, /^Workshop check report, 2026-10-10T12:00:00\.000Z/)
  assert.match(text, /No passwords or tokens/)
  assert.match(text, /System: .+/)
  assert.match(text, new RegExp(`Node\\.js: ${process.version.replaceAll('.', '\\.')}`))
  assert.match(text, /--- Output of the check ---\n✔  node v24\n\n\n--- Android log ---\nline one\nline two/)
})

test('multi line output is kept line by line', () => {
  record('first\nsecond')
  assert.match(reportText(), /first\nsecond/)
})

test('the environment is shown, or marked as not set', () => {
  const saved = { ...process.env }
  delete process.env.JAVA_HOME
  delete process.env.ANDROID_HOME
  delete process.env.SHELL
  delete process.env.ComSpec
  try {
    assert.match(reportText(), /JAVA_HOME: \(not set\)\nANDROID_HOME: \(not set\)\nShell: \(unknown\)/)
    process.env.JAVA_HOME = '/jdk'
    process.env.ComSpec = 'cmd.exe'
    assert.match(reportText(), /JAVA_HOME: \/jdk/)
    assert.match(reportText(), /Shell: cmd\.exe/)
    process.env.SHELL = '/bin/zsh'
    assert.match(reportText(), /Shell: \/bin\/zsh/)
  } finally {
    for (const key of ['JAVA_HOME', 'ANDROID_HOME', 'SHELL', 'ComSpec']) saved[key] === undefined ? delete process.env[key] : (process.env[key] = saved[key])
  }
})

test('failed items are kept without colours, as a copy', () => {
  recordFailure('\x1b[31mAndroid\x1b[0m: no emulator')
  const items = failedItems()
  assert.deepEqual(items, ['Android: no emulator'])
  items.push('changed')
  assert.deepEqual(failedItems(), ['Android: no emulator'])
})

test('the report is written to the given file', async () => {
  record('hello')
  const file = await writeReport(join(dir, 'report.txt'), new Date(0))
  assert.equal(file, join(dir, 'report.txt'))
  assert.match(readFileSync(file, 'utf8'), /1970-01-01.*[\s\S]*hello/)
})
