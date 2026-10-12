import { dry } from '../lib/plan.mjs'
import { IS_WIN, runFile, runFileAsync } from '../lib/shell.mjs'
import { FLAGS, fail, info, ok, yellow } from '../lib/ui.mjs'

const installed = new Map()

/** What the last check or install found, so the closing hint is only text and needs no new check. */
export const knownGlobalTool = (name) => installed.get(name) === true

/**
 * True when the package is installed globally, so its command works from any folder. It does not block, so the
 * spinner of the check keeps counting while npm looks.
 */
export async function hasGlobalTool(name) {
  const { output } = await runFileAsync(IS_WIN ? 'npm.cmd' : 'npm', ['ls', '-g', '--depth=0', '--json', name])
  let found = false
  try {
    found = Boolean(JSON.parse(output).dependencies?.[name])
  } catch {}
  installed.set(name, found)
  return found
}

/**
 * The setup step that installs one of the start-* tools globally. It is the tool the setup is built on, and with it
 * installed people can start their emulators or simulators from any folder, also without internet.
 */
export async function toolStep(name, what) {
  const done = await hasGlobalTool(name)
  return {
    id: `tool-${name}`,
    // Yellow while it is missing, so it stands out from the lines that are fine
    title: done ? `Global ${name} command` : yellow(`Global ${name} command`),
    description: yellow(`Not installed globally yet. The setup installs it with npm install -g, so you can start your ${what} from any folder with one command.`),
    // The module asks "<action> now?" when this is the only missing item
    action: `install ${name} globally`,
    done,
    apply: async () => {
      if (FLAGS.dryRun) {
        dry(`would run npm install -g ${name}`)
        return true
      }
      const { output, exitCode } = runFile(IS_WIN ? 'npm.cmd' : 'npm', ['install', '-g', name])
      if (exitCode === 0) {
        installed.set(name, true)
        ok(`Installed ${name} globally`)
        return true
      }
      // Not needed for the workshop itself: npx does the same, so a failure here does not stop the setup.
      fail(`Installing ${name} globally failed: ${output.split('\n').pop()}`)
      info(`You can still use it without installing: npx ${name}`)
      return true
    },
  }
}
