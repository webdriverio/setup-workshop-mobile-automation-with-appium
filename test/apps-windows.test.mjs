import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

const run = mock.fn()
mock.module('../scripts/lib/shell.mjs', { namedExports: { run, IS_WIN: true } })
mock.module('../scripts/lib/download.mjs', { namedExports: { download: mock.fn() } })
const { downloadsDir } = await import('../scripts/lib/apps.mjs')

test('on Windows the Downloads folder is asked from the system (it can be moved), with the usual place as fallback', () => {
  run.mock.mockImplementation(() => 'D:\\Moved\\Downloads')
  assert.equal(downloadsDir(), 'D:\\Moved\\Downloads')
  assert.match(run.mock.calls[0].arguments[0], /shell:Downloads/)
  run.mock.mockImplementation(() => '')
  assert.match(downloadsDir(), /Downloads$/)
})
