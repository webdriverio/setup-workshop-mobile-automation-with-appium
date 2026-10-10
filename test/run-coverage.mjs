/**
 * Coverage check: every module must have 100% line and function coverage from its own tests.
 *
 * Why per module? Many tests replace a module with a mock (that is how we test without touching the machine), and coverage
 * tools get confused when a file is loaded for real in one test file and only mocked in another. Running each module with
 * only the tests that are meant to cover it avoids that. Entry scripts (setup.mjs, check-setup.mjs, install-hooks.mjs) are left out.
 *
 * Run with: npm run coverage
 */

import { spawnSync } from 'node:child_process'

const MODULES = [
  { module: 'scripts/lib/shell.mjs', tests: ['shell'] },
  { module: 'scripts/lib/ui.mjs', tests: ['ui'] },
  { module: 'scripts/lib/plan.mjs', tests: ['plan'] },
  { module: 'scripts/lib/download.mjs', tests: ['download'] },
  { module: 'scripts/lib/env.mjs', tests: ['env', 'env-windows'] },
  { module: 'scripts/lib/ios.mjs', tests: ['ios-lib'] },
  { module: 'scripts/lib/smoke.mjs', tests: ['smoke'] },
  { module: 'scripts/smoke/capabilities.mjs', tests: ['smoke'] },
  { module: 'scripts/lib/android.mjs', tests: ['android', 'android-windows'] },
  { module: 'scripts/steps/ios.mjs', tests: ['steps-ios'] },
  { module: 'scripts/steps/android.mjs', tests: ['steps-android'] },
  { module: 'scripts/wizard.mjs', tests: ['wizard', 'wizard-no-mac'] },
]

let failed = false
for (const { module, tests } of MODULES) {
  const { status, stdout, stderr } = spawnSync(
    'npx',
    [
      '--yes', 'c8@10', '--all', '--src=scripts', `--include=${module}`, '--check-coverage', '--lines=100', '--functions=100',
      '--reporter=text', 'node', '--experimental-test-module-mocks', '--test', ...tests.map((t) => `test/${t}.test.mjs`),
    ],
    { encoding: 'utf8', shell: process.platform === 'win32' },
  )
  const row = stdout.split('\n').find((line) => line.includes(module.split('/').at(-1)) && line.includes('|'))
  console.log(`${status === 0 ? '✔' : '✘'} ${module.padEnd(28)} ${row?.split('|').slice(1, 5).map((s) => s.trim()).join(' | ') ?? stderr.trim().split('\n').at(-1)}`)
  if (status !== 0) {
    failed = true
    console.log(stdout.split('\n').filter((l) => /not ok|✖|ERROR/.test(l)).join('\n'))
  }
}
process.exit(failed ? 1 : 0)
