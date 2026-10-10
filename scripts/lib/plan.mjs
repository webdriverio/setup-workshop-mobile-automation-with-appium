import { ask, bold, header, info, ok, todo, warn } from './ui.mjs'

export const dry = (message) => info(`[dry run] ${message}`)

/**
 * Explain what we are going to do, ask once, then do it. Returns true when the platform is ready.
 * `onReady(missing)` prints the closing hint, `missing` are the steps that were just done.
 */
export async function runPlan(name, steps, onReady) {
  const missing = steps.filter((step) => !step.done)

  console.log('\nThis is what we need for the workshop:\n')
  for (const step of steps) {
    if (step.done) ok(`${bold(step.title)}, already done`)
    else todo(`${bold(step.title)}, missing`)
    info(step.description)
  }

  if (missing.length === 0) {
    console.log(`\nEverything for ${name} is already set up.`)
    onReady([])
    return true
  }

  console.log()
  if (!(await ask(`Set up the ${missing.length} missing item(s) now?`))) {
    warn('Nothing installed. You are back at the start.')
    return false
  }

  console.log()
  for (const step of missing) {
    header(step.title)
    if (!(await step.apply())) {
      console.log(`\nStopped, because this step failed. Fix the problem above and run the ${name} setup again.`)
      return false
    }
  }
  console.log(`\n${name} is ready.`)
  onReady(missing)
  return true
}
