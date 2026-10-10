#!/usr/bin/env node

/**
 * Workshop environment check. It only looks, it never changes your machine: what is missing is fixed by `npm run setup`.
 *
 * Run with:  npm run check
 *            npm run check -- --android   (only Android)
 *            npm run check -- --ios       (only iOS, macOS only)
 */

import { checkAndroidSdk, checkEmulators, checkJava } from './checks/android.mjs'
import { checkXcode, checkSimulators } from './checks/ios.mjs'
import { checkSessions } from './checks/session.mjs'
import { checkGit, checkNode, checkNpm, checkVsCode } from './checks/tools.mjs'
import { ensureAndroidDevice, ensureIosDevice } from './lib/smoke.mjs'
import { IS_MAC } from './lib/shell.mjs'
import { printTeamMessage } from './lib/banner.mjs'
import { bold, fail, header, info, warn } from './lib/ui.mjs'

const only = ['--android', '--ios'].find((flag) => process.argv.includes(flag))
const android = only !== '--ios'
const ios = only !== '--android'

if (only === '--ios' && !IS_MAC) {
  fail('iOS testing requires macOS + Xcode.')
  process.exit(1)
}

let hasErrors = false

/** Run one check. A check that returns false, or crashes, makes the whole run fail. */
async function check(label, fn) {
  try {
    if ((await fn()) === false) hasErrors = true
  } catch (e) {
    fail(`${label}: unexpected error, ${e.message}`)
    hasErrors = true
  }
}

header('Tools')
await check('git', checkGit)
await check('Node.js', checkNode)
await check('npm', checkNpm)
await check('Visual Studio Code', checkVsCode)

if (android) {
  header('Java')
  await check('Java', checkJava)
  header('Android')
  await check('Android SDK', checkAndroidSdk)
  await check('Android emulators', checkEmulators)
}

if (ios) {
  header('iOS')
  if (IS_MAC) {
    await check('Xcode', checkXcode)
    await check('iOS simulators', checkSimulators)
  } else {
    info('iOS testing requires macOS + Xcode. Skipped on this platform.')
  }
}

header('WebdriverIO session')
if (hasErrors) {
  warn('Skipped, fix the items marked with ✘ above first.')
} else {
  // Both platforms at the same time, each with its own live line
  const sessions = [
    ...(android ? [{ name: 'Android', ensureDevice: ensureAndroidDevice }] : []),
    ...(ios && IS_MAC ? [{ name: 'iOS', ensureDevice: ensureIosDevice }] : []),
  ]
  await check('WebdriverIO session', () => checkSessions(sessions))
}

console.log('\n' + '─'.repeat(50))

if (hasErrors) {
  console.log(`\n${bold('Setup incomplete.')} Fix the items marked with ✘ above, most of them with: ${bold('npm run setup')}`)
  console.log('Check the docs/ folder for step-by-step instructions.')
  console.log('Still stuck? Reach out before the workshop so we can help.\n')
  process.exit(1)
}
console.log(`\n${bold('All checks passed!')} Your machine is ready for the workshop.`)
console.log('The workshop project has its own Appium setup that we will use on the day.\n')
printTeamMessage()
