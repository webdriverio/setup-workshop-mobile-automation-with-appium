// What the smoke test opens: the Settings app, which every device has, so no demo app has to be downloaded.
// Kept apart from smoke.mjs because the WebdriverIO worker loads it too and must not pull in the runner.

export const androidCapabilities = (udid) => ({
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:udid': udid,
  'appium:appPackage': 'com.android.settings',
  'appium:appActivity': '.Settings',
  'appium:adbExecTimeout': 2 * 60 * 1000,
  'appium:uiautomator2ServerInstallTimeout': 2 * 60 * 1000,
  'appium:newCommandTimeout': 240,
})

export const iosCapabilities = (udid) => ({
  platformName: 'iOS',
  'appium:automationName': 'XCUITest',
  'appium:udid': udid,
  'appium:bundleId': 'com.apple.Preferences',
  'appium:useNewWDA': false,
  'appium:wdaLaunchTimeout': 5 * 60 * 1000,
  'appium:wdaConnectionTimeout': 5 * 60 * 1000,
  'appium:newCommandTimeout': 240,
})
