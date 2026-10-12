import { configure, inspect, planIos, runPlan } from 'start-ios-simulator'
import { workshopTarget } from '../lib/ios.mjs'
import { appHint, appStep } from './app.mjs'
import { knownGlobalTool, toolStep } from './tool.mjs'
import { FLAGS, bold, header, info, startSpinner } from '../lib/ui.mjs'

/**
 * The iOS steps come from start-ios-simulator, the same ones it uses on its own. We aim them at the two workshop
 * simulators, name that step the way the workshop talks about it and add the demo app at the end.
 */
export async function planIosSteps(state) {
  state ??= await inspect()
  const steps = planIos(state, workshopTarget(state)).map((step) => (step.id === 'simulators' ? { ...step, title: '2 workshop simulators' } : step))
  return [...steps, appStep('ios'), await toolStep('start-ios-simulator', 'simulators')]
}

/** Tell people how to start the simulators once everything is in place. */
function printStartHint(names, hasTool) {
  console.log(`\n${bold('Start the simulators')}\n`)
  if (!hasTool) {
    info('Install the tool that this setup is built on, once:')
    info('  npm install -g start-ios-simulator')
  }
  info('Pick the simulators from a list (run it twice for two simulators):')
  info('  start-ios-simulator')
  info('Or go bare metal, one command per simulator:')
  names.forEach((name) => info(`  xcrun simctl boot ${name}`))
  info('Then open it: open -a Simulator (Xcode 26 and older) or Device Hub (Xcode 27)')
  info('Check that they are running with: xcrun simctl list devices | grep Booted')
  appHint()
}

export async function setupIos() {
  header('iOS')
  configure({ yes: FLAGS.yes, dryRun: FLAGS.dryRun })
  const stopSpinner = startSpinner('Checking your machine...')
  let state
  let steps
  try {
    state = await inspect()
    steps = await planIosSteps(state)
  } finally {
    stopSpinner()
  }
  const result = await runPlan('This is what we need for the workshop:', steps)
  if (result.ok) {
    // Only look at the machine again when a step changed it (a new runtime or simulator can change the names)
    const changed = result.applied.some((id) => !id.startsWith('app-') && !id.startsWith('tool-'))
    const names = workshopTarget(changed ? await inspect() : state).simulators.map((simulator) => simulator.name)
    printStartHint(names, knownGlobalTool('start-ios-simulator'))
  }
  return result.ok
}
