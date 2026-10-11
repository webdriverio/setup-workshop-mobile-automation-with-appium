import { applyToProcess, persistEnv } from 'start-android-emulator'
import { dry, runPlan } from '../lib/plan.mjs'
import { run } from '../lib/shell.mjs'
import { fileExists } from '../lib/system.mjs'
import { FLAGS, fail, header, info, ok, warn } from '../lib/ui.mjs'

// macOS only: the VS Code installer does not add the `code` command there. On Windows and Linux it comes with the installer.
export const VSCODE_MAC_BIN = '/Applications/Visual Studio Code.app/Contents/Resources/app/bin'

/** True when VS Code is installed but the `code` command is not available yet. */
export const needsCodeCommand = () => fileExists(VSCODE_MAC_BIN) && !run('code --version')

export function planVscode() {
  return [
    {
      title: 'The `code` command of Visual Studio Code',
      description: 'Lets you open the workshop folder from the terminal with `code .` Optional, but handy. We add it to your PATH.',
      done: !needsCodeCommand(),
      apply: () => codeCommandStep(),
    },
  ]
}

async function codeCommandStep() {
  if (FLAGS.dryRun) {
    dry(`would add ${VSCODE_MAC_BIN} to your PATH`)
    return true
  }
  try {
    const where = persistEnv({ paths: [VSCODE_MAC_BIN], block: 'appium workshop setup vscode' })
    applyToProcess({ paths: [VSCODE_MAC_BIN] })
    ok(`Saved to ${where}`)
    warn('Open a new terminal for this to take effect.')
    return true
  } catch (e) {
    fail(`Could not save the PATH: ${e.message}`)
    info(`Add this line to your shell profile yourself: export PATH="$PATH:${VSCODE_MAC_BIN}"`)
    return false
  }
}

export async function setupVscode() {
  header('Visual Studio Code')
  return runPlan('Visual Studio Code', planVscode(), () => {})
}
