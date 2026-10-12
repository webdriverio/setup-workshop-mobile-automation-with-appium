#!/usr/bin/env node

/**
 * Start the two emulators and the two simulators of the workshop, and wait until they are ready to use.
 * A device that is already running is left alone, so it is safe to run this as often as you like.
 *
 * Run with:  npm run start:devices   (Android, and iOS on a Mac)
 *            npm run start:android   (only the two emulators)
 *            npm run start:ios       (only the two simulators, macOS only)
 */

import { fileURLToPath } from 'node:url'
import { startEmulator, startSimulator, workshopEmulators, workshopSimulators, LAUNCH_GAP } from './lib/devices.mjs'
import { createProgress } from './lib/progress.mjs'
import { IS_MAC } from './lib/shell.mjs'
import { bold, fail, info, say, warn } from './lib/ui.mjs'
import { workshopLines } from './lib/workshop.mjs'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** How long each line of the workshop text stays alone on the screen, and how fast the rest follows when the devices are ready. */
export const LINE_PAUSE = 2500
export const LINE_PAUSE_WHEN_READY = 500

/** Which platforms to start, from the arguments. iOS only exists on a Mac. */
export function platformsToStart(args, isMac = IS_MAC) {
  const only = args.find((arg) => arg === 'android' || arg === 'ios')
  return { android: only !== 'ios', ios: isMac && only !== 'android', requestedIosOnWrongOs: only === 'ios' && !isMac }
}

/** The jobs to run, one per device, with the label of the line that shows its progress. */
export async function planDevices({ android, ios }) {
  const jobs = []
  const missing = []
  if (android) {
    const { sdk, names } = await workshopEmulators()
    if (names.length === 0) missing.push('emulators')
    names.forEach((name, index) => jobs.push({ label: `Emulator ${index + 1}`, name, start: () => startEmulator(sdk, name), delay: index * LAUNCH_GAP }))
  }
  if (ios) {
    const simulators = workshopSimulators()
    if (simulators.length === 0) missing.push('simulators')
    simulators.forEach((simulator, index) => jobs.push({ label: `Simulator ${index + 1}`, name: simulator.name, start: () => startSimulator(simulator), delay: 0 }))
  }
  return { jobs, missing }
}

async function main() {
  const wanted = platformsToStart(process.argv.slice(2))
  if (wanted.requestedIosOnWrongOs) {
    fail('iOS simulators only work on a Mac.')
    return 1
  }

  const { jobs, missing } = await planDevices(wanted)
  if (missing.length > 0) {
    fail(`The workshop ${missing.join(' and ')} are not there yet. Run npm run setup first.`)
    if (jobs.length === 0) return 1
  }

  say(bold(`\nStarting ${jobs.length} devices, this takes a minute or two...\n`))
  const progress = createProgress(jobs.map((job) => job.label))
  jobs.forEach((job) => progress.update(job.label, `${job.name}: starting...`))

  // The workshop text starts when the last device has been started, and then appears line by line below the devices
  let ready = false
  let allStarted
  const started = new Promise((resolve) => (allStarted = resolve))
  let waiting = jobs.length
  const reading = (async () => {
    if (jobs.length > 0) await started
    progress.print()
    for (const line of workshopLines()) {
      progress.print(line)
      if (line) await sleep(ready ? LINE_PAUSE_WHEN_READY : LINE_PAUSE)
    }
  })()

  const results = await Promise.all(
    jobs.map(async (job) => {
      await sleep(job.delay)
      if (--waiting === 0) allStarted()
      try {
        await job.start()
        progress.done(job.label, true, `${job.name} is ready`)
        return true
      } catch (e) {
        progress.done(job.label, false, `${job.name} did not start: ${e.message}`)
        return false
      }
    }),
  )
  ready = true
  await reading
  progress.stop()

  if (results.every(Boolean) && missing.length === 0) {
    say(`\n${bold('Everything is running. Enjoy the workshop!')}`)
    return 0
  }
  warn('Not everything started. Run npm run check to see what is wrong.')
  info('You can start a single device with: start-android-emulator <name> or start-ios-simulator <name>')
  return 1
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
    .then((code) => process.exit(code))
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
}
