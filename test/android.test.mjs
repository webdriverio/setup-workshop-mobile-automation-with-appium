import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { arch, tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, afterEach, before, beforeEach, mock, test } from 'node:test'

const skipOnWindows = { skip: process.platform === 'win32' && 'paths and executables differ on Windows' }
const IS_MAC = process.platform === 'darwin'

const run = mock.fn()
const runFile = mock.fn()
const download = mock.fn(async () => {})
const extractArchive = mock.fn(async () => {})
mock.module('../scripts/lib/shell.mjs', { namedExports: { IS_MAC, IS_WIN: process.platform === 'win32', run, runFile } })
mock.module('../scripts/lib/download.mjs', { namedExports: { download, extractArchive } })

const root = mkdtempSync(join(tmpdir(), 'workshop-android-'))
const realHome = process.env.HOME
process.env.HOME = join(root, 'home') // read when the module loads, so before the import
const android = await import('../scripts/lib/android.mjs')

const result = (output = '', exitCode = 0) => ({ output, exitCode })
const touch = (file, content = '') => {
  mkdirSync(join(file, '..'), { recursive: true })
  writeFileSync(file, content)
  return file
}
/** A folder that looks like a JDK. `javaVersion` is what `java -version` will print for it. */
const fakeJdk = (home, javaVersion) => {
  touch(join(home, 'bin', 'java'))
  versions.set(join(home, 'bin', 'java'), javaVersion)
  return home
}
const versions = new Map()
const fakeSdk = (name) => {
  const sdk = join(root, name)
  touch(join(sdk, 'cmdline-tools', 'latest', 'bin', 'sdkmanager'))
  touch(join(sdk, 'cmdline-tools', 'latest', 'bin', 'avdmanager'))
  return sdk
}

const savedEnv = { ...process.env }
before(() => mkdirSync(process.env.HOME, { recursive: true }))
after(() => {
  process.env.HOME = realHome
  rmSync(root, { recursive: true, force: true })
})
beforeEach(() => {
  for (const fn of [run, runFile, download, extractArchive]) fn.mock.resetCalls()
  runFile.mock.mockImplementation((file) => (versions.has(file) ? result(`openjdk version "${versions.get(file)}" 2025`) : result()))
  delete process.env.JAVA_HOME
  delete process.env.ANDROID_HOME
  delete process.env.ANDROID_SDK_ROOT
  for (const name of ['HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy']) delete process.env[name]
})
afterEach(() => {
  mock.restoreAll()
  Object.assign(process.env, savedEnv)
})

test('the workshop pins Android 17 with two emulators and a matching system image', () => {
  assert.equal(android.API_LEVEL, '37.0')
  assert.deepEqual(android.AVD_NAMES, ['Workshop_1_Pixel_10_API_37_0', 'Workshop_2_Pixel_10_API_37_0'])
  assert.equal(android.SYSTEM_IMAGE, `system-images;android-37.0;google_apis;${arch() === 'arm64' ? 'arm64-v8a' : 'x86_64'}`)
  assert.deepEqual(android.REQUIRED_PACKAGES, ['platform-tools', 'emulator', 'platforms;android-37.0', android.SYSTEM_IMAGE])
})

// ─── Java ───────────────────────────────────────────────────────────────────

test('javaMajor reads the major version, also from the old 1.x scheme', skipOnWindows, () => {
  assert.equal(android.javaMajor(fakeJdk(join(root, 'jdk21'), '21.0.1')), 21)
  assert.equal(android.javaMajor(fakeJdk(join(root, 'jdk17'), '17')), 17)
  assert.equal(android.javaMajor(fakeJdk(join(root, 'jdk8'), '1.8.0_292')), 8)
})

test('javaMajor is null for output it does not understand or a folder without java', skipOnWindows, () => {
  assert.equal(android.javaMajor(fakeJdk(join(root, 'jdk-odd'), 'x')), null)
  runFile.mock.mockImplementation(() => result('something else'))
  assert.equal(android.javaMajor(join(root, 'jdk21')), null)
  assert.equal(android.javaMajor(join(root, 'nothing-here')), null)
  assert.equal(android.javaMajor(undefined), null)
})

test('isValidJavaHome needs a bin/java', skipOnWindows, () => {
  assert.equal(android.isValidJavaHome(join(root, 'jdk21')), true)
  assert.equal(android.isValidJavaHome(join(root, 'empty')), false)
  assert.equal(android.isValidJavaHome(undefined), false)
})

