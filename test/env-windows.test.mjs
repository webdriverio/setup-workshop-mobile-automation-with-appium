import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

const execFileSync = mock.fn()
mock.module('node:child_process', { namedExports: { execFileSync } })
mock.module('../scripts/lib/shell.mjs', { namedExports: { IS_WIN: true } })
const { persistEnv } = await import('../scripts/lib/env.mjs')

test('on Windows the variables are saved as user environment variables through PowerShell', () => {
  const where = persistEnv({ vars: { ANDROID_HOME: 'C:\\Android\\Sdk' }, paths: ['C:\\Android\\Sdk\\platform-tools'] })

  assert.equal(where, 'your user environment variables')
  const [file, args] = execFileSync.mock.calls[0].arguments
  assert.equal(file, 'powershell')
  assert.deepEqual(args.slice(0, 2), ['-NoProfile', '-Command'])
  assert.match(args[2], /SetEnvironmentVariable\('ANDROID_HOME', 'C:\\Android\\Sdk', 'User'\)/)
  assert.match(args[2], /notlike '\*C:\\Android\\Sdk\\platform-tools\*'/, 'a PATH entry is only added when it is not there yet')
})
