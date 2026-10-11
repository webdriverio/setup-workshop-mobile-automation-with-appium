/**
 * Point git at the hooks in .githooks (run by `npm install`, via the prepare script).
 * Never fails: outside a git clone, or without git, there is simply nothing to do.
 */

import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

if (existsSync('.git') && existsSync('.githooks')) {
  try {
    execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'ignore' })
  } catch {
    // git is not available, no hooks then
  }
}
