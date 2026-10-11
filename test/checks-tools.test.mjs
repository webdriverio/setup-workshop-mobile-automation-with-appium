import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'

const run = mock.fn()
const fileExists = mock.fn(() => false)
mock.module('../scripts/lib/system.mjs', { namedExports: { fileExists } })
mock.module('../scripts/lib/shell.mjs', { namedExports: { run, IS_MAC: false, IS_WIN: false } })
const { checkGit, checkNode, checkNpm, checkVsCode } = await import('../scripts/checks/tools.mjs')

let output
beforeEach(() => {
  output = []
  mock.method(console, 'log', (line) => output.push(line))
  run.mock.resetCalls()
  run.mock.mockImplementation((cmd) => `${cmd} output\nsecond line`)
  fileExists.mock.mockImplementation(() => false)
})
afterEach(() => mock.restoreAll())

const text = () => output.join('\n')

test('git passes when it prints a version', () => {
  assert.equal(checkGit(), true)
  assert.match(text(), /git --version output/)
})

test('a missing git explains the install on Linux', () => {
  run.mock.mockImplementation(() => null)
  assert.equal(checkGit(), false)
  assert.match(text(), /apt install git/)
})

test('node must be 24 or newer', () => {
  assert.equal(checkNode(), Number(process.versions.node.split('.')[0]) >= 24)
  assert.match(text(), new RegExp(process.version.replaceAll('.', '\\.')))
})

test('an old node is reported with the nvm commands', () => {
  const real = Object.getOwnPropertyDescriptor(process, 'versions')
  const version = Object.getOwnPropertyDescriptor(process, 'version')
  Object.defineProperty(process, 'versions', { value: { ...process.versions, node: '20.1.0' }, configurable: true })
  Object.defineProperty(process, 'version', { value: 'v20.1.0', configurable: true })
  try {
    assert.equal(checkNode(), false)
    assert.match(text(), /too old, need v24/)
    assert.match(text(), /nvm install 24/)
  } finally {
    Object.defineProperty(process, 'versions', real)
    Object.defineProperty(process, 'version', version)
  }
})

test('npm passes with a version and fails without', () => {
  assert.equal(checkNpm(), true)
  run.mock.mockImplementation(() => null)
  assert.equal(checkNpm(), false)
  assert.match(text(), /npm not found/)
})

test('VS Code passes with the code command and only warns without', () => {
  assert.equal(checkVsCode(), true)
  assert.match(text(), /Visual Studio Code code --version output/)

  output.length = 0
  run.mock.mockImplementation(() => null)
  assert.equal(checkVsCode(), true)
  assert.match(text(), /not available/)
})

test('without the code command, Linux is pointed to the install page', () => {
  run.mock.mockImplementation(() => null)
  checkVsCode()
  assert.match(text(), /code\.visualstudio\.com/)
})
