import {
  ANDROID_VERSION, AVD_NAMES, MIN_JAVA, PIXEL_MODEL, REQUIRED_PACKAGES, acceptLicenses, createAvd, defaultSdkPath,
  androidEnvGaps, detectJava, detectSdkPath, hasSkin, installCmdlineTools, installJdk, installPackages, installSkin,
  javaMajor, listAvds, listInstalledPackages, platformToolsDirs, sdkTool,
} from '../lib/android.mjs'
import { applyToProcess, persistEnv } from '../lib/env.mjs'
import { dry, runPlan } from '../lib/plan.mjs'
import { appHint, appStep } from './app.mjs'
import { FLAGS, bold, fail, header, info, ok, warn } from '../lib/ui.mjs'

/**
 * Look at the machine and describe every Android step: what it is, whether it is already done,
 * and how to do it. Nothing is changed here.
 */
export function planAndroid() {
  const sdk = detectSdkPath() ?? defaultSdkPath()
  const ctx = { sdk, java: detectJava(), toolsReady: Boolean(sdkTool(sdk, 'sdkmanager')) }

  const canInspect = ctx.java && ctx.toolsReady
  const installed = canInspect ? listInstalledPackages(sdk, ctx.java.home) : null
  const missingPackages = REQUIRED_PACKAGES.filter((p) => !installed?.has(p))
  const avds = canInspect ? listAvds(sdk, ctx.java.home) ?? [] : []
  const missingAvds = AVD_NAMES.filter((name) => !avds.includes(name))

  const { vars: envVars, pathMissing } = androidEnvGaps()

  return [
    {
      title: `Java ${MIN_JAVA}+`,
      description: 'Needed by the Android tools and by Appium. If you have no Java, we download Java 21 (about 200 MB) and leave your system untouched.',
      done: Boolean(ctx.java),
      detail: ctx.java && `Java ${ctx.java.major}, ${ctx.java.home}`,
      apply: () => installJavaStep(ctx),
    },
    {
      title: 'Android command-line tools',
      description: 'The tools that install the rest of the Android SDK and create emulators (about 170 MB).',
      done: ctx.toolsReady,
      detail: ctx.toolsReady && sdk,
      apply: () => installToolsStep(ctx),
    },
    {
      title: `Android SDK packages`,
      description: `Android ${ANDROID_VERSION}, the emulator, adb and a system image (about 6 GB on disk).`,
      done: missingPackages.length === 0,
      detail: 'all installed',
      apply: () => installPackagesStep(ctx, missingPackages),
    },
    {
      title: '2 workshop emulators',
      description: `We need two emulators in the workshop: Pixel ${PIXEL_MODEL} on Android ${ANDROID_VERSION}, with the device frame. We create ${missingAvds.join(' and ') || AVD_NAMES.join(' and ')}.`,
      done: missingAvds.length === 0,
      detail: AVD_NAMES.join(', '),
      apply: () => createAvdsStep(ctx, missingAvds),
    },
    appStep('android'),
    {
      id: 'env',
      title: 'Environment variables',
      description: 'ANDROID_HOME, JAVA_HOME and PATH, so Appium and adb can find everything. Saved for new terminals.',
      done: envVars.length === 0 && !pathMissing,
      detail: 'ANDROID_HOME, JAVA_HOME and PATH are set',
      apply: () => envStep(ctx, envVars, pathMissing),
    },
  ]
}

async function installJavaStep(ctx) {
  if (FLAGS.dryRun) {
    dry('would download Java 21 to ~/.jdks/temurin-21')
    ctx.java = { home: '<downloaded java>', major: 21, source: 'dry run' }
    return true
  }
  try {
    const home = await installJdk()
    ctx.java = { home, major: javaMajor(home), source: 'downloaded by setup' }
    ok(`Java ${ctx.java.major}, ${home}`)
    return true
  } catch (e) {
    fail(`Downloading Java failed: ${e.message}`)
    info('You can also install a JDK 17+ yourself from https://adoptium.net and run this setup again.')
    return false
  }
}

async function installToolsStep(ctx) {
  if (FLAGS.dryRun) {
    dry(`would download the Android command-line tools to ${ctx.sdk}`)
    return true
  }
  try {
    await installCmdlineTools(ctx.sdk)
    ctx.toolsReady = true
    ok('Android command-line tools installed')
    return true
  } catch (e) {
    fail(`Downloading the Android command-line tools failed: ${e.message}`)
    return false
  }
}

async function installPackagesStep(ctx, missing) {
  if (FLAGS.dryRun) {
    dry(`would accept the licenses and install: ${missing.join(', ')}`)
    return true
  }
  if (missing.length === 0 || (acceptLicenses(ctx.sdk, ctx.java.home) && installPackages(ctx.sdk, ctx.java.home, missing))) {
    ctx.packagesReady = true
    ok('SDK packages installed')
    return true
  }
  fail('Installing the SDK packages failed, see the output above')
  return false
}

async function createAvdsStep(ctx, missing) {
  if (FLAGS.dryRun) {
    dry(`would download the Pixel ${PIXEL_MODEL} skin and create ${missing.join(', ')}`)
    return true
  }
  if (!hasSkin(ctx.sdk)) {
    try {
      await installSkin(ctx.sdk)
    } catch (e) {
      warn(`Could not download the emulator skin (${e.message}). The emulators are created without a device frame.`)
    }
  }
  let allCreated = true
  for (const name of missing) {
    const { output, exitCode } = createAvd(ctx.sdk, ctx.java.home, name)
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

async function envStep(ctx, vars, pathMissing) {
  const values = {}
  if (vars.includes('ANDROID_HOME')) values.ANDROID_HOME = ctx.sdk
  if (vars.includes('JAVA_HOME')) values.JAVA_HOME = ctx.java.home
  const paths = pathMissing ? platformToolsDirs(ctx.sdk) : []

  if (FLAGS.dryRun) {
    dry(`would set ${JSON.stringify(values)} and add ${paths.join(', ') || 'nothing'} to PATH`)
    return true
  }
  try {
    const where = persistEnv({ vars: values, paths })
    applyToProcess({ vars: values, paths })
    ok(`Saved to ${where}`)
    warn('Open a new terminal for this to take effect.')
    return true
  } catch (e) {
    fail(`Could not save the environment variables: ${e.message}`)
    return false
  }
}

/** Tell people how to start the emulators once everything is in place. */
function printStartHint(newTerminal) {
  console.log(`\n${bold('Start the emulators')}${newTerminal ? ' (in a new terminal, so the new settings apply)' : ''}\n`)
  info('Pick the emulators from a list:')
  info('  npx start-android-emulator')
  info('Or start them directly, one per terminal:')
  AVD_NAMES.forEach((name) => info(`  emulator -avd ${name}`))
  info('Check that they are running with: adb devices')
  appHint()
}

export async function setupAndroid() {
  header('Android')
  info('Checking your machine...')
  return runPlan('Android', planAndroid(), (done) => printStartHint(done.some((step) => step.id === 'env')))
}
