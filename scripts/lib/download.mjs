import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import extractZip from 'extract-zip'
import { runFile } from './shell.mjs'

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(0)

export async function download(url, dest, label) {
  await mkdir(dirname(dest), { recursive: true })
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok || !res.body) throw new Error(`Download failed (HTTP ${res.status}): ${url}`)

  const total = Number(res.headers.get('content-length')) || 0
  const body = Readable.fromWeb(res.body)
  let received = 0
  let lastPercent = -1

  body.on('data', (chunk) => {
    received += chunk.length
    if (!total || !process.stdout.isTTY) return
    const percent = Math.floor((received / total) * 100)
    if (percent === lastPercent) return
    lastPercent = percent
    process.stdout.write(`\r     ${label} ${percent}% (${mb(received)} / ${mb(total)} MB)   `)
  })

  await pipeline(body, createWriteStream(dest))
  if (process.stdout.isTTY) process.stdout.write(`\r${' '.repeat(70)}\r`)
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
