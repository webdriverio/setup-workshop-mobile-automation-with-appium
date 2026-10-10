import { existsSync, readdirSync } from 'node:fs'
import { mkdir, rename, rm } from 'node:fs/promises'
import { arch, homedir } from 'node:os'
import { join } from 'node:path'
import { download, extractArchive } from './download.mjs'
import { IS_MAC, IS_WIN, run, runFile } from './shell.mjs'

// Android 17. Pinned on purpose (not "latest"), so every attendee gets the same version. 37.1+ only ship 16 KB page-size images.
export const API_LEVEL = '37.0'
export const ANDROID_VERSION = 17

// The workshop needs two emulators. Both Pixel 10 on the Android version above.
// avdmanager has no pixel_10 hardware profile yet, but the Pixel 10 screen is identical to the Pixel 9 (1080x2424),
// so we use the pixel_9 profile with the Pixel 10 skin (the device frame around the screen).
export const PIXEL_MODEL = 10
export const AVD_DEVICE = 'pixel_9'
export const AVD_SKIN = `pixel_${PIXEL_MODEL}`
export const AVD_NAMES = [1, 2].map((n) => `Workshop_${n}_Pixel_${PIXEL_MODEL}_API_${API_LEVEL.replace('.', '_')}`)

const ABI = arch() === 'arm64' ? 'arm64-v8a' : 'x86_64'
export const SYSTEM_IMAGE = `system-images;android-${API_LEVEL};google_apis;${ABI}`

/** Installed through sdkmanager. cmdline-tools itself is handled separately, it is needed to install the rest. */
export const REQUIRED_PACKAGES = [
  'platform-tools',
  'emulator',
  `platforms;android-${API_LEVEL}`,
  SYSTEM_IMAGE,
]

const exe = (name, win = '.exe') => (IS_WIN ? `${name}${win}` : name)

export const MIN_JAVA = 17
const JDK_FEATURE_VERSION = 21
// ~/.jdks is the folder IntelliJ, Android Studio and Gradle use for downloaded JDKs, so they find ours too.
const JDK_DIR = join(homedir(), '.jdks', `temurin-${JDK_FEATURE_VERSION}`)
const OS_NAME = IS_MAC ? 'mac' : IS_WIN ? 'win' : 'linux'

// ─── Java ───────────────────────────────────────────────────────────────────

export function isValidJavaHome(dir) {
  return Boolean(dir) && existsSync(join(dir, 'bin', exe('java')))
}

