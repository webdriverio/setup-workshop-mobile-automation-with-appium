import { adbBinary } from 'start-android-emulator'
import { AVD_NAMES } from '../lib/android.mjs'
import { run, runFile } from '../lib/shell.mjs'
import { fileExists } from '../lib/system.mjs'
import { fail, info, ok, warn } from '../lib/ui.mjs'

/**
 * Read-only checks for Android, on what `inspect()` of start-android-emulator found.
 * Fixing is the job of `npm run setup`, so every failure points there.
 */

const FIX = 'Run: npm run setup, then open a new terminal and re-run this check.'

export function checkJava({ env, java }) {
  const home = process.env.JAVA_HOME
  if (!env.vars.includes('JAVA_HOME')) {
    ok(`JAVA_HOME = ${home}${java?.home === home ? ` (Java ${java.major})` : ''}`)
    return true
  }

  if (!home) fail('JAVA_HOME is not set')
  else fail(`JAVA_HOME is set to "${home}" but there is no Java 17 or newer there, Appium needs it`)

  if (java) info(`Java ${java.major} is available at ${java.home}`)
  info(FIX)
  return false
}

export function checkAndroidSdk({ env, sdk, sdkFound }) {
  let passed = true

  const home = process.env.ANDROID_HOME
  if (env.vars.includes('ANDROID_HOME')) {
    fail(sdkFound ? `ANDROID_HOME is not set, but an Android SDK exists at ${sdk}` : 'ANDROID_HOME is not set and no Android SDK was found')
    info(FIX)
    passed = false
  } else if (!fileExists(home)) {
    fail(`ANDROID_HOME is set to "${home}" but that folder does not exist`)
    info(FIX)
    passed = false
  } else {
    ok(`ANDROID_HOME = ${home}`)
  }

  if (env.pathMissing) {
    fail('adb and the emulator are not in your PATH')
    info(FIX)
    passed = false
  }

  // Ask the adb in the SDK, so this tells the truth about the tool itself even when the PATH is not right yet
  const adb = adbBinary(sdk)
  const version = adb && runFile(adb, ['--version']).output.split('\n')[0]
  if (version) {
    ok(`adb, ${version}`)
  } else {
    fail('adb not found')
    info(FIX)
    passed = false
  }
  return passed
}

export function checkEmulators({ avds }) {
  const missing = AVD_NAMES.filter((name) => !avds.includes(name))
  if (missing.length === 0) {
    ok(`Workshop emulators: ${AVD_NAMES.join(', ')}`)
    return true
  }
  fail(`Workshop emulator(s) missing: ${missing.join(', ')}`)
  if (avds.length > 0) info(`Other emulators on this machine: ${avds.join(', ')}`)
  info('Run: npm run setup')
  return false
}

/** Emulators are far too slow without hardware acceleration. Only a warning: some setups work in a way we cannot see. */
export function checkAcceleration() {
  if (run('emulator -accel-check') !== null) {
    ok('Hardware acceleration for the emulator')
    return true
  }
  warn('The emulator reports that hardware acceleration is not available, emulators will be very slow')
  info('Windows: turn on Windows Hypervisor Platform. Linux: install KVM and add yourself to the kvm group. See the README, step 2.')
  info('Check it yourself with: emulator -accel-check')
  return true
}
