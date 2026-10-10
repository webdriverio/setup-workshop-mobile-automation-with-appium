import { APPS, appsDir, downloadApp, hasApp } from '../lib/apps.mjs'
import { dry } from '../lib/plan.mjs'
import { FLAGS, fail, info, ok } from '../lib/ui.mjs'

/** The setup step that downloads the demo app of the workshop for one platform. */
export function appStep(platform) {
  const label = platform === 'android' ? 'Android' : 'iOS'
  const megabytes = Math.round(APPS[platform].size / 1024 / 1024)
  return {
    title: `${label} demo app`,
    description: `The app we test in the workshop (${megabytes} MB). It is saved in ${appsDir()}, so you do not have to download it on the day.`,
    done: hasApp(platform),
    apply: async () => {
      if (FLAGS.dryRun) {
        dry(`would download the ${label} demo app to ${appsDir()}`)
        return true
      }
      try {
        ok(`Saved to ${await downloadApp(platform)}`)
        return true
      } catch (e) {
        fail(`Downloading the ${label} demo app failed: ${e.message}`)
        info('Run the setup again, the download continues where it stopped.')
        return false
      }
    },
  }
}

/** The line at the end of a platform setup that says where the app is. */
export const appHint = () => info(`The demo app of the workshop is in ${appsDir()}`)
