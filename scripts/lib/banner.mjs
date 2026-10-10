import { bold } from './ui.mjs'

// The orange of `npm init wdio@latest` with its robot scaled down in braille dots (every character is a 2x4 grid of dots, so the proportions stay right)
const ORANGE = '\x1b[38;2;234;89;6m'
const RESET = '\x1b[0m'

const ROBOT = `
⠀⠀⠀⠀⠀⠀⠀⠀⢸⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⣤⣿⢸⠀⠀⣤⣿⣿⣧⡄⠀⢠⣼⣿⣿⣤⠀⡄⡇⣧⣤⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⢸⣿⣿⢸⠀⠀⣿⣿⣿⣿⡇⠀⢸⣿⣿⣿⣿⢸⡇⡇⣿⣿⡇⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⢻⣿⢸⡄⠀⠛⣿⣿⡟⠃⠀⠘⢻⣿⣿⠛⠀⢠⡇⣿⡟⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⢠⣤⣤⣤⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣤⣤⣤⡄⠀⠀⠀⠀⠀⠀
⠀⠀⠀⣤⣤⣿⣿⣿⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⣿⣿⣿⣤⣤⠀⠀⠀⠀
⠀⣤⣿⠛⠛⣿⣿⣿⣤⣤⢠⣤⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⠛⠛⣿⣤⠀⠀
⣼⡟⠀⣤⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣤⠀⢻⣧⠀
⣿⠀⢠⣿⠛⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⢻⣿⡄⠀⣿⠀
⣿⠀⢸⣿⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⣤⣤⣤⡄⠀⠀⣤⣤⣿⣿⣿⠀⣿⡇⠀⣿⠀
⣿⠀⢸⣿⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡟⠛⠛⣿⣿⣿⠛⠛⣿⣿⣿⠀⣿⡇⠀⣿⠀
⣿⠀⢸⣿⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⣿⡇⠀⣿⠀
⣿⣤⣼⣿⡄⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⢠⣿⣧⣤⣿⠀
⣿⣿⣿⣿⣿⣿⣿⣿⣿⢻⣿⢻⣿⠛⣿⣿⣧⠀⢸⣿⣿⣿⣿⣿⠃⣿⣿⣿⣿⣿⣿⣿⣿⠀
⡟⣿⣿⣿⣧⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣧⣤⣼⣿⣿⣿⣿⣿⣤⣿⣿⣿⣿⣿⣿⣿⢻⠀
⣧⣿⡟⠛⠛⠘⠛⠛⣿⣿⣿⣿⣿⠛⠛⠛⠛⠛⠛⠛⣿⣿⣿⣿⢻⠛⠛⠃⠛⠛⢻⣿⣼⠀
⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⢸⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⣤⣤⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⣼⣤⣤⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⣿⣿⣿⣿⣧⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠛⠛⠛⠛⠛⠛⠛⠛⠀⠀⠀⠀⠀⠀⠀⠛⠛⠛⠛⠛⠛⠛⠛⠀⠀⠀⠀⠀⠀
`

/** The WebdriverIO robot with a title underneath. */
export function printBanner(title) {
  console.log(`${ORANGE}${ROBOT}${RESET}`)
  console.log(`  ${ORANGE}${bold('WebdriverIO')}${RESET}`)
  console.log(`  ${bold(title)}\n`)
}

/** The message at the end of a successful check. */
export function printTeamMessage() {
  console.log(`${bold('Everything is ready!')} We hope you will have a great workshop.`)
  console.log(`\nGrtz from the whole ${ORANGE}WebdriverIO${RESET} team\n`)
}
