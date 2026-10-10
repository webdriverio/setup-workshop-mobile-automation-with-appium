import { createWriteStream } from 'node:fs'
import { mkdir, rename, rm, stat } from 'node:fs/promises'
import { dirname } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import extractZip from 'extract-zip'
import { runFile } from './shell.mjs'

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(0)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** An error that retrying will not fix (a wrong url, no permission). */
class FatalDownloadError extends Error {}

/**
 * Download a file. A broken connection does not start over: the part that is already there is kept in `<dest>.part`
 * and the next try asks the server for the rest. The file only gets its real name when it is complete.
 */
export async function download(url, dest, label, { retries = 4, wait = sleep } = {}) {
  await mkdir(dirname(dest), { recursive: true })
  const part = `${dest}.part`

  for (let attempt = 0; ; attempt++) {
    try {
      await fetchInto(url, part, label)
      break
    } catch (error) {
      if (error instanceof FatalDownloadError || attempt >= retries) throw error
      clearLine()
      console.log(`     ${label}: the connection was lost (${error.cause?.code ?? error.message}), trying again and continuing where it stopped...`)
      await wait(2000 * (attempt + 1))
    }
  }
  await rename(part, dest)
  clearLine()
}

const clearLine = () => process.stdout.isTTY && process.stdout.write(`\r${' '.repeat(70)}\r`)

async function fetchInto(url, part, label) {
  const existing = await stat(part).then((s) => s.size, () => 0)
  const res = await fetch(url, { redirect: 'follow', headers: existing > 0 ? { range: `bytes=${existing}-` } : {} })

  if (res.status === 416) {
    // We asked for a part the server does not have: what we have is not usable, start again
    await rm(part, { force: true })
    throw new Error('the partial download could not be continued')
  }
  if (!res.ok || !res.body) {
    const message = `Download failed (HTTP ${res.status}): ${url}`
    throw res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429 ? new FatalDownloadError(message) : new Error(message)
  }

  // 206 = the server continues where we stopped, 200 = it sends everything again
  const resumed = res.status === 206 && existing > 0
  const offset = resumed ? existing : 0
  const length = Number(res.headers.get('content-length')) || 0
  const total = length ? offset + length : 0
  const body = Readable.fromWeb(res.body)
  let received = offset
  let lastPercent = -1

  body.on('data', (chunk) => {
    received += chunk.length
    if (!total || !process.stdout.isTTY) return
    const percent = Math.floor((received / total) * 100)
    if (percent === lastPercent) return
    lastPercent = percent
    process.stdout.write(`\r     ${label} ${percent}% (${mb(received)} / ${mb(total)} MB)   `)
  })

  await pipeline(body, createWriteStream(part, { flags: resumed ? 'a' : 'w' }))
  if (total && received !== total) throw new Error(`only ${mb(received)} of ${mb(total)} MB arrived`)
}

/** .zip via extract-zip (keeps file permissions), .tar.gz via the system tar (present on macOS, Linux and Windows 10+). */
export async function extractArchive(file, destDir) {
  await mkdir(destDir, { recursive: true })
  if (file.endsWith('.zip')) {
    await extractZip(file, { dir: destDir })
    return
  }
  const { output, exitCode } = runFile('tar', ['-xzf', file, '-C', destDir])
  if (exitCode !== 0) throw new Error(`Could not extract ${file}: ${output}`)
}
