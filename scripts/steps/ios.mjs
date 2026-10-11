import { configure, inspect, planIos, runPlan } from 'start-ios-simulator'
import { workshopTarget } from '../lib/ios.mjs'
import { appHint, appStep } from './app.mjs'
import { FLAGS, bold, header, info } from '../lib/ui.mjs'

/**
 * The iOS steps come from start-ios-simulator, the same ones it uses on its own. We aim them at the two workshop
 * simulators, name that step the way the workshop talks about it and add the demo app at the end.
 */
export async function planIosSteps() {
  const state = await inspect()
  const steps = planIos(state, workshopTarget(state)).map((step) => (step.id === 'simulators' ? { ...step, title: '2 workshop simulators' } : step))
  return [...steps, appStep('ios')]
}

/** Tell people how to start the simulators once everything is in place. */
function printStartHint(names) {
  console.log(`\n${bold('Start the simulators')}\n`)
  info('Install the tool that this setup is built on, once:')
  info('  npm install -g start-ios-simulator')
  info('Then pick the simulators from a list (run it twice for two simulators):')
  info('  start-ios-simulator')
  info('Or go bare metal, one command per simulator:')
  names.forEach((name) => info(`  xcrun simctl boot ${name}`))
  info('Then open it: open -a Simulator (Xcode 26 and older) or Device Hub (Xcode 27)')
  info('Check that they are running with: xcrun simctl list devices | grep Booted')
  appHint()
}

export async function setupIos() {
  header('iOS')
  info('Checking your machine...')
  configure({ yes: FLAGS.yes, dryRun: FLAGS.dryRun })
  const result = await runPlan('This is what we need for the workshop:', await planIosSteps())
  if (result.ok) printStartHint(workshopTarget(await inspect()).simulators.map((simulator) => simulator.name))
  return result.ok
}
