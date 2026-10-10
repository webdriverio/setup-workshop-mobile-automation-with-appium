import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { arch } from 'node:os'
import { join } from 'node:path'
import { run, runFile } from './shell.mjs'

// The workshop needs two simulators, like on Android. iPhone 17 Pro on the iOS version that ships with the installed Xcode.
export const IPHONE_MODEL = 'iPhone 17 Pro'
export const SIMULATOR_COUNT = 2

const simctl = (args) => runFile('xcrun', ['simctl', ...args])
const simctlJson = (args) => {
  const { output, exitCode } = simctl([...args, '-j'])
  if (exitCode !== 0) return null
  try {
    return JSON.parse(output)
  } catch {
    return null
  }
}

// ─── Xcode ──────────────────────────────────────────────────────────────────

/** Xcode itself (not only the command line tools). Returns null when it is missing. */
export function detectXcode() {
  const version = run('xcodebuild -version')?.match(/Xcode (\S+)/)?.[1]
  if (!version) return null
  return { version, path: run('xcode-select -p') }
}

/** The iOS version the installed Xcode builds for, e.g. "27.0". We install the matching simulator runtime. */
export function simulatorSdkVersion() {
  return run('xcodebuild -version -sdk iphonesimulator ProductVersion')
}

export const licenseAccepted = () => runFile('xcodebuild', ['-license', 'check']).exitCode === 0
export const firstLaunchDone = () => runFile('xcodebuild', ['-checkFirstLaunchStatus']).exitCode === 0

/** These two need an administrator password, so they run in the terminal of the attendee. */
export function acceptLicenseAndInstallComponents() {
  const sudo = (args) => spawnSync('sudo', ['xcodebuild', ...args], { stdio: 'inherit' }).status === 0
  return sudo(['-license', 'accept']) && sudo(['-runFirstLaunch'])
}

// ─── Simulator runtime ──────────────────────────────────────────────────────

export function hasRuntime(version) {
  const runtimes = simctlJson(['list', 'runtimes'])?.runtimes ?? []
  return runtimes.some((r) => r.platform === 'iOS' && r.version === version && r.isAvailable)
}

export const runtimeId = (version) => `com.apple.CoreSimulator.SimRuntime.iOS-${version.replace('.', '-')}`

/** Download the iOS simulator runtime (≈ 8 GB). On Apple Silicon Xcode 27 only finds it when we ask for the arm64 variant. */
export function downloadRuntime() {
  const variant = arch() === 'arm64' ? 'arm64' : 'universal'
  return runFile('xcodebuild', ['-downloadPlatform', 'iOS', '-architectureVariant', variant], { inherit: true }).exitCode === 0
}

/**
 * Xcode 27 can download a runtime that it then fails to register: `simctl runtime list` shows it as "Ready", but its signature
 * check fails (-67054) so `simctl list runtimes` stays empty and no simulator can be created. The download does contain a
 * plain .dmg, and adding that one registers the runtime the old way (it is an APFS clone, so it costs almost no disk space).
 */
export function registerDownloadedRuntime(version) {
  const images = Object.values(simctlJson(['runtime', 'list']) ?? {})
  const stuck = images.find((i) => i.runtimeIdentifier === runtimeId(version) && i.state === 'Ready' && i.signatureState !== 'Verified' && i.path)
  if (!stuck) return false
  const restore = join(stuck.path, 'Restore')
  const dmg = readdirSync(restore).find((f) => f.endsWith('.dmg'))
  if (!dmg) return false
  return simctl(['runtime', 'add', join(restore, dmg)]).exitCode === 0 && hasRuntime(version)
}

// ─── Simulators ─────────────────────────────────────────────────────────────

export const simulatorNames = (version) =>
  Array.from({ length: SIMULATOR_COUNT }, (_, i) => `Workshop_${i + 1}_${IPHONE_MODEL.replaceAll(' ', '_')}_iOS_${version.replace('.', '_')}`)

export function listSimulators() {
  const devices = simctlJson(['list', 'devices'])?.devices ?? {}
  return Object.values(devices).flat().map((d) => d.name)
}

export function createSimulator(name, version) {
  return simctl(['create', name, IPHONE_MODEL, runtimeId(version)])
}
