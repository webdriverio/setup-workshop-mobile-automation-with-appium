import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'

const GiB = 1024 ** 3
const freeDiskBytes = mock.fn()
const totalMemoryBytes = mock.fn()
const canReach = mock.fn()
const proxy = { value: null }
mock.module('../scripts/lib/system.mjs', { namedExports: { freeDiskBytes, totalMemoryBytes } })
mock.module('../scripts/lib/network.mjs', { namedExports: { canReach, proxyUrl: () => proxy.value } })
const { SERVERS, checkDisk, checkMemory, checkNetwork } = await import('../scripts/checks/machine.mjs')

let output
const text = () => output.join('\n')
beforeEach(() => {
  output = []
  mock.method(console, 'log', (line = '') => output.push(line))
  freeDiskBytes.mock.mockImplementation(async () => 100 * GiB)
  totalMemoryBytes.mock.mockImplementation(() => 16 * GiB)
  canReach.mock.mockImplementation(async () => true)
  proxy.value = null
})
afterEach(() => mock.restoreAll())

test('plenty of free disk space passes', async () => {
  assert.equal(await checkDisk(), true)
  assert.match(text(), /100 GB of free disk space/)
})

test('some free disk space passes with a warning', async () => {
  freeDiskBytes.mock.mockImplementation(async () => 15 * GiB)
  assert.equal(await checkDisk(), true)
  assert.match(text(), /15 GB of free disk space, 20 GB or more is comfortable/)
})

test('too little free disk space fails', async () => {
  freeDiskBytes.mock.mockImplementation(async () => 4 * GiB)
  assert.equal(await checkDisk(), false)
  assert.match(text(), /Only 4 GB of free disk space.*at least 10 GB/)
})

test('enough memory passes, little memory only warns', () => {
  assert.equal(checkMemory(), true)
  assert.match(text(), /16 GB of memory/)
  output.length = 0
  totalMemoryBytes.mock.mockImplementation(() => 4 * GiB)
  assert.equal(checkMemory(), true)
  assert.match(text(), /4 GB of memory, 8 GB is the minimum/)
})

test('all servers reachable passes', async () => {
  assert.equal(await checkNetwork(['android', 'ios']), true)
  assert.match(text(), /download servers can be reached/)
  assert.equal(canReach.mock.callCount(), SERVERS.length)
})

test('only the servers of the chosen platforms are tried', async () => {
  canReach.mock.resetCalls()
  await checkNetwork(['ios'])
  const asked = canReach.mock.calls.map((c) => c.arguments[0])
  assert.ok(asked.includes('https://github.com/'))
  assert.ok(!asked.includes('https://dl.google.com/'))
})

test('a server that cannot be reached is a warning, with the proxy advice', async () => {
  canReach.mock.mockImplementation(async (url) => !url.includes('dl.google.com'))
  assert.equal(await checkNetwork(['android']), true)
  assert.match(text(), /Cannot reach dl\.google\.com \(needed for the Android SDK\)/)
  assert.match(text(), /HTTPS_PROXY/)
})

test('with a proxy already set the advice is to ask IT', async () => {
  proxy.value = 'http://proxy:8080'
  canReach.mock.mockImplementation(async () => false)
  assert.equal(await checkNetwork(['android']), true)
  assert.match(text(), /A proxy is set in your environment/)
})
