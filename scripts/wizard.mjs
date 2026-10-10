import { select } from '@inquirer/prompts'
import { setupAndroid } from './steps/android.mjs'
import { setupIos } from './steps/ios.mjs'
import { IS_MAC } from './lib/shell.mjs'
import { FLAGS, bold, info, warn } from './lib/ui.mjs'

const PLATFORMS = {
  android: setupAndroid,
  ios: setupIos,
}

/** Run the wizard. Resolves to the exit code: 0 when all is well, 1 when something still needs attention. */
export async function runWizard() {
  console.log(`\n${bold('Appium + WebdriverIO workshop, environment setup')}`)
  if (FLAGS.dryRun) warn('Dry run: nothing will be changed.')

  const results = {}

  if (FLAGS.yes) {
    results.android = await setupAndroid()
    if (IS_MAC) results.ios = await setupIos()
  } else {
    if (!IS_MAC) info('iOS is only available on macOS, so it is not in the list.')
    const status = (platform) => (results[platform] === undefined ? '' : results[platform] ? '  ✔ ready' : '  ⚠ needs attention')
    while (true) {
      const choice = await select({
        message: 'What do you want to set up?',
        choices: [
          { name: `Android${status('android')}`, value: 'android' },
          ...(IS_MAC ? [{ name: `iOS${status('ios')}`, value: 'ios' }] : []),
          { name: 'Finish', value: 'finish' },
        ],
      })
      if (choice === 'finish') break
      results[choice] = await PLATFORMS[choice]()
    }
  }

  console.log('\n' + '─'.repeat(50))
  if (Object.values(results).includes(false)) {
    console.log(`\nSome things still need your attention. Run ${bold('npm run setup')} again after fixing them.\n`)
    return 1
  }
  console.log(`\nSetup finished. Next: ${bold('npm run check')}\n`)
  return 0
}
