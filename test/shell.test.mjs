import assert from 'node:assert/strict'
import { test } from 'node:test'
import { IS_MAC, IS_WIN, run, runFile, runFileAsync } from '../scripts/lib/shell.mjs'

const skipOnWindows = { skip: process.platform === 'win32' && 'uses sh' }

test('the platform flags follow the operating system', () => {
  assert.equal(IS_MAC, process.platform === 'darwin')
  assert.equal(IS_WIN, process.platform === 'win32')
})

test('run returns the trimmed output, or null when the command fails', () => {
  // a string, not a number: with FORCE_COLOR (set by the watch mode) node would colour a printed number
  assert.equal(run(`node -e "console.log('two')"`), 'two')
  assert.equal(run('node -e "process.exit(3)"'), null)
  assert.equal(run('definitely-not-a-command-xyz'), null)
})

test('runFile merges stdout and stderr and reports the exit code', skipOnWindows, () => {
  const { output, exitCode } = runFile(process.execPath, ['-e', 'console.log("out"); console.error("err"); process.exit(4)'])
  assert.equal(exitCode, 4)
  assert.match(output, /out/)
  assert.match(output, /err/)
})

test('runFile passes input to the program and uses the given environment', skipOnWindows, () => {
  const { output, exitCode } = runFile(
    process.execPath,
    ['-e', 'process.stdin.on("data", (d) => console.log(d.toString().trim() + process.env.WORKSHOP_VAR))'],
    { input: 'hello', env: { ...process.env, WORKSHOP_VAR: '!' } },
  )
  assert.equal(exitCode, 0)
  assert.equal(output, 'hello!')
})

test('runFile reports a failure (exit code 1) when the program does not exist', skipOnWindows, () => {
  assert.equal(runFile('/does/not/exist').exitCode, 1)
})

test('runFileAsync collects the output and exit code without blocking', skipOnWindows, async () => {
  let ticks = 0
  const timer = setInterval(() => ticks++, 10)
  const { output, exitCode } = await runFileAsync(process.execPath, ['-e', 'setTimeout(() => { console.log("out"); console.error("err"); process.exit(2) }, 120)'])
  clearInterval(timer)
  assert.equal(exitCode, 2)
  assert.match(output, /out/)
  assert.match(output, /err/)
  assert.ok(ticks > 3, 'the event loop kept running while the program ran')
})

test('runFileAsync reports a failure when the program does not exist or is stopped by the timeout', skipOnWindows, async () => {
  assert.equal((await runFileAsync('/does/not/exist')).exitCode, 1)
  assert.equal((await runFileAsync(process.execPath, ['-e', 'setTimeout(() => {}, 5000)'], { timeout: 100 })).exitCode, 1)
})
