import { record, recordFailure } from './report.mjs'
import { dim, green, red } from './ui.mjs'

const PLAIN = { busy: '…', ok: '✔', fail: '✘' }
const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

/**
 * One line per task, updated in place while the tasks run side by side: [Android] Starting the emulator...
 * In a terminal the lines are rewritten with a spinner. Without a terminal (a pipe, a log file) a line is
 * printed only when its text changes, because rewriting is not possible there.
 */
export function createProgress(names, { stream = process.stdout, interactive = Boolean(stream.isTTY), interval = 100 } = {}) {
  const lines = new Map(names.map((name) => [name, { text: 'Waiting...', state: 'busy' }]))
  let frame = 0
  let drawn = false
  // The rows of text printed below the task lines, which the cursor has to get past to reach the task lines
  let below = 0

  const render = (name, { text, state }) => {
    // A line that wraps would take two rows and break the cursor movement, so it must fit the terminal
    const room = (stream.columns ?? 80) - 6
    const full = `[${name}] ${text}`
    const label = full.length > room ? `${full.slice(0, room - 1)}…` : full
    if (state === 'ok') return `  ${green('✔')}  ${label}`
    if (state === 'fail') return `  ${red('✘')}  ${label}`
    return `  ${dim(FRAMES[frame % FRAMES.length])}  ${dim(label)}`
  }

  const draw = () => {
    if (drawn) stream.write(`\x1b[${lines.size + below}A`)
    for (const [name, line] of lines) stream.write(`\r\x1b[2K${render(name, line)}\n`)
    if (below > 0) stream.write(`\x1b[${below}B`)
    drawn = true
  }

  const set = (name, text, state) => {
    const previous = lines.get(name)
    lines.set(name, { text, state })
    if (interactive) draw()
    else if (previous.text !== text) stream.write(`  ${PLAIN[state]}  [${name}] ${text}\n`)
  }

  const timer = interactive
    ? setInterval(() => {
        frame++
        draw()
      }, interval)
    : null
  timer?.unref()
  if (interactive) draw()

  return {
    /** Print a line below the task lines, which keep running above it. A line that wraps takes more than one row. */
    print: (text = '') => {
      stream.write(`${text}\n`)
      if (interactive) below += Math.max(1, Math.ceil(text.replace(/\x1b\[[0-9;]*m/g, '').length / (stream.columns ?? 80)))
    },
    update: (name, text) => set(name, text, 'busy'),
    done: (name, passed, text) => {
      set(name, text, passed ? 'ok' : 'fail')
      record(`  ${PLAIN[passed ? 'ok' : 'fail']}  [${name}] ${text}`)
      if (!passed) recordFailure(`[${name}] ${text}`)
    },
    stop: () => {
      clearInterval(timer)
    },
  }
}
