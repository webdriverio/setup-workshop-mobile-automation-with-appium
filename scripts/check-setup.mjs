#!/usr/bin/env node

/**
 * Workshop environment check. It only looks, it never changes your machine: what is missing is fixed by `npm run setup`.
 *
 * Run with:  npm run check
 *            npm run check -- --android   (only Android)
 *            npm run check -- --ios       (only iOS, macOS only)
 *            npm run check -- --report    (always save the report, also when everything passes)
 */

import { fileURLToPath } from 'node:url'
import { checkApp } from './checks/apps.mjs'
import { checkAcceleration, checkAndroidSdk, checkEmulators, checkJava } from './checks/android.mjs'
import { checkXcode, checkSimulators } from './checks/ios.mjs'
import { checkDisk, checkMemory, checkNetwork } from './checks/machine.mjs'
import { checkSessions } from './checks/session.mjs'
import { checkGit, checkNode, checkNpm, checkVsCode } from './checks/tools.mjs'
import { printTeamMessage } from './lib/banner.mjs'
import { relaunchWithProxy } from './lib/network.mjs'
import { failedItems, writeReport } from './lib/report.mjs'
import { IS_MAC } from './lib/shell.mjs'
import { ensureAndroidDevice, ensureIosDevice } from './lib/smoke.mjs'
import { bold, fail, header, info, say, warn } from './lib/ui.mjs'

// Behind a company proxy the checks that reach the internet need to go through it
const proxyExitCode = relaunchWithProxy()
if (proxyExitCode !== null) process.exit(proxyExitCode)

const only = ['--android', '--ios'].find((flag) => process.argv.includes(flag))
const android = only !== '--ios'
const ios = only !== '--android' && IS_MAC

if (only === '--ios' && !IS_MAC) {
  fail('iOS testing requires macOS + Xcode.')
  process.exit(1)
}

const REPORT_FILE = fileURLToPath(new URL('../workshop-check-report.txt', import.meta.url))
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

header('Your computer')
await check('disk space', checkDisk)
await check('memory', checkMemory)
await check('network', () => checkNetwork([...(android ? ['android'] : []), ...(ios ? ['ios'] : [])]))

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
  await check('acceleration', checkAcceleration)
  await check('Android demo app', () => checkApp('android'))
}

if (ios) {
  header('iOS')
  await check('Xcode', checkXcode)
  await check('iOS simulators', checkSimulators)
  await check('iOS demo app', () => checkApp('ios'))
} else if (!only) {
  header('iOS')
  info('iOS testing requires macOS + Xcode. Skipped on this platform.')
}

header('WebdriverIO session')
if (hasErrors) {
  warn('Skipped, fix the items marked with ✘ above first.')
} else {
  // Both platforms at the same time, each with its own live line
  const sessions = [
    ...(android ? [{ name: 'Android', ensureDevice: ensureAndroidDevice }] : []),
    ...(ios ? [{ name: 'iOS', ensureDevice: ensureIosDevice }] : []),
  ]
  await check('WebdriverIO session', () => checkSessions(sessions))
}

say('\n' + '─'.repeat(50))

if (hasErrors) {
  say(`\n${bold('Setup incomplete.')} These items need your attention:\n`)
  failedItems().forEach((item) => say(`  ✘  ${item}`))
  say(`\nMost of them are fixed by: ${bold('npm run setup')}`)
  say('Check the docs/ folder for step-by-step instructions.')
}

if (hasErrors || process.argv.includes('--report')) {
  await writeReport(REPORT_FILE)
  say(`\nA report with all the details was saved to:\n  ${REPORT_FILE}`)
  if (hasErrors) say('Cannot fix it? Send this file to the trainer, the address will be shared by the conference.\n')
}

if (hasErrors) process.exit(1)

say(`\n${bold('All checks passed!')} Your machine is ready for the workshop.`)
say('The workshop project has its own Appium setup that we will use on the day.\n')
printTeamMessage()
