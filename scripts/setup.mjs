#!/usr/bin/env node

/**
 * Workshop environment setup wizard
 *
 * Run with:  npm run setup
 * Flags:     --yes       accept every default answer (also used when there is no terminal)
 *            --dry-run   show what would change without changing anything
 */

import { relaunchWithProxy } from 'start-android-emulator'
import { runWizard } from './wizard.mjs'

// Behind a company proxy the downloads need to go through it
const proxyExitCode = relaunchWithProxy()
if (proxyExitCode !== null) process.exit(proxyExitCode)

runWizard()
  .then((code) => process.exit(code))
  .catch((e) => {
    if (e?.name === 'ExitPromptError') {
      console.log('\nSetup cancelled. Run it again any time, it continues where it left off.')
      process.exit(130)
    }
    throw e
  })
