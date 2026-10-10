import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, afterEach, beforeEach, mock, test } from 'node:test'

const run = mock.fn()
const download = mock.fn()
mock.module('../scripts/lib/shell.mjs', { namedExports: { run, IS_WIN: false } })
mock.module('../scripts/lib/download.mjs', { namedExports: { download } })

const root = mkdtempSync(join(tmpdir(), 'workshop-apps-'))
const realHome = process.env.HOME
const realUserProfile = process.env.USERPROFILE
process.env.HOME = root
process.env.USERPROFILE = root
const apps = await import('../scripts/lib/apps.mjs')
const realPlatform = Object.getOwnPropertyDescriptor(process, 'platform')
const setPlatform = (value) => Object.defineProperty(process, 'platform', { value, configurable: true })

after(() => {
  process.env.HOME = realHome
  if (realUserProfile === undefined) delete process.env.USERPROFILE
  else process.env.USERPROFILE = realUserProfile
  rmSync(root, { recursive: true, force: true })
})
beforeEach(() => {
  run.mock.resetCalls()
  run.mock.mockImplementation(() => null)
  download.mock.resetCalls()
})
afterEach(() => Object.defineProperty(process, 'platform', realPlatform))

test('the workshop apps are the pinned release, with the file names the workshop project uses', () => {
  assert.equal(apps.APPS.android.file, 'android.wdio.native.app.apk')
  assert.equal(apps.APPS.ios.file, 'ios.simulator.wdio.native.app.zip')
  assert.match(apps.APPS.android.url, /native-demo-app\/releases\/download\/v2\.2\.0\/android\.wdio\.native\.app\.v2\.2\.0\.apk$/)
  assert.match(apps.APPS.ios.url, /v2\.2\.0\/ios\.simulator\.wdio\.native\.app\.v2\.2\.0\.zip$/)
})

test('on a Mac the apps go to a folder of their own in Downloads', () => {
  setPlatform('darwin')
  assert.equal(apps.downloadsDir(), join(root, 'Downloads'))
  assert.equal(apps.appsDir(), join(root, 'Downloads', 'appium-workshop-apps'))
  assert.equal(apps.appPath('ios'), join(root, 'Downloads', 'appium-workshop-apps', 'ios.simulator.wdio.native.app.zip'))
})

test('on Linux the Downloads folder comes from the system, with the usual place as fallback', () => {
  setPlatform('linux')
  run.mock.mockImplementation(() => '/data/Downloads')
  assert.equal(apps.downloadsDir(), '/data/Downloads')
  run.mock.mockImplementation(() => null)
  assert.equal(apps.downloadsDir(), join(root, 'Downloads'))
})

test('an app is only there when the file has the right size', () => {
  setPlatform('darwin')
  assert.equal(apps.hasApp('ios'), false)
  mkdirSync(apps.appsDir(), { recursive: true })
  writeFileSync(apps.appPath('ios'), 'too small')
  assert.equal(apps.hasApp('ios'), false)
})

test('downloading saves the app and checks that it is the expected file', async () => {
  setPlatform('darwin')
  const content = Buffer.from('pretend app')
  apps.APPS.android.sha256 = createHash('sha256').update(content).digest('hex')
  download.mock.mockImplementation(async (url, dest) => {
    mkdirSync(join(dest, '..'), { recursive: true })
    writeFileSync(dest, content)
  })
  const dest = await apps.downloadApp('android')
  assert.equal(dest, apps.appPath('android'))
  assert.equal(download.mock.calls[0].arguments[0], apps.APPS.android.url)
  assert.match(download.mock.calls[0].arguments[2], /Android demo app/)
})

test('a file that is not the expected app is removed and reported', async () => {
  setPlatform('darwin')
  apps.APPS.ios.sha256 = 'not the checksum'
  download.mock.mockImplementation(async (url, dest) => {
    mkdirSync(join(dest, '..'), { recursive: true })
    writeFileSync(dest, 'something else')
  })
  await assert.rejects(apps.downloadApp('ios'), /not the expected file/)
  assert.equal(existsSync(apps.appPath('ios')), false)
})
