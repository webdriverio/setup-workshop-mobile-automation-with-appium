import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, mock, test } from 'node:test'

const extractZip = mock.fn(async () => {})
mock.module('extract-zip', { defaultExport: extractZip })
const { download, extractArchive } = await import('../scripts/lib/download.mjs')

const skipOnWindows = { skip: process.platform === 'win32' && 'uses tar from the shell' }
const payload = Buffer.alloc(3 * 1024 * 1024, 'a')
let server, base, dir

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'workshop-download-'))
  server = createServer((req, res) => {
    if (req.url === '/missing') {
      res.writeHead(404).end()
    } else if (req.url === '/no-length') {
      res.write('chunked body')
      res.end()
    } else {
      res.writeHead(200, { 'content-length': payload.length }).end(payload)
    }
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${server.address().port}`
})
after(() => {
  server.close()
  rmSync(dir, { recursive: true, force: true })
})

test('download saves the file and creates missing folders', async () => {
  const dest = join(dir, 'nested', 'folder', 'file.bin')
  await download(`${base}/file`, dest, 'Downloading test')
  assert.equal(readFileSync(dest).length, payload.length)
})

test('download shows progress in a terminal and cleans the line afterwards', async () => {
  const written = []
  const isTTY = process.stdout.isTTY
  process.stdout.isTTY = true
  mock.method(process.stdout, 'write', (text) => written.push(text) && true)
  try {
    await download(`${base}/file`, join(dir, 'progress.bin'), 'Downloading test')
    await download(`${base}/no-length`, join(dir, 'no-length.bin'), 'Downloading test')
  } finally {
    process.stdout.isTTY = isTTY
    mock.restoreAll()
  }
  assert.ok(written.some((text) => /Downloading test \d+% \(\d+ \/ 3 MB\)/.test(text)))
  assert.equal(readFileSync(join(dir, 'no-length.bin'), 'utf8'), 'chunked body')
})

test('download fails with the HTTP status and the url', async () => {
  await assert.rejects(download(`${base}/missing`, join(dir, 'x.bin'), 'x'), /HTTP 404.*\/missing/)
})

test('extractArchive hands a .zip to extract-zip', async () => {
  await extractArchive(join(dir, 'a.zip'), join(dir, 'zip-out'))
  assert.deepEqual(extractZip.mock.calls[0].arguments, [join(dir, 'a.zip'), { dir: join(dir, 'zip-out') }])
})

test('extractArchive unpacks a .tar.gz', skipOnWindows, async () => {
  const src = join(dir, 'src')
  mkdirSync(src)
  writeFileSync(join(src, 'hello.txt'), 'hi')
  const archive = join(dir, 'a.tar.gz')
  execFileSync('tar', ['-czf', archive, '-C', src, '.'])

  await extractArchive(archive, join(dir, 'tar-out'))
  assert.equal(readFileSync(join(dir, 'tar-out', 'hello.txt'), 'utf8'), 'hi')
})

test('extractArchive explains when an archive is broken', skipOnWindows, async () => {
  const broken = join(dir, 'broken.tar.gz')
  writeFileSync(broken, 'not an archive')
  await assert.rejects(extractArchive(broken, join(dir, 'broken-out')), /Could not extract/)
  assert.ok(existsSync(join(dir, 'broken-out')))
})
