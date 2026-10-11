import { configure, inspect, planAndroid, runPlan } from 'start-android-emulator'
import { AVD_NAMES, PIXEL_MODEL, workshopTarget } from '../lib/android.mjs'
import { appHint, appStep } from './app.mjs'
import { FLAGS, bold, header, info } from '../lib/ui.mjs'

/** The wording of the module, changed to how the workshop talks about it. People need to know how much disk space they need, not the size of a download. */
function workshopWording(step) {
  if (step.id === 'avds') {
    return { ...step, title: '2 workshop emulators', description: `${step.description} They are a Pixel ${PIXEL_MODEL} with the device frame.` }
  }
  if (step.id === 'packages') {
    return { ...step, description: step.description.replace(/\(about [^)]*\)/, '(about 6 GB of disk space once installed)') }
  }
  return step
}

/**
 * The Android steps come from start-android-emulator, the same ones it uses on its own. We aim them at the two workshop
 * emulators, name that step the way the workshop talks about it and add the demo app before the environment variables.
 */
export async function planAndroidSteps() {
  const steps = planAndroid(await inspect(), await workshopTarget()).map(workshopWording)
  const env = steps.findIndex((step) => step.id === 'env')
  steps.splice(env, 0, appStep('android'))
  return steps
}

/** Tell people how to start the emulators once everything is in place. */
function printStartHint(newTerminal) {
  console.log(`\n${bold('Start the emulators')}${newTerminal ? ' (in a new terminal, so the new settings apply)' : ''}\n`)
  info('Install the tool that this setup is built on, once:')
  info('  npm install -g start-android-emulator')
  info('Then pick the emulators from a list (run it twice for two emulators):')
  info('  start-android-emulator')
  info('Or go bare metal, one emulator per terminal:')
  AVD_NAMES.forEach((name) => info(`  emulator -avd ${name}`))
  info('Check that they are running with: adb devices')
  appHint()
}

export async function setupAndroid() {
  header('Android')
  info('Checking your machine...')
  configure({ yes: FLAGS.yes, dryRun: FLAGS.dryRun })
  const result = await runPlan('This is what we need for the workshop:', await planAndroidSteps())
  if (result.ok) printStartHint(result.applied.includes('env'))
  return result.ok
}
