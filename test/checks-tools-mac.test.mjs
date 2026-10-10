import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'

const run = mock.fn(() => null)
const fileExists = mock.fn(() => false)
mock.module('../scripts/lib/system.mjs', { namedExports: { fileExists } })
mock.module('../scripts/lib/shell.mjs', { namedExports: { run, IS_MAC: true, IS_WIN: false } })
const { checkGit, checkVsCode } = await import('../scripts/checks/tools.mjs')

let output
beforeEach(() => {
  output = []
  mock.method(console, 'log', (line) => output.push(line))
})
afterEach(() => mock.restoreAll())

const text = () => output.join('\n')

test('a missing git on macOS points to the command line tools', () => {
  assert.equal(checkGit(), false)
  assert.match(text(), /xcode-select --install/)
})

test('without the code command, an installed VS Code gets the link command, else the download page', () => {
  fileExists.mock.mockImplementation(() => true)
  checkVsCode()
  assert.match(text(), /npm run setup/)

  output.length = 0
  fileExists.mock.mockImplementation(() => false)
  checkVsCode()
  assert.match(text(), /code\.visualstudio\.com/)
})
