import { androidCapabilities, iosCapabilities } from './capabilities.mjs'

/**
 * WebdriverIO configuration of the smoke test in `npm run check`. It mirrors the config of the workshop project:
 * the Appium service starts Appium, Mocha runs the spec. check-setup.mjs tells us which device to use through
 * environment variables, because the runner starts this file in its own process.
 */
const { SMOKE_PLATFORM, SMOKE_UDID, SMOKE_PORT, SMOKE_LOG_DIR } = process.env
const port = Number(SMOKE_PORT)

export const config = {
  specs: [new URL('./settings.spec.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')],
  capabilities: [SMOKE_PLATFORM === 'ios' ? iosCapabilities(SMOKE_UDID) : androidCapabilities(SMOKE_UDID)],
  port,
  logLevel: 'silent',
  bail: 1,
  waitforTimeout: 45 * 1000,
  connectionRetryTimeout: 6 * 60 * 1000,
  connectionRetryCount: 0,
  services: [['appium', { logPath: SMOKE_LOG_DIR, args: { port, relaxedSecurity: true } }]],
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: { ui: 'bdd', timeout: 6 * 60 * 1000 },
}
