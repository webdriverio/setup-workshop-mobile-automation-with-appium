import { execSync, spawnSync } from 'node:child_process'
import { platform } from 'node:os'

export const IS_MAC = platform() === 'darwin'
export const IS_WIN = platform() === 'win32'

export function run(cmd, env = process.env) {
  try {
    return execSync(cmd, { stdio: 'pipe', encoding: 'utf8', env }).trim()
  } catch {
    return null
  }
}

/**
 * Run an executable with arguments (no shell quoting issues for paths with spaces).
 * On Windows the SDK tools are .bat files, so they need a shell.
 */
export function runFile(file, args = [], { env = process.env, input, inherit = false, timeout } = {}) {
  const result = spawnSync(IS_WIN ? `"${file}"` : file, args, {
    encoding: 'utf8',
    env,
    input,
    timeout,
    shell: IS_WIN,
    stdio: inherit ? ['pipe', 'inherit', 'inherit'] : 'pipe',
  })
  const output = ((result.stdout || '') + (result.stderr || '')).trim()
  return { output, exitCode: result.status ?? 1 }
}
