import { existsSync } from 'node:fs'
import { IS_MAC, IS_WIN, run } from '../lib/shell.mjs'
import { fail, info, ok, warn } from '../lib/ui.mjs'

const VSCODE_MAC_BIN = '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code'
export const MIN_NODE = 24

/** The general tools of the workshop. Every check prints its result and returns whether it passed. */

export function checkGit() {
  const version = run('git --version')
  if (version) {
    ok(version)
    return true
  }
  fail('git not found')
  if (IS_MAC) {
    info('Run: xcode-select --install')
    info('A dialog will appear, click Install. This takes a few minutes.')
  } else if (IS_WIN) {
    info('Download Git from https://git-scm.com/download/win and run the installer.')
    info('When asked about PATH, choose: "Git from the command line and also from 3rd-party software"')
    info('After installing, open a new terminal and re-run this check.')
  } else {
    info('Run: sudo apt install git       (Debian/Ubuntu)')
    info('     sudo dnf install git       (Fedora/RHEL)')
    info('After installing, open a new terminal and re-run this check.')
  }
  return false
}

export function checkNode() {
  // The check runs on the Node.js of this terminal, so that is the one to look at
  const major = Number(process.versions.node.split('.')[0])
  if (major >= MIN_NODE) {
    ok(`node ${process.version}`)
    return true
  }
  fail(`node ${process.version} is too old, need v${MIN_NODE}`)
  info(`Run: nvm install ${MIN_NODE} && nvm alias default ${MIN_NODE} && nvm use ${MIN_NODE}`)
  info('See docs/nvm-mac.md / docs/nvm-linux.md / docs/nvm-windows.md')
  return false
}

export function checkNpm() {
  const version = run('npm --version')
  if (version) {
    ok(`npm ${version}`)
    return true
  }
  fail('npm not found (it should come bundled with Node.js)')
  return false
}

/** Optional: only a warning, the workshop works without the `code` command. */
export function checkVsCode() {
  const version = run('code --version')
  if (version) {
    ok(`Visual Studio Code ${version.split('\n')[0]}`)
    return true
  }
  warn('The `code` command is not available in your terminal (optional)')
  info('With it you can open the workshop folder from the terminal: code .')
  if (IS_MAC && existsSync(VSCODE_MAC_BIN)) {
    info('VS Code is installed. Run: npm run setup, and choose "Visual Studio Code".')
  } else if (IS_WIN) {
    info('Re-run the VS Code installer and check "Add to PATH", or add the bin folder of VS Code to your PATH.')
  } else {
    info('Install VS Code from https://code.visualstudio.com. In VS Code, run "Shell Command: Install \'code\' command in PATH" from the Command Palette.')
  }
  return true
}
