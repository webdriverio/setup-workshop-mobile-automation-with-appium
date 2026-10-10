import { writeFile } from 'node:fs/promises'
import { arch, platform, release } from 'node:os'

/**
 * Everything the check shows is also kept here, so a failed run can be saved as one text file
 * that the attendee sends to the trainer.
 */

const lines = []
const failures = []

export const stripAnsi = (text) => `${text}`.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')

export function record(text = '') {
  lines.push(...stripAnsi(text).split('\n'))
}

/** A failed item: it is listed again in the summary at the end of the check. */
export function recordFailure(text) {
  failures.push(stripAnsi(text))
}

/** Long output (like the Appium log) that only belongs in the report, not on the screen. */
export function recordLog(title, logLines) {
  lines.push('', `--- ${title} ---`, ...logLines.map(stripAnsi))
}

export const failedItems = () => [...failures]

export function resetReport() {
  lines.length = 0
  failures.length = 0
}

export function reportText(now = new Date()) {
  const env = process.env
  return [
    `Workshop check report, ${now.toISOString()}`,
    'This file contains paths on your computer (with your user name) and the output of the check. No passwords or tokens.',
    '',
    `System: ${platform()} ${release()} ${arch()}`,
    `Node.js: ${process.version}`,
    `JAVA_HOME: ${env.JAVA_HOME ?? '(not set)'}`,
    `ANDROID_HOME: ${env.ANDROID_HOME ?? '(not set)'}`,
    `Shell: ${env.SHELL ?? env.ComSpec ?? '(unknown)'}`,
    '',
    '--- Output of the check ---',
    ...lines,
    '',
  ].join('\n')
}

export async function writeReport(file, now) {
  await writeFile(file, reportText(now))
  return file
}