test('detectJava uses JAVA_HOME when it is Java 17 or higher', skipOnWindows, () => {
  process.env.JAVA_HOME = fakeJdk(join(root, 'jdk-env-21'), '21.0.2')
  assert.deepEqual(android.detectJava(), { home: process.env.JAVA_HOME, major: 21, source: 'JAVA_HOME' })
})

test('detectJava skips an old JAVA_HOME and uses the Java that setup downloaded', skipOnWindows, () => {
  process.env.JAVA_HOME = fakeJdk(join(root, 'jdk-env-11'), '11.0.2')
  const home = fakeJdk(join(process.env.HOME, '.jdks', 'temurin-21', 'jdk-21.0.2+13', ...(IS_MAC ? ['Contents', 'Home'] : [])), '21.0.2')
  assert.deepEqual(android.detectJava(), { home, major: 21, source: 'downloaded by setup' })
})

test('detectJava finds nothing when there is no usable Java', skipOnWindows, () => {
  rmSync(join(process.env.HOME, '.jdks'), { recursive: true, force: true })
  assert.equal(android.detectJava(), null)
  mkdirSync(join(process.env.HOME, '.jdks', 'temurin-21', 'readme-only'), { recursive: true })
  assert.equal(android.detectJava(), null)
})

test('installJdk downloads Temurin 21 for this machine and returns its home', skipOnWindows, async () => {
  extractArchive.mock.mockImplementation(async (_archive, dir) => {
    fakeJdk(join(dir, 'jdk-21.0.2+13', ...(IS_MAC ? ['Contents', 'Home'] : [])), '21.0.2')
  })
  const home = await android.installJdk()
  const url = download.mock.calls[0].arguments[0]
  assert.match(url, /api\.adoptium\.net\/v3\/binary\/latest\/21\/ga\/(mac|linux)\/(aarch64|x64)\/jdk\//)
  assert.equal(android.isValidJavaHome(home), true)
})

test('installJdk explains when the download does not contain a JDK', skipOnWindows, async () => {
  extractArchive.mock.mockImplementation(async (_archive, dir) => mkdirSync(dir, { recursive: true }))
  await assert.rejects(android.installJdk(), /no JDK was found/)
})

// ─── SDK location and command-line tools ────────────────────────────────────

test('defaultSdkPath is the usual place for the operating system', skipOnWindows, () => {
  const expected = IS_MAC ? join(process.env.HOME, 'Library', 'Android', 'sdk') : join(process.env.HOME, 'Android', 'Sdk')
  assert.equal(android.defaultSdkPath(), expected)
})

test('detectSdkPath prefers ANDROID_HOME, then a SDK in a known place, else null', skipOnWindows, () => {
  assert.equal(android.detectSdkPath(), null)

  mkdirSync(join(android.defaultSdkPath(), 'platform-tools'), { recursive: true })
  assert.equal(android.detectSdkPath(), android.defaultSdkPath())

  process.env.ANDROID_HOME = '/does/not/exist'
  assert.equal(android.detectSdkPath(), android.defaultSdkPath())

  process.env.ANDROID_HOME = join(root, 'custom-sdk')
  mkdirSync(process.env.ANDROID_HOME)
  assert.equal(android.detectSdkPath(), process.env.ANDROID_HOME)

  delete process.env.ANDROID_HOME
  process.env.ANDROID_SDK_ROOT = process.env.HOME
  assert.equal(android.detectSdkPath(), process.env.HOME)
})

const repositoryXml = (os) => ['commandlinetools-' + os + '-9477386_latest.zip', 'commandlinetools-' + os + '-13114758_latest.zip', 'commandlinetools-other-99999999_latest.zip'].join('\n')
const osName = IS_MAC ? 'mac' : process.platform === 'win32' ? 'win' : 'linux'

test('installCmdlineTools downloads the newest build for this OS into cmdline-tools/latest', skipOnWindows, async () => {
  mock.method(globalThis, 'fetch', async () => ({ ok: true, text: async () => repositoryXml(osName) }))
  extractArchive.mock.mockImplementation(async (_zip, out) => touch(join(out, 'cmdline-tools', 'bin', 'sdkmanager')))
  const sdk = join(root, 'new-sdk')

  await android.installCmdlineTools(sdk)

  assert.equal(download.mock.calls[0].arguments[0], `https://dl.google.com/android/repository/commandlinetools-${osName}-13114758_latest.zip`)
  assert.ok(existsSync(join(sdk, 'cmdline-tools', 'latest', 'bin', 'sdkmanager')))
  assert.equal(existsSync(join(sdk, '.cmdline-tools-download')), false, 'temporary download folder is removed')
})

test('installCmdlineTools explains what went wrong when it cannot find the tools', skipOnWindows, async () => {
  mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 503 }))
  await assert.rejects(android.installCmdlineTools(join(root, 'sdk-a')), /HTTP 503/)
  mock.method(globalThis, 'fetch', async () => ({ ok: true, text: async () => 'nothing useful' }))
  await assert.rejects(android.installCmdlineTools(join(root, 'sdk-b')), new RegExp(`No command-line tools found for ${osName}`))
})

