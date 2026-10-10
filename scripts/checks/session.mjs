import { createProgress } from '../lib/progress.mjs'
import { recordLog } from '../lib/report.mjs'
import { appiumErrorLines, explainFailure, runSmokeTest } from '../lib/smoke.mjs'
import { info } from '../lib/ui.mjs'

/**
 * Open the real WebdriverIO session on every platform at the same time (Android and iOS do not depend on each other),
 * with one live line per platform. The explanation of a failure is printed afterwards, so lines never get mixed.
 * `platforms` is [{ name: 'Android', ensureDevice }, ...]. Returns whether all sessions passed.
 */
export async function checkSessions(platforms, progress = createProgress(platforms.map((p) => p.name))) {
  const results = await Promise.all(platforms.map((platform) => checkSession(platform, progress)))
  progress.stop()
  for (const { name, details } of results) details.forEach((line) => info(`[${name}] ${line}`))
  return results.every((result) => result.passed)
}

/** Start Appium through WebdriverIO and open the Settings app. `ensureDevice` starts an emulator/simulator when none runs. */
async function checkSession({ name, ensureDevice }, progress) {
  const key = name.toLowerCase()
  const details = []
  let device = null
  try {
    progress.update(name, 'Looking for a running device...')
    device = await ensureDevice({ onStatus: (text) => progress.update(name, text) })
    progress.update(name, `Starting Appium and opening the Settings app on ${device.udid} (the first time this can take a few minutes)...`)
    const { passed, log } = await runSmokeTest({ platform: key, udid: device.udid })
    if (passed) {
      progress.done(name, true, 'WebdriverIO started Appium, opened the Settings app and read the screen')
      return { name, passed, details }
    }
    progress.done(name, false, 'could not open a session')
    recordLog(`${name}: output of the test runner and Appium`, log)
    details.push(explainFailure(log.join('\n'), key), ...appiumErrorLines(log).map((line) => `  ${line}`))
  } catch (e) {
    progress.done(name, false, 'could not get a device')
    details.push(explainFailure(e, key))
  } finally {
    device?.stop?.()
  }
  return { name, passed: false, details }
}
