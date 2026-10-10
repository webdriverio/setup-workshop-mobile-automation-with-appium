import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import { afterEach, beforeEach, mock, test } from 'node:test'

const run = mock.fn(() => null)
const existsSync = mock.fn(() => false)
mock.module('node:fs', { namedExports: { ...fs, existsSync } })
mock.module('../scripts/lib/shell.mjs', { namedExports: { run, IS_MAC: false, IS_WIN: true } })
const { checkGit, checkVsCode } = await import('../scripts/checks/tools.mjs')

let output
beforeEach(() => {
  output = []
  mock.method(console, 'log', (line) => output.push(line))
})
afterEach(() => mock.restoreAll())

const text = () => output.join('\n')

test('a missing git on Windows points to the installer', () => {
  assert.equal(checkGit(), false)
  assert.match(text(), /git-scm\.com/)
})

test('without the code command, Windows is told to add VS Code to the PATH', () => {
  checkVsCode()
  assert.match(text(), /Add to PATH/)
})
