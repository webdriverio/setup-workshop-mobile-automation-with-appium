import { AVD_NAMES, MIN_JAVA, androidEnvGaps, detectJava, detectSdkPath, javaMajor, platformToolsDirs } from '../lib/android.mjs'
import { applyToProcess } from '../lib/env.mjs'
import { run } from '../lib/shell.mjs'
import { fileExists } from '../lib/system.mjs'
import { fail, info, ok, warn } from '../lib/ui.mjs'

/** Read-only checks for Android. Fixing is the job of `npm run setup`, so every failure points there. */

const FIX = 'Run: npm run setup, then open a new terminal and re-run this check.'

export function checkJava() {
  const home = process.env.JAVA_HOME
  if (!androidEnvGaps().vars.includes('JAVA_HOME')) {
    ok(`JAVA_HOME = ${home} (Java ${javaMajor(home)})`)
    return true
  }

  const major = javaMajor(home)
  if (!home) fail('JAVA_HOME is not set')
  else if (major === null) fail(`JAVA_HOME is set to "${home}" but no java was found there`)
  else fail(`JAVA_HOME points to Java ${major}, Appium needs Java ${MIN_JAVA} or newer`)

  const found = detectJava()
  if (found) info(`Java ${found.major} is available at ${found.home}`)
  info(FIX)
  return false
}

export function checkAndroidSdk() {
  const sdk = detectSdkPath()
  const { vars, pathMissing } = androidEnvGaps()
  let passed = true

  const home = process.env.ANDROID_HOME
  if (vars.includes('ANDROID_HOME')) {
    fail(sdk ? `ANDROID_HOME is not set, but an Android SDK exists at ${sdk}` : 'ANDROID_HOME is not set and no Android SDK was found')
    info(FIX)
    passed = false
  } else if (!fileExists(home)) {
    fail(`ANDROID_HOME is set to "${home}" but that folder does not exist`)
    info(FIX)
    passed = false
  } else {
    ok(`ANDROID_HOME = ${home}`)
  }

  if (pathMissing) {
    fail('adb and the emulator are not in your PATH')
    info(FIX)
    passed = false
  }

  // Look further with the SDK we found, so the next checks tell the truth about the tools themselves
  if (!passed && sdk) applyToProcess({ vars: { ANDROID_HOME: sdk }, paths: platformToolsDirs(sdk) })

  const adb = run('adb --version')
  if (adb) {
    ok(`adb, ${adb.split('\n')[0]}`)
  } else {
    fail('adb not found')
    info(FIX)
    passed = false
  }
  return passed
}

export function checkEmulators() {
  const output = run('emulator -list-avds')
  if (output === null) {
    fail('emulator not found')
    info(FIX)
    return false
  }

  // Names never contain spaces, other lines are warnings of the emulator
  const avds = output.split('\n').map((line) => line.trim()).filter((line) => line && !/\s/.test(line))
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
