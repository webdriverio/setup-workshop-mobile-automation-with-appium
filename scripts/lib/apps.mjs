import { createHash } from 'node:crypto'
import { createReadStream, statSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { download } from './download.mjs'
import { IS_WIN, run } from './shell.mjs'

/**
 * The demo app of the workshop (https://github.com/webdriverio/native-demo-app). We download it in advance, so nobody has to
 * download 130 MB on the conference wifi. The release is pinned: size and checksum are the ones the workshop project uses.
 */
const RELEASE = 'v2.2.0'
const BASE = `https://github.com/webdriverio/native-demo-app/releases/download/${RELEASE}`

export const APPS = {
  android: {
    file: 'android.wdio.native.app.apk',
    url: `${BASE}/android.wdio.native.app.${RELEASE}.apk`,
    size: 123595826,
    sha256: 'fe1d605ce099c73d93f33e5cbcb0df0bea437ce57aaaaf156b3b0fa1ca54931d',
  },
  ios: {
    file: 'ios.simulator.wdio.native.app.zip',
    url: `${BASE}/ios.simulator.wdio.native.app.${RELEASE}.zip`,
    size: 15981903,
    sha256: '84c7efda441f7a8ed37bb1527bae357de8a44a16f878996d52bdfd9d58a8c66a',
  },
}

/** The Downloads folder of this user. It can be moved, so ask the system and fall back to the usual place. */
export function downloadsDir() {
  const usual = join(homedir(), 'Downloads')
  if (IS_WIN) {
    return run(`powershell -NoProfile -Command "(New-Object -ComObject Shell.Application).NameSpace('shell:Downloads').Self.Path"`) || usual
  }
  if (process.platform === 'linux') return run('xdg-user-dir DOWNLOAD') || usual
  return usual
}

/** A folder of our own inside Downloads, so we never touch other files and the attendee finds everything in one place. */
export const appsDir = () => join(downloadsDir(), 'appium-workshop-apps')
export const appPath = (platform) => join(appsDir(), APPS[platform].file)

export function hasApp(platform) {
  try {
    return statSync(appPath(platform)).size === APPS[platform].size
  } catch {
    return false
  }
}

const sha256Of = (file) =>
  new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    createReadStream(file).on('data', (chunk) => hash.update(chunk)).on('error', reject).on('end', () => resolve(hash.digest('hex')))
  })

/** Download the app and check it is the file the workshop expects. A wrong file is removed. */
export async function downloadApp(platform) {
  const { url, sha256 } = APPS[platform]
  const dest = appPath(platform)
  await download(url, dest, `Downloading the ${platform === 'android' ? 'Android' : 'iOS'} demo app`)
  if ((await sha256Of(dest)) !== sha256) {
    await rm(dest, { force: true })
    throw new Error('The downloaded app is not the expected file. Run the setup again.')
  }
  return dest
}