/** Major Java version of a JAVA_HOME, e.g. 21. Handles the old "1.8.0" scheme. */
export function javaMajor(home) {
  if (!isValidJavaHome(home)) return null
  const { output } = runFile(join(home, 'bin', exe('java')), ['-version'])
  const match = output.match(/version "(\d+)(?:\.(\d+))?/)
  if (!match) return null
  return match[1] === '1' ? Number(match[2]) : Number(match[1])
}

function jdkHomeIn(dir) {
  if (!existsSync(dir)) return null
  const top = readdirSync(dir).find((name) => name.startsWith('jdk'))
  if (!top) return null
  const home = IS_MAC ? join(dir, top, 'Contents', 'Home') : join(dir, top)
  return isValidJavaHome(home) ? home : null
}

/** Find a usable Java (17+): the one in JAVA_HOME, or the one we downloaded earlier. */
export function detectJava() {
  const candidates = [
    { home: process.env.JAVA_HOME, source: 'JAVA_HOME' },
    { home: jdkHomeIn(JDK_DIR), source: 'downloaded by setup' },
  ]
  for (const { home, source } of candidates) {
    const major = javaMajor(home)
    if (major && major >= MIN_JAVA) return { home, major, source }
  }
  return null
}

/** Download Temurin (Eclipse Adoptium) into ~/.jdks/temurin-21. Leaves the system Java and other JDKs untouched. */
export async function installJdk() {
  const os = IS_MAC ? 'mac' : IS_WIN ? 'windows' : 'linux'
  const cpu = arch() === 'arm64' ? 'aarch64' : 'x64'
  const url = `https://api.adoptium.net/v3/binary/latest/${JDK_FEATURE_VERSION}/ga/${os}/${cpu}/jdk/hotspot/normal/eclipse`
  const archive = `${JDK_DIR}${IS_WIN ? '.zip' : '.tar.gz'}`

  await rm(JDK_DIR, { recursive: true, force: true })
  await download(url, archive, `Downloading Java ${JDK_FEATURE_VERSION}`)
  await extractArchive(archive, JDK_DIR)
  await rm(archive, { force: true })

  const home = jdkHomeIn(JDK_DIR)
  if (!home) throw new Error(`Java was downloaded but no JDK was found in ${JDK_DIR}`)
  return home
}

// ─── Android SDK ────────────────────────────────────────────────────────────

export function defaultSdkPath() {
  const home = homedir()
  return IS_MAC
    ? join(home, 'Library', 'Android', 'sdk')
    : IS_WIN
      ? join(process.env.LOCALAPPDATA || home, 'Android', 'Sdk')
      : join(home, 'Android', 'Sdk')
}

/** An existing SDK: ANDROID_HOME, or the default location for this OS. */
export function detectSdkPath() {
  const configured = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT
  if (configured && existsSync(configured)) return configured
  const candidates = [defaultSdkPath(), join(homedir(), 'android', 'sdk')]
  return candidates.find((p) => existsSync(join(p, 'platform-tools')) || existsSync(join(p, 'cmdline-tools'))) || null
}

/** Google publishes a new build number per OS, so read the latest from the repository listing. */
async function latestCmdlineToolsUrl() {
  const base = 'https://dl.google.com/android/repository'
  const res = await fetch(`${base}/repository2-3.xml`)
  if (!res.ok) throw new Error(`Could not read the Android repository listing (HTTP ${res.status})`)
  const xml = await res.text()
  const builds = [...xml.matchAll(new RegExp(`commandlinetools-${OS_NAME}-(\\d+)_latest\\.zip`, 'g'))].map((m) => Number(m[1]))
  if (builds.length === 0) throw new Error(`No command-line tools found for ${OS_NAME}`)
  return `${base}/commandlinetools-${OS_NAME}-${Math.max(...builds)}_latest.zip`
}

/** Download the Android command-line tools into <sdk>/cmdline-tools/latest. */
export async function installCmdlineTools(sdk) {
  const url = await latestCmdlineToolsUrl()
  const tmp = join(sdk, '.cmdline-tools-download')
  const zip = join(tmp, 'tools.zip')

  await rm(tmp, { recursive: true, force: true })
  await download(url, zip, 'Downloading Android command-line tools')
  await extractArchive(zip, join(tmp, 'out'))

  await mkdir(join(sdk, 'cmdline-tools'), { recursive: true })
  await rm(join(sdk, 'cmdline-tools', 'latest'), { recursive: true, force: true })
  await rename(join(tmp, 'out', 'cmdline-tools'), join(sdk, 'cmdline-tools', 'latest'))
  await rm(tmp, { recursive: true, force: true })
}

// The emulator only shows a device frame when a skin is available in <sdk>/skins. Android Studio copies these
// there, without Studio they are missing, so fetch the same files from the Android source tree.
const SKIN_URL = `https://android.googlesource.com/platform/tools/adt/idea/+archive/refs/heads/mirror-goog-studio-main/artwork/resources/device-art-resources/${AVD_SKIN}.tar.gz`

export function hasSkin(sdk) {
  return existsSync(join(sdk, 'skins', AVD_SKIN, 'layout'))
}

export async function installSkin(sdk) {
  const archive = join(sdk, 'skins', `${AVD_SKIN}.tar.gz`)
  await download(SKIN_URL, archive, 'Downloading emulator skin')
  await extractArchive(archive, join(sdk, 'skins', AVD_SKIN))
  await rm(archive, { force: true })
  if (!hasSkin(sdk)) throw new Error(`Skin was downloaded but ${AVD_SKIN}/layout is missing`)
}

export function sdkTool(sdk, name) {
  const file = join(sdk, 'cmdline-tools', 'latest', 'bin', exe(name, '.bat'))
  return existsSync(file) ? file : null
}

export function platformToolsDirs(sdk) {
  return [join(sdk, 'platform-tools'), join(sdk, 'emulator')]
}

/** The SDK tools need Java 17+, so pass the JDK we picked instead of whatever JAVA_HOME points to. */
export function toolEnv(sdk, jdk) {
  return { ...process.env, JAVA_HOME: jdk, ANDROID_HOME: sdk }
}

export function listInstalledPackages(sdk, jdk) {
  const sdkmanager = sdkTool(sdk, 'sdkmanager')
  if (!sdkmanager) return null
  const { output, exitCode } = runFile(sdkmanager, [`--sdk_root=${sdk}`, '--list_installed'], { env: toolEnv(sdk, jdk) })
  if (exitCode !== 0) return null
  const installed = new Set()
  for (const line of output.split('\n')) {
    const id = line.split('|')[0]?.trim()
    if (id && /^[a-z][\w.-]*(;[\w.-]+)*$/i.test(id) && id !== 'Path') installed.add(id)
  }
  return installed
}

export function acceptLicenses(sdk, jdk) {
  const sdkmanager = sdkTool(sdk, 'sdkmanager')
  return runFile(sdkmanager, [`--sdk_root=${sdk}`, '--licenses'], {
    env: toolEnv(sdk, jdk),
    input: 'y\n'.repeat(50),
  }).exitCode === 0
}

export function installPackages(sdk, jdk, packages) {
  const sdkmanager = sdkTool(sdk, 'sdkmanager')
  return runFile(sdkmanager, [`--sdk_root=${sdk}`, '--install', ...packages], {
    env: toolEnv(sdk, jdk),
    inherit: true,
  }).exitCode === 0
}

export function listAvds(sdk, jdk) {
  const avdmanager = sdkTool(sdk, 'avdmanager')
  if (!avdmanager) return null
  const { output, exitCode } = runFile(avdmanager, ['list', 'avd', '-c'], { env: toolEnv(sdk, jdk) })
  if (exitCode !== 0) return null
  // avdmanager prints a Java warning line on some setups, AVD names never contain spaces
  return output.split('\n').map((l) => l.trim()).filter((l) => l && !/\s/.test(l))
}

export function createAvd(sdk, jdk, name) {
  const avdmanager = sdkTool(sdk, 'avdmanager')
  const skin = hasSkin(sdk) ? ['--skin', AVD_SKIN] : []
  return runFile(avdmanager, ['create', 'avd', '--force', '-n', name, '-k', SYSTEM_IMAGE, '-d', AVD_DEVICE, ...skin], {
    env: toolEnv(sdk, jdk),
    input: 'no\n', // "Do you wish to create a custom hardware profile?"
  })
}

export function adbVersion(sdk) {
  return run('adb --version') || run(`"${join(sdk, 'platform-tools', exe('adb'))}" --version`)
}
