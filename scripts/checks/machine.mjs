import { canReach, proxyUrl } from '../lib/network.mjs'
import { freeDiskBytes, totalMemoryBytes } from '../lib/system.mjs'
import { info, ok, warn, fail } from '../lib/ui.mjs'

/** The machine itself. Only a lack of disk space stops us, the rest are warnings: the workshop may still work. */

const GiB = 1024 ** 3
export const DISK_MIN = 10 * GiB
export const DISK_WARN = 20 * GiB
// A laptop sold as "8 GB" reports a bit less
export const MEMORY_WARN = 7 * GiB

export async function checkDisk() {
  const free = await freeDiskBytes()
  const gb = (free / GiB).toFixed(0)
  if (free < DISK_MIN) {
    fail(`Only ${gb} GB of free disk space, the workshop needs at least ${DISK_MIN / GiB} GB (${DISK_WARN / GiB} GB or more is comfortable)`)
    info('Free up some space, the emulators, Android SDK and Xcode simulators are big.')
    return false
  }
  if (free < DISK_WARN) {
    warn(`${gb} GB of free disk space, ${DISK_WARN / GiB} GB or more is comfortable`)
    return true
  }
  ok(`${gb} GB of free disk space`)
  return true
}

export function checkMemory() {
  const memory = totalMemoryBytes()
  const gb = (memory / GiB).toFixed(0)
  if (memory < MEMORY_WARN) {
    warn(`${gb} GB of memory, 8 GB is the minimum and 16 GB is better: running two emulators may be slow`)
  } else {
    ok(`${gb} GB of memory`)
  }
  return true
}

/** The servers the setup downloads from. `for` says which platforms need them. */
export const SERVERS = [
  { url: 'https://registry.npmjs.org/', name: 'registry.npmjs.org', needed: 'the npm packages', platforms: ['android', 'ios'] },
  { url: 'https://github.com/', name: 'github.com', needed: 'the demo apps', platforms: ['android', 'ios'] },
  { url: 'https://objects.githubusercontent.com/', name: 'objects.githubusercontent.com', needed: 'the demo apps', platforms: ['android', 'ios'] },
  { url: 'https://dl.google.com/', name: 'dl.google.com', needed: 'the Android SDK', platforms: ['android'] },
  { url: 'https://android.googlesource.com/', name: 'android.googlesource.com', needed: 'the emulator skin', platforms: ['android'] },
  { url: 'https://api.adoptium.net/', name: 'api.adoptium.net', needed: 'Java', platforms: ['android'] },
]

export async function checkNetwork(platforms) {
  const servers = SERVERS.filter((server) => server.platforms.some((p) => platforms.includes(p)))
  const reachable = await Promise.all(servers.map((server) => canReach(server.url)))
  const blocked = servers.filter((server, i) => !reachable[i])
  if (blocked.length === 0) {
    ok('The download servers can be reached')
    return true
  }
  for (const server of blocked) warn(`Cannot reach ${server.name} (needed for ${server.needed})`)
  if (proxyUrl()) {
    info('A proxy is set in your environment, but these servers still do not answer. Ask your IT department to allow them.')
  } else {
    info('Behind a company proxy? Set HTTPS_PROXY (for example: export HTTPS_PROXY=http://proxy.company.com:8080) and run this again.')
    info('Or ask your IT department to allow these servers, or use a network without a firewall.')
  }
  return true
}