test('the device skin is only there when its layout file is', skipOnWindows, async () => {
  const sdk = join(root, 'skin-sdk')
  assert.equal(android.hasSkin(sdk), false)

  extractArchive.mock.mockImplementation(async (_archive, dir) => touch(join(dir, 'layout')))
  await android.installSkin(sdk)
  assert.match(download.mock.calls[0].arguments[0], /device-art-resources\/pixel_10\.tar\.gz$/)
  assert.equal(android.hasSkin(sdk), true)
})

test('installSkin fails when the archive has no layout file', skipOnWindows, async () => {
  extractArchive.mock.mockImplementation(async (_archive, dir) => mkdirSync(dir, { recursive: true }))
  await assert.rejects(android.installSkin(join(root, 'skin-sdk-empty')), /pixel_10\/layout is missing/)
})

// ─── SDK tools ──────────────────────────────────────────────────────────────

test('sdkTool finds a tool in cmdline-tools/latest/bin, or null', skipOnWindows, () => {
  const sdk = fakeSdk('tools-sdk')
  assert.equal(android.sdkTool(sdk, 'sdkmanager'), join(sdk, 'cmdline-tools', 'latest', 'bin', 'sdkmanager'))
  assert.equal(android.sdkTool(sdk, 'nope'), null)
})

test('platformToolsDirs and toolEnv point at the SDK and the JDK', () => {
  assert.deepEqual(android.platformToolsDirs('/sdk'), [join('/sdk', 'platform-tools'), join('/sdk', 'emulator')])
  const env = android.toolEnv('/sdk', '/jdk')
  assert.equal(env.ANDROID_HOME, '/sdk')
  assert.equal(env.JAVA_HOME, '/jdk')
})

const SDKMANAGER_LIST = `Installed packages:
  Path                 | Version | Description                  | Location
  -------              | ------- | -------                      | -------
  emulator             | 36.4.9  | Android Emulator             | emulator
  platform-tools       | 37.0.0  | Android SDK Platform-Tools   | platform-tools
  platforms;android-37.0 | 1     | Android SDK Platform 37.0    | platforms/android-37.0
`

test('listInstalledPackages returns the package ids sdkmanager prints', skipOnWindows, () => {
  const sdk = fakeSdk('list-sdk')
  runFile.mock.mockImplementation(() => result(SDKMANAGER_LIST))
  assert.deepEqual([...android.listInstalledPackages(sdk, '/jdk')].sort(), ['emulator', 'platform-tools', 'platforms;android-37.0'])
  assert.deepEqual(runFile.mock.calls[0].arguments[1], [`--sdk_root=${sdk}`, '--list_installed'])
})

test('listInstalledPackages is null without sdkmanager or when it fails', skipOnWindows, () => {
  assert.equal(android.listInstalledPackages(join(root, 'no-tools'), '/jdk'), null)
  runFile.mock.mockImplementation(() => result('boom', 1))
  assert.equal(android.listInstalledPackages(fakeSdk('failing-sdk'), '/jdk'), null)
})

test('acceptLicenses answers yes to every question', skipOnWindows, () => {
  runFile.mock.mockImplementation(() => result())
  assert.equal(android.acceptLicenses(fakeSdk('licence-sdk'), '/jdk'), true)
  assert.match(runFile.mock.calls[0].arguments[2].input, /^(y\n)+$/)
  runFile.mock.mockImplementation(() => result('', 1))
  assert.equal(android.acceptLicenses(fakeSdk('licence-sdk'), '/jdk'), false)
})

