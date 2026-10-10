import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, mock, test } from 'node:test'

// The Windows flavour of the Android helpers: other folders, .exe/.bat tools, zip downloads.
const run = mock.fn(() => null)
const runFile = mock.fn(() => ({ output: 'openjdk version "21.0.2" 2025', exitCode: 0 }))
const download = mock.fn(async () => {})
const extractArchive = mock.fn(async () => {})
mock.module('../scripts/lib/shell.mjs', { namedExports: { IS_MAC: false, IS_WIN: true, run, runFile } })
mock.module('../scripts/lib/download.mjs', { namedExports: { download, extractArchive } })

const root = mkdtempSync(join(tmpdir(), 'workshop-android-win-'))
const savedEnv = { ...process.env }
process.env.HOME = join(root, 'home')
const android = await import('../scripts/lib/android.mjs')

const touch = (file) => {
  mkdirSync(join(file, '..'), { recursive: true })
  writeFileSync(file, '')
  return file
}
after(() => {
  Object.assign(process.env, savedEnv)
  rmSync(root, { recursive: true, force: true })
})

test('the SDK lives in LOCALAPPDATA\\Android\\Sdk, or in the home folder without LOCALAPPDATA', () => {
  process.env.LOCALAPPDATA = join(root, 'local')
  assert.equal(android.defaultSdkPath(), join(root, 'local', 'Android', 'Sdk'))
  delete process.env.LOCALAPPDATA
  assert.equal(android.defaultSdkPath(), join(process.env.HOME, 'Android', 'Sdk'))
})

test('Java is java.exe, directly in the JDK folder (no Contents/Home like on a Mac)', async () => {
  assert.equal(android.isValidJavaHome(join(root, 'jdk')), false)
  touch(join(root, 'jdk', 'bin', 'java.exe'))
  assert.equal(android.isValidJavaHome(join(root, 'jdk')), true)
  assert.equal(android.javaMajor(join(root, 'jdk')), 21)

  extractArchive.mock.mockImplementation(async (_zip, dir) => touch(join(dir, 'jdk-21.0.2+13', 'bin', 'java.exe')))
  const home = await android.installJdk()
  assert.match(download.mock.calls[0].arguments[0], /\/ga\/windows\//)
  assert.match(download.mock.calls[0].arguments[1], /temurin-21\.zip$/)
  assert.equal(home, join(process.env.HOME, '.jdks', 'temurin-21', 'jdk-21.0.2+13'))
})

test('the SDK tools are .bat files', () => {
  const sdk = join(root, 'sdk')
  assert.equal(android.sdkTool(sdk, 'sdkmanager'), null)
  touch(join(sdk, 'cmdline-tools', 'latest', 'bin', 'sdkmanager.bat'))
  assert.equal(android.sdkTool(sdk, 'sdkmanager'), join(sdk, 'cmdline-tools', 'latest', 'bin', 'sdkmanager.bat'))
})

test('the command-line tools are the Windows build', async () => {
  mock.method(globalThis, 'fetch', async () => ({ ok: true, text: async () => 'commandlinetools-win-111_latest.zip commandlinetools-mac-999_latest.zip' }))
  extractArchive.mock.mockImplementation(async (_zip, out) => touch(join(out, 'cmdline-tools', 'bin', 'sdkmanager.bat')))
  await android.installCmdlineTools(join(root, 'new-sdk'))
  assert.match(download.mock.calls.at(-1).arguments[0], /commandlinetools-win-111_latest\.zip$/)
  mock.restoreAll()
})

test('adb is adb.exe inside the SDK when it is not on the PATH', () => {
  const sdk = join(root, 'sdk')
  assert.equal(android.adbVersion(sdk), null)
  assert.equal(run.mock.calls.at(-1).arguments[0], `"${join(sdk, 'platform-tools', 'adb.exe')}" --version`)
})
