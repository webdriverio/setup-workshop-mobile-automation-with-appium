import { spawnSync } from 'node:child_process'
import { select } from '@inquirer/prompts'
import { setupAndroid } from './steps/android.mjs'
import { setupIos } from './steps/ios.mjs'
import { needsCodeCommand, setupVscode } from './steps/vscode.mjs'
import { IS_MAC, IS_WIN } from './lib/shell.mjs'
import { printBanner } from './lib/banner.mjs'
import { FLAGS, ask, bold, info, warn } from './lib/ui.mjs'

const PLATFORMS = {
  android: setupAndroid,
  ios: setupIos,
}

/** Run the wizard. Resolves to the exit code: 0 when all is well, 1 when something still needs attention. */
export async function runWizard() {
  printBanner('Appium + WebdriverIO workshop, environment setup')
  if (FLAGS.dryRun) warn('Dry run: nothing will be changed.')

  const results = {}

  if (FLAGS.yes) {
    results.android = await setupAndroid()
    if (IS_MAC) results.ios = await setupIos()
    if (IS_MAC && needsCodeCommand()) await setupVscode()
  } else {
    if (!IS_MAC) info('iOS is only available on macOS, so it is not in the list.')
    const status = (platform) => (results[platform] === undefined ? '' : results[platform] ? '  ✔ ready' : '  ⚠ needs attention')
    while (true) {
      const choice = await select({
        message: 'What do you want to set up?',
        choices: [
          { name: `Android${status('android')}`, value: 'android' },
          ...(IS_MAC ? [{ name: `iOS${status('ios')}`, value: 'ios' }] : []),
          ...(IS_MAC && needsCodeCommand() ? [{ name: 'Visual Studio Code, add the `code` command (optional)', value: 'vscode' }] : []),
          { name: 'Finish', value: 'finish' },
        ],
      })
      if (choice === 'finish') break
      if (choice === 'vscode') await setupVscode()
      else results[choice] = await PLATFORMS[choice]()
    }
  }

  console.log('\n' + '─'.repeat(50))
  const needsAttention = Object.values(results).includes(false)
  if (needsAttention) {
    console.log(`\nSome things still need your attention. Run ${bold('npm run setup')} again after fixing them.`)
  } else {
    console.log(`\nSetup finished.`)
  }

  // Once a platform is ready, prove that it works by running the check (it opens a real session)
  if (!FLAGS.dryRun && Object.values(results).includes(true)) {
    console.log()
    if (await ask(`Run ${bold('npm run check')} now to test your setup?`)) {
      console.log()
      const checkFailed = spawnSync('npm', ['run', 'check'], { stdio: 'inherit', shell: IS_WIN }).status !== 0
      return needsAttention || checkFailed ? 1 : 0
    }
    console.log(`\nYou can run it later with ${bold('npm run check')}.`)
  } else if (!needsAttention) {
    console.log(`Next: ${bold('npm run check')}`)
  }
  console.log()
  return needsAttention ? 1 : 0
}