test('installPackages installs the given packages and shows the progress', skipOnWindows, () => {
  const sdk = fakeSdk('install-sdk')
  runFile.mock.mockImplementation(() => result())
  assert.equal(android.installPackages(sdk, '/jdk', ['emulator', 'platform-tools']), true)
  const [, args, options] = runFile.mock.calls[0].arguments
  assert.deepEqual(args, [`--sdk_root=${sdk}`, '--install', 'emulator', 'platform-tools'])
  assert.equal(options.inherit, true)
  runFile.mock.mockImplementation(() => result('', 1))
  assert.equal(android.installPackages(sdk, '/jdk', ['emulator']), false)
})

test('the SDK manager gets the proxy from the environment as options', skipOnWindows, () => {
  const sdk = fakeSdk('proxy-sdk')
  runFile.mock.mockImplementation(() => result())
  process.env.HTTPS_PROXY = 'http://proxy.company.com:8080'
  android.installPackages(sdk, '/jdk', ['emulator'])
  android.acceptLicenses(sdk, '/jdk')
  const proxy = ['--proxy=http', '--proxy_host=proxy.company.com', '--proxy_port=8080']
  assert.deepEqual(runFile.mock.calls[0].arguments[1], [`--sdk_root=${sdk}`, ...proxy, '--install', 'emulator'])
  assert.deepEqual(runFile.mock.calls[1].arguments[1], [`--sdk_root=${sdk}`, ...proxy, '--licenses'])
})

test('listAvds returns emulator names and ignores warning lines', skipOnWindows, () => {
  runFile.mock.mockImplementation(() => result('WARNING: A Java warning with spaces\nWorkshop_1_Pixel_10_API_37_0\n\nWorkshop_2_Pixel_10_API_37_0\n'))
  assert.deepEqual(android.listAvds(fakeSdk('avd-sdk'), '/jdk'), android.AVD_NAMES)
})

test('listAvds is null without avdmanager or when it fails', skipOnWindows, () => {
  assert.equal(android.listAvds(join(root, 'no-tools'), '/jdk'), null)
  runFile.mock.mockImplementation(() => result('', 1))
  assert.equal(android.listAvds(fakeSdk('avd-failing-sdk'), '/jdk'), null)
})

test('createAvd uses the Pixel 9 profile, and adds the Pixel 10 skin when it is installed', skipOnWindows, () => {
  const sdk = fakeSdk('create-sdk')
  runFile.mock.mockImplementation(() => result())

  android.createAvd(sdk, '/jdk', 'Workshop_1')
  const without = runFile.mock.calls[0].arguments[1]
  assert.deepEqual(without, ['create', 'avd', '--force', '-n', 'Workshop_1', '-k', android.SYSTEM_IMAGE, '-d', 'pixel_9'])
  assert.equal(runFile.mock.calls[0].arguments[2].input, 'no\n')

  touch(join(sdk, 'skins', 'pixel_10', 'layout'))
  android.createAvd(sdk, '/jdk', 'Workshop_1')
  assert.deepEqual(runFile.mock.calls[1].arguments[1].slice(-2), ['--skin', 'pixel_10'])
})

test('androidEnvGaps lists what the terminal is missing', skipOnWindows, () => {
  const jdk = fakeJdk(join(root, 'env-jdk'), '21.0.1')
  run.mock.mockImplementation(() => 'Android Debug Bridge')
  Object.assign(process.env, { ANDROID_HOME: '/sdk', JAVA_HOME: jdk })
  assert.deepEqual(android.androidEnvGaps(), { vars: [], pathMissing: false })

  delete process.env.ANDROID_HOME
  run.mock.mockImplementation(() => null)
  assert.deepEqual(android.androidEnvGaps(), { vars: ['ANDROID_HOME'], pathMissing: true })

  process.env.JAVA_HOME = fakeJdk(join(root, 'old-jdk'), '11.0.2')
  assert.deepEqual(android.androidEnvGaps().vars, ['ANDROID_HOME', 'JAVA_HOME'])

  process.env.JAVA_HOME = join(root, 'no-jdk')
  assert.ok(android.androidEnvGaps().vars.includes('JAVA_HOME'))
})
