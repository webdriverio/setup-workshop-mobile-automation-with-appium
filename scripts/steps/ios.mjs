import {
  IPHONE_MODEL, acceptLicenseAndInstallComponents, createSimulator, detectXcode, downloadRuntime, firstLaunchDone, hasRuntime,
  licenseAccepted, listSimulators, registerDownloadedRuntime, simulatorNames, simulatorSdkVersion,
} from '../lib/ios.mjs'
import { dry, runPlan } from '../lib/plan.mjs'
import { FLAGS, bold, fail, header, info, ok, warn } from '../lib/ui.mjs'

/** Look at the machine and describe every iOS step. Nothing is changed here. */
export function planIos() {
  const xcode = detectXcode()
  const version = xcode && simulatorSdkVersion()
  const runtimeReady = Boolean(version) && hasRuntime(version)
  const names = version ? simulatorNames(version) : []
  const existing = xcode && runtimeReady ? listSimulators() : []
  const missingSims = names.filter((name) => !existing.includes(name))

  return [
    {
      title: 'Xcode',
      description: 'Apple\'s development tool, it contains the iOS Simulator (about 15 GB). It only comes from the App Store, so we cannot install it for you.',
      done: Boolean(xcode),
      detail: xcode && `Xcode ${xcode.version}`,
      apply: () => installXcodeStep(),
    },
    {
      title: 'Xcode licence and components',
      description: 'You accept Apple\'s licence and Xcode installs its helper tools. This asks for your Mac password.',
      done: Boolean(xcode) && licenseAccepted() && firstLaunchDone(),
      apply: () => licenseStep(xcode),
    },
    {
      title: `iOS ${version ?? ''} simulator runtime`.replace('  ', ' '),
      description: 'The iOS that runs inside the simulator (about 8 GB download).',
      done: runtimeReady,
      apply: () => runtimeStep(version),
    },
    {
      title: `${names.length || 2} workshop simulators`,
      description: `We need two simulators in the workshop: ${IPHONE_MODEL} on iOS ${version ?? 'of your Xcode'}. We create ${missingSims.join(' and ') || 'them'}.`,
      done: Boolean(version) && missingSims.length === 0,
      apply: () => createSimulatorsStep(version, missingSims),
    },
  ]
}

async function installXcodeStep() {
  fail('Xcode is not installed')
  info('Open the App Store, search for Xcode and click Get. Open Xcode once when it is done, then run this setup again.')
  info('Details: docs/xcode-ios.md')
  return false
}

async function licenseStep(xcode) {
  if (FLAGS.dryRun) {
    dry('would run: sudo xcodebuild -license accept, then sudo xcodebuild -runFirstLaunch')
    return true
  }
  if (!xcode) {
    warn('Install Xcode first.')
    return false
  }
  info('Your Mac password is asked next. Nothing is shown while you type, that is normal.')
  if (acceptLicenseAndInstallComponents()) {
    ok('Licence accepted, components installed')
    return true
  }
  fail('That did not work. Run these two commands yourself and then run this setup again:')
  info('  sudo xcodebuild -license accept')
  info('  sudo xcodebuild -runFirstLaunch')
  return false
}

async function runtimeStep(version) {
  if (FLAGS.dryRun) {
    dry('would run: xcodebuild -downloadPlatform iOS, and register the runtime if Xcode does not')
    return true
  }
  if (!version) {
    warn('Install Xcode first.')
    return false
  }
  if (!hasRuntime(version)) downloadRuntime()
  // Xcode 27 can download a runtime without registering it, see registerDownloadedRuntime
  if (hasRuntime(version) || registerDownloadedRuntime(version)) {
    ok(`iOS ${version} simulator runtime installed`)
    return true
  }
  fail(`The iOS ${version} runtime is not available. Check your internet connection and free disk space (8 GB), then run this setup again.`)
  info('If it keeps failing, open Xcode > Settings > Components and download iOS from there.')
  return false
}

async function createSimulatorsStep(version, missing) {
  if (FLAGS.dryRun) {
    dry(`would create ${missing.join(', ') || 'the simulators'}`)
    return true
  }
  if (!version || !hasRuntime(version)) {
    warn('Install the iOS simulator runtime first.')
    return false
  }
  let allCreated = true
  for (const name of missing) {
    const { output, exitCode } = createSimulator(name, version)
    if (exitCode === 0) {
      ok(`Created ${name}`)
    } else {
      fail(`Creating ${name} failed`)
      info(output)
      allCreated = false
    }
  }
  return allCreated
}

export async function setupIos() {
  header('iOS')
  info('Checking your machine...')
  return runPlan('iOS', planIos(), () => printSimulatorHint(simulatorNames(simulatorSdkVersion())))
}

/** Tell people how to start the simulators once everything is in place. */
function printSimulatorHint(names) {
  console.log(`\n${bold('Start the simulators')}\n`)
  info('Pick the simulators from a list:')
  info('  npx start-ios-simulator')
  info('Or start them directly, one per command:')
  names.forEach((name) => info(`  xcrun simctl boot ${name}`))
  info('  open -a Simulator')
  info('Check that they are running with: xcrun simctl list devices | grep Booted')
}
