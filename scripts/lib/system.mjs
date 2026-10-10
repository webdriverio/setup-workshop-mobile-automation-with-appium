import { existsSync } from 'node:fs'
import { statfs } from 'node:fs/promises'
import { homedir, totalmem } from 'node:os'

/** Questions about this computer, in one place so they are easy to replace in tests. */

export const fileExists = (path) => existsSync(path)

/** Free space on the disk of the home folder, in bytes. */
export async function freeDiskBytes() {
  const { bavail, bsize } = await statfs(homedir())
  return bavail * bsize
}

export const totalMemoryBytes = () => totalmem()
