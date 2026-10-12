import { adbBinary, findRunning, inspect as inspectAndroid, launchEmulator, listEmulators, waitForBoot as waitForEmulator } from 'start-android-emulator'
import { bootSimulator, listSimulators, waitForBoot as waitForSimulator } from 'start-ios-simulator'
import { runFile } from './shell.mjs'
import { DEVICE_BOOT_TIMEOUT, androidReady } from './smoke.mjs'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Starting two emulators at the same moment can make them fight for the same ports, so the second one follows a little later. */
export const LAUNCH_GAP = 4000

const isWorkshop = (name) => name.startsWith('Workshop_')

/** The names of the workshop emulators that `npm run setup` made. Empty when there are none. */
export async function workshopEmulators() {
  const { sdk } = await inspectAndroid()
  return sdk ? { sdk, names: ((await listEmulators(sdk)) ?? []).filter(isWorkshop).sort() } : { sdk: null, names: [] }
}

/** The workshop simulators that `npm run setup` made, on the newest iOS version they exist for. */
export function workshopSimulators() {
  const found = (listSimulators() ?? []).filter((simulator) => isWorkshop(simulator.name))
  return found.filter((simulator) => simulator.version === found[0]?.version).sort((a, b) => a.name.localeCompare(b.name))
}

/** Start one emulator and wait until it can really be used. An emulator that is already running is left as it is. */
export async function startEmulator(sdk, name) {
  const adb = adbBinary(sdk)
  let running = findRunning(adb, name)
  if (!running) {
    const launched = launchEmulator(sdk, { name, wipeData: false, coldBoot: false, dns: false })
    running = await waitForEmulator(adb, name, launched, { timeoutMs: DEVICE_BOOT_TIMEOUT })
  }
  // "Booted" is not enough, see androidReady
  const deadline = Date.now() + DEVICE_BOOT_TIMEOUT
  while (!androidReady(running.serial)) {
    if (Date.now() > deadline) throw new Error('it did not get ready in time')
    await sleep(3000)
  }
  return running.serial
}

/**
 * Show a simulator in a window of its own: the Simulator app does that (Xcode 26 and older), and Xcode 27 opens it in Device Hub.
 * A simulator that stays hidden still works for the tests, so false is not an error.
 */
export function openSimulatorWindow(udid) {
  if (runFile('open', ['-a', 'Simulator', '--args', '-CurrentDeviceUDID', udid]).exitCode === 0) return true
  return runFile('open', [`devices://device/open?id=${udid}`]).exitCode === 0
}

/** Start one simulator, wait until its home screen is there and show it in a window. */
export async function startSimulator(simulator) {
  if (!bootSimulator(simulator.udid).ok) throw new Error('the simulator did not boot')
  await waitForSimulator(simulator.udid, { timeoutMs: DEVICE_BOOT_TIMEOUT })
  openSimulatorWindow(simulator.udid)
  return simulator.udid
}
