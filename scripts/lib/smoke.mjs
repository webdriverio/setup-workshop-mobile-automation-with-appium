import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { run, runFile, runFileAsync } from './shell.mjs'

/**
 * The WebdriverIO smoke test: run a real WebdriverIO test (Appium service included, like the workshop project) that opens the
 * Settings app on an emulator/simulator and reads the screen. It is what exercise 1 of the workshop does, so when this passes that exercise passes.
 */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export const DEVICE_BOOT_TIMEOUT = 5 * 60 * 1000
// The first iOS session builds WebDriverAgent, which takes a few minutes
export const SESSION_TIMEOUT = 8 * 60 * 1000

// ─── Devices ────────────────────────────────────────────────────────────────

/** The ids of the emulators that are up, from the output of `adb devices`. */
export function parseAdbDevices(output) {
  return (output ?? '')
    .split('\n')
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter(([id, state]) => id?.startsWith('emulator-') && state === 'device')
    .map(([id]) => id)
}

/** Prefer an emulator for the workshop over one of the other AVDs on the machine. */
export function pickAvd(avds) {
  return avds.find((name) => name.startsWith('Workshop_')) ?? avds[0] ?? null
}

/**
 * "Booted" is not enough: right after the boot message the emulator still refuses the port forwarding that the Appium driver
 * needs ("Cannot find any free port"). So check the boot, the Settings app and a real forward.
 */
export function androidReady(udid) {
  const adb = (cmd) => run(`adb -s ${udid} ${cmd}`)
  if (adb('shell getprop sys.boot_completed') !== '1' || adb('shell getprop init.svc.bootanim') !== 'stopped') return false
  if (!adb('shell pm path com.android.settings')?.startsWith('package:')) return false
  const port = adb('forward tcp:0 tcp:6790')
  if (!port) return false
  adb(`forward --remove tcp:${port}`)
  return true
}

/**
 * Returns a running Android emulator, starting one when there is none.
 * `stop` is only set when we started it ourselves: an emulator the attendee already had open is left alone.
 */
export async function ensureAndroidDevice({ onStatus = () => {} } = {}) {
  const running = parseAdbDevices(run('adb devices'))
  if (running.length > 0) return { udid: running[0], stop: null }

  const avd = pickAvd((run('emulator -list-avds') ?? '').split('\n').filter(Boolean))
  if (!avd) throw new Error('NO_DEVICE')

  onStatus(`No emulator running, starting ${avd} (this takes a minute or two)...`)
  spawn('emulator', ['-avd', avd, '-no-snapshot-save', '-no-audio'], { detached: true, stdio: 'ignore', shell: process.platform === 'win32' }).unref()

  const deadline = Date.now() + DEVICE_BOOT_TIMEOUT
  while (Date.now() < deadline) {
    await sleep(3000)
    const udid = parseAdbDevices(run('adb devices'))[0]
    if (udid && androidReady(udid)) {
      return { udid, stop: () => runFile('adb', ['-s', udid, 'emu', 'kill']) }
    }
  }
  throw new Error('DEVICE_BOOT_TIMEOUT')
}

const listIosDevices = () => {
  try {
    return Object.values(JSON.parse(run('xcrun simctl list devices available -j') ?? '{}').devices ?? {}).flat()
  } catch {
    return []
  }
}

/** Same as ensureAndroidDevice, for the iOS simulator. */
export async function ensureIosDevice({ onStatus = () => {} } = {}) {
  const devices = listIosDevices()
  const booted = devices.find((d) => d.state === 'Booted')
  if (booted) return { udid: booted.udid, stop: null }

  const target = devices.find((d) => d.name.startsWith('Workshop_')) ?? devices.find((d) => d.name.startsWith('iPhone'))
  if (!target) throw new Error('NO_DEVICE')

  onStatus(`No simulator running, starting ${target.name}...`)
  if ((await runFileAsync('xcrun', ['simctl', 'boot', target.udid])).exitCode !== 0) throw new Error('DEVICE_BOOT_FAILED')
  await runFileAsync('xcrun', ['simctl', 'bootstatus', target.udid], { timeout: DEVICE_BOOT_TIMEOUT })
  return { udid: target.udid, stop: () => runFile('xcrun', ['simctl', 'shutdown', target.udid]) }
}

