import assert from 'node:assert/strict'
import { totalmem } from 'node:os'
import { test } from 'node:test'
import { fileExists, freeDiskBytes, totalMemoryBytes } from '../scripts/lib/system.mjs'

test('fileExists tells whether a path is there', () => {
  assert.equal(fileExists(process.execPath), true)
  assert.equal(fileExists('/this/does/not/exist'), false)
})

test('the free disk space of the home folder is a number of bytes', async () => {
  const free = await freeDiskBytes()
  assert.ok(Number.isFinite(free) && free > 0)
})

test('the total memory is what the operating system reports', () => {
  assert.equal(totalMemoryBytes(), totalmem())
})
