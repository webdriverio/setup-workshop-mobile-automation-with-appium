import { confirm } from '@inquirer/prompts'
import { record, recordFailure } from './report.mjs'

const RESET  = '\x1b[0m'
const BOLD   = '\x1b[1m'
const GREEN  = '\x1b[32m'
const RED    = '\x1b[31m'
const YELLOW = '\x1b[33m'
const CYAN   = '\x1b[36m'
const DIM    = '\x1b[2m'

/** Print a line and keep it for the report. */
export function say(msg = '') {
  console.log(msg)
  record(msg)
}

export const ok     = (msg) => say(`  ${GREEN}✔${RESET}  ${msg}`)
export const fail   = (msg) => {
  say(`  ${RED}✘${RESET}  ${msg}`)
  recordFailure(msg)
}
export const warn   = (msg) => say(`  ${YELLOW}⚠${RESET}  ${msg}`)
export const todo   = (msg) => say(`  ${YELLOW}○${RESET}  ${msg}`)
export const info   = (msg) => say(`     ${DIM}${msg}${RESET}`)
export const header = (msg) => say(`\n${BOLD}${CYAN}${msg}${RESET}`)
export const bold   = (msg) => `${BOLD}${msg}${RESET}`
export const green  = (msg) => `${GREEN}${msg}${RESET}`
export const red    = (msg) => `${RED}${msg}${RESET}`
export const yellow = (msg) => `${YELLOW}${msg}${RESET}`
export const dim    = (msg) => `${DIM}${msg}${RESET}`

export const FLAGS = {
  yes: process.argv.includes('--yes') || !process.stdin.isTTY,
  dryRun: process.argv.includes('--dry-run'),
}

/** Ask a yes/no question. With --yes (or no TTY) the default answer is taken. */
export async function ask(message, defaultValue = true) {
  if (FLAGS.yes) return defaultValue
  return confirm({ message, default: defaultValue })
}
