import { appPath, hasApp } from '../lib/apps.mjs'
import { fail, info, ok } from '../lib/ui.mjs'

export function checkApp(platform) {
  const label = platform === 'android' ? 'Android' : 'iOS'
  if (hasApp(platform)) {
    ok(`${label} demo app, ${appPath(platform)}`)
    return true
  }
  fail(`${label} demo app not found`)
  info('Run: npm run setup')
  return false
}
