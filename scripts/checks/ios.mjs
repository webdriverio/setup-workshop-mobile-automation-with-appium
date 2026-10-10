import { detectXcode, firstLaunchDone, hasRuntime, licenseAccepted, listSimulators, simulatorNames, simulatorSdkVersion } from '../lib/ios.mjs'
import { fail, info, ok } from '../lib/ui.mjs'

/** Read-only checks for iOS (macOS only). Fixing is the job of `npm run setup`. */

export function checkXcode() {
  const xcode = detectXcode()
  if (!xcode) {
    fail('Xcode not found')
    info('Install Xcode from the App Store and open it once. Details: docs/xcode-ios.md')
    return false
  }
  ok(`Xcode ${xcode.version}, ${xcode.path}`)

  if (!licenseAccepted() || !firstLaunchDone()) {
    fail('Xcode licence not accepted or its components are not installed')
    info('Run: npm run setup')
    return false
  }
  ok('Xcode licence accepted, components installed')
  return true
}

export function checkSimulators() {
  const version = simulatorSdkVersion()
  if (!version || !hasRuntime(version)) {
    fail(`iOS ${version ?? ''} simulator runtime not installed`.replace('  ', ' '))
    info('Run: npm run setup')
    return false
  }
  ok(`iOS ${version} simulator runtime`)

  const existing = listSimulators()
  const missing = simulatorNames(version).filter((name) => !existing.includes(name))
  if (missing.length === 0) {
    ok(`Workshop simulators: ${simulatorNames(version).join(', ')}`)
    return true
  }
  fail(`Workshop simulator(s) missing: ${missing.join(', ')}`)
  info('Run: npm run setup')
  return false
}