// ─── The WebdriverIO run ────────────────────────────────────────────────────

/** Ask the OS for a free port, so we never collide with an Appium the attendee already has running. */
export function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
  })
}

export const RUNNER = fileURLToPath(new URL('../smoke/run.mjs', import.meta.url))

/**
 * Run the smoke test the way the workshop runs its tests: the WebdriverIO test runner with the Appium service.
 * It starts Appium, opens a session on the Settings app, reads the screen and stops Appium again.
 * Returns whether it passed, plus the output of the runner and of Appium for the lines that explain a failure.
 */
export async function runSmokeTest({ platform, udid }) {
  let result
  // Now and then the port we picked is taken by someone else before Appium can use it (an emulator opens many ports): try once more with a new one
  for (let attempt = 0; attempt < 2; attempt++) {
    result = await runOnce({ platform, udid })
    if (result.passed || !PORT_PROBLEM.test(result.log.join('\n'))) break
  }
  return result
}

const PORT_PROBLEM = /Unable to connect|EADDRNOTAVAIL|EADDRINUSE|Cannot find any free port/

async function runOnce({ platform, udid }) {
  const port = await freePort()
  const logDir = await mkdtemp(join(tmpdir(), 'workshop-appium-'))
  try {
    const env = { ...process.env, SMOKE_PLATFORM: platform, SMOKE_UDID: udid, SMOKE_PORT: String(port), SMOKE_LOG_DIR: logDir }
    const { output, exitCode } = await runFileAsync(process.execPath, [RUNNER], { env, timeout: SESSION_TIMEOUT })
    const appiumLog = await readFile(join(logDir, 'wdio-appium.log'), 'utf8').catch(() => '')
    return { passed: exitCode === 0, log: [...output.split('\n'), ...appiumLog.split('\n')].map((l) => l.trim()).filter(Boolean) }
  } finally {
    await rm(logDir, { recursive: true, force: true })
  }
}

// ─── Failure hints ──────────────────────────────────────────────────────────

const HINTS = [
  [/NO_DEVICE/, (p) => (p === 'android' ? 'There is no emulator on this machine. Run: npm run setup' : 'There is no simulator on this machine. Run: npm run setup')],
  [/DEVICE_BOOT_(TIMEOUT|FAILED)/, (p) => `The ${p === 'android' ? 'emulator' : 'simulator'} did not start. Start it yourself, wait until you see the home screen and run this check again.`],
  [/JAVA_HOME/, () => 'Java was not found. Run: npm run setup, then open a new terminal.'],
  [/ANDROID_HOME|ANDROID_SDK_ROOT/, () => 'The Android SDK was not found. Run: npm run setup, then open a new terminal.'],
  [/WebDriverAgent|xcodebuild|Xcode/i, () => 'Xcode could not build the helper app for the simulator. Open Xcode once, accept the license and let it install extra components, then try again. Run: npm run setup'],
  [/ECONNREFUSED|ECONNRESET|socket hang up/, () => 'The connection to Appium was lost. Run this check again.'],
  [/timeout|timed out/i, () => 'The device took too long to respond. Close other heavy apps, make sure the device is fully started and run this check again.'],
]

/** Plain-language advice for an error of the smoke test. Always returns a line. */
export function explainFailure(error, platform) {
  const text = `${error?.message ?? error}`
  const hit = HINTS.find(([pattern]) => pattern.test(text))
  return hit ? hit[1](platform) : 'Something went wrong while opening the Settings app. Send the lines above to the workshop trainer.'
}

/** The last lines of the Appium log that say what went wrong. */
export function appiumErrorLines(log = [], count = 5) {
  return log.filter((line) => /error|fail|unable|cannot|not found/i.test(line)).slice(-count)
}
