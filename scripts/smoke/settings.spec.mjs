/**
 * The same check as exercise 1 of the workshop: the session opens the Settings app (see wdio.conf.mjs),
 * and reading the page source proves Appium, the driver and the device all work together.
 */
describe('Environment smoke test', () => {
  it('opens the Settings app and reads the screen', async () => {
    const source = await driver.getPageSource()
    expect(source.length).toBeGreaterThan(0)
  })
})
