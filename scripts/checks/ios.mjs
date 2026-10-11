import { fail, info, ok } from '../lib/ui.mjs'

/**
 * Read-only checks for iOS (macOS only), on what `inspect()` of start-ios-simulator found.
 * Fixing is the job of `npm run setup`.
 */

export function checkXcode({ xcode, xcodeApps, licenseReady }) {
  if (!xcode) {
    fail('Xcode not found')
    if (xcodeApps.length > 0) info(`Xcode is installed (${xcodeApps[0]}), but your terminal does not use it. Run: npm run setup`)
    else info('Install Xcode from the App Store and open it once. Details: docs/xcode-ios.md')
    return false
  }
  ok(`Xcode ${xcode.version}, ${xcode.path}`)

  if (!licenseReady) {
    fail('Xcode licence not accepted or its components are not installed')
    info('Run: npm run setup')
    return false
  }
  ok('Xcode licence accepted, components installed')
  return true
}

export function checkSimulators({ runtimes, simulators }, { version, simulators: wanted }) {
  if (!version || !runtimes.some((runtime) => runtime.version === version)) {
    fail(`iOS ${version ?? ''} simulator runtime not installed`.replace('  ', ' '))
    info('Run: npm run setup')
    return false
  }
  ok(`iOS ${version} simulator runtime`)

  const names = wanted.map((simulator) => simulator.name)
  const missing = names.filter((name) => !simulators.some((simulator) => simulator.name === name))
  if (missing.length === 0) {
    ok(`Workshop simulators: ${names.join(', ')}`)
    return true
  }
  fail(`Workshop simulator(s) missing: ${missing.join(', ')}`)
  info('Run: npm run setup')
  return false
}
