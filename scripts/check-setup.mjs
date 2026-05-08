#!/usr/bin/env node

/**
 * Workshop environment health check
 *
 * Run with:  node scripts/check-setup.mjs
 * Or:        npm run check   (from the repo root)
 */

import { execSync, spawnSync } from 'node:child_process'
import { existsSync, appendFileSync } from 'node:fs'
import { platform, homedir } from 'node:os'
import { join } from 'node:path'
import { createInterface } from 'node:readline/promises'

const IS_MAC = platform() === 'darwin'
const IS_WIN = platform() === 'win32'

// ─── helpers ────────────────────────────────────────────────────────────────

const RESET  = '\x1b[0m'
const BOLD   = '\x1b[1m'
const GREEN  = '\x1b[32m'
const RED    = '\x1b[31m'
const YELLOW = '\x1b[33m'
const CYAN   = '\x1b[36m'
const DIM    = '\x1b[2m'
const ok     = (msg) => console.log(`  ${GREEN}✔${RESET}  ${msg}`)
const fail   = (msg) => console.log(`  ${RED}✘${RESET}  ${msg}`)
const warn   = (msg) => console.log(`  ${YELLOW}⚠${RESET}  ${msg}`)
const info   = (msg) => console.log(`     ${DIM}${msg}${RESET}`)
const header = (msg) => console.log(`\n${BOLD}${CYAN}${msg}${RESET}`)

function run(cmd) {
  try {
    return execSync(cmd, { stdio: 'pipe', encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

function checkCommand(cmd, args = '--version') {
  return run(`${cmd} ${args}`)
}

function runCapture(cmd, timeout = 120000) {
  const shell = IS_WIN ? 'cmd.exe' : 'sh'
  const shellArgs = IS_WIN ? ['/c', cmd] : ['-c', cmd]
  const result = spawnSync(shell, shellArgs, { encoding: 'utf8', timeout })
  const output = ((result.stdout || '') + (result.stderr || '')).trim()
  return { output, exitCode: result.status ?? 1 }
}

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '')
}

async function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(`     ${DIM}${question}${RESET} `)
  rl.close()
  return answer.trim().toLowerCase()
}

// ─── checks ─────────────────────────────────────────────────────────────────

let hasErrors = false

async function check(label, fn) {
  try {
    await fn()
  } catch (e) {
    fail(`${label}: unexpected error, ${e.message}`)
    hasErrors = true
  }
}

// ── Git ──────────────────────────────────────────────────────────────────────

header('Git')
await check('git', () => {
  const version = checkCommand('git')
  if (version) {
    ok(version)
    return
  }

  fail('git not found')
  hasErrors = true

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
})

// ── Node.js ───────────────────────────────────────────────────────────────────

header('Node.js')
await check('Node.js', () => {
  const version = checkCommand('node')
  if (!version) {
    fail('node not found')
    hasErrors = true
    info('Install NVM first, then run: nvm install --lts')
    info('See docs/nvm-mac.md / docs/nvm-linux.md / docs/nvm-windows.md')
    return
  }

  const match = version.match(/v(\d+)/)
  const major = match ? parseInt(match[1], 10) : 0

  if (major >= 20) {
    ok(`node ${version}`)
  } else {
    fail(`node ${version} is too old, need v20 or later (even versions only: 22, 24, ...)`)
    hasErrors = true
    info('Run: nvm install --lts && nvm use --lts')
  }
})

await check('npm', () => {
  const version = checkCommand('npm')
  if (version) {
    ok(`npm ${version}`)
  } else {
    fail('npm not found (it should come bundled with Node.js)')
    hasErrors = true
  }
})

// ── Visual Studio Code ────────────────────────────────────────────────────────

const VSCODE_MAC_BIN   = '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code'
const VSCODE_MAC_LINK  = '/usr/local/bin/code'
const VSCODE_WIN_BIN   = join(process.env.LOCALAPPDATA || homedir(), 'Programs', 'Microsoft VS Code', 'bin')
const VSCODE_LINUX_CANDIDATES = ['/usr/bin/code', '/snap/bin/code', '/usr/share/code/bin/code']

header('Visual Studio Code')
await check('code CLI', async () => {
  const version = checkCommand('code')
  if (version) {
    ok(`Visual Studio Code ${version.split('\n')[0]}`)
    return
  }

  warn('code command not found in PATH')
  info('')
  info('Having `code` in your PATH lets you:')
  info('  Open the workshop folder in VS Code:   code .')
  info('  Open a specific file:                  code wdio.conf.ts')
  info('  Install extensions from the terminal:  code --install-extension ...')
  info('')

  if (IS_MAC) {
    if (existsSync(VSCODE_MAC_BIN)) {
      if (process.stdin.isTTY) {
        const answer = await ask('Fix it now by creating a symlink at /usr/local/bin/code? [y/N]:')
        if (answer === 'y' || answer === 'yes') {
          try {
            execSync(`ln -sf "${VSCODE_MAC_BIN}" "${VSCODE_MAC_LINK}"`)
            ok('Symlink created. Open a new terminal and run `code --version` to verify.')
          } catch {
            warn('Could not create symlink automatically.')
            info(`Try manually: sudo ln -sf "${VSCODE_MAC_BIN}" "${VSCODE_MAC_LINK}"`)
          }
        }
      } else {
        info('VS Code is installed but the `code` command is not linked.')
        info(`Fix: ln -sf "${VSCODE_MAC_BIN}" "${VSCODE_MAC_LINK}"`)
      }
    } else {
      info('VS Code does not seem to be installed in /Applications.')
      info('Download from https://code.visualstudio.com, then re-run this check.')
    }
  } else if (IS_WIN) {
    if (existsSync(join(VSCODE_WIN_BIN, 'code.cmd'))) {
      info('VS Code is installed but not in your PATH. To fix it:')
      info('  1. Open: Settings → System → About → Advanced system settings → Environment Variables')
      info('  2. Under "User variables", find "Path" and click Edit')
      info('  3. Click "New" and add:')
      info(`     ${VSCODE_WIN_BIN}`)
      info('  4. Click OK on all dialogs, then open a new terminal')
    } else {
      info('VS Code does not seem to be installed.')
      info('Download from https://code.visualstudio.com and run the installer.')
      info('During install, make sure "Add to PATH" is checked.')
    }
  } else {
    const found = VSCODE_LINUX_CANDIDATES.find(existsSync)
    if (found) {
      if (process.stdin.isTTY) {
        const answer = await ask(`VS Code found at ${found}. Create symlink at /usr/local/bin/code? [y/N]:`)
        if (answer === 'y' || answer === 'yes') {
          try {
            execSync(`ln -sf "${found}" /usr/local/bin/code`)
            ok('Symlink created. Open a new terminal and run `code --version` to verify.')
          } catch {
            warn('Could not create symlink automatically.')
            info(`Try manually: sudo ln -sf "${found}" /usr/local/bin/code`)
          }
        }
      } else {
        info(`VS Code found at ${found} but not in PATH.`)
        info(`Fix: sudo ln -sf "${found}" /usr/local/bin/code`)
      }
    } else {
      info('VS Code does not seem to be installed.')
      info('Download from https://code.visualstudio.com')
    }
  }
})

// ── Android ───────────────────────────────────────────────────────────────────

function detectSdkPath() {
  const home = homedir()
  const candidates = IS_MAC
    ? [join(home, 'Library', 'Android', 'sdk')]
    : IS_WIN
      ? [join(process.env.LOCALAPPDATA || home, 'Android', 'Sdk')]
      : [join(home, 'Android', 'Sdk'), join(home, 'android', 'sdk')]
  return candidates.find((p) => existsSync(join(p, 'platform-tools'))) || null
}

function applyAndroidEnv(sdkPath) {
  process.env.ANDROID_HOME = sdkPath
  const sep = IS_WIN ? ';' : ':'
  process.env.PATH = [
    process.env.PATH,
    join(sdkPath, 'platform-tools'),
    join(sdkPath, 'emulator'),
  ].join(sep)
}

async function fixAndroidEnv(sdkPath) {
  if (IS_WIN) {
    // Set ANDROID_HOME and append to PATH in the user's environment via PowerShell
    const psCmd = [
      `[Environment]::SetEnvironmentVariable('ANDROID_HOME', '${sdkPath}', 'User')`,
      `$p = [Environment]::GetEnvironmentVariable('PATH', 'User')`,
      `if ($p -notlike '*platform-tools*') {`,
      `  [Environment]::SetEnvironmentVariable('PATH', "$p;${join(sdkPath, 'platform-tools')};${join(sdkPath, 'emulator')}", 'User')`,
      `}`,
    ].join('; ')

    try {
      execSync(`powershell -NoProfile -Command "${psCmd}"`, { stdio: 'pipe' })
      applyAndroidEnv(sdkPath)
      ok(`ANDROID_HOME set to ${sdkPath}`)
      ok('platform-tools and emulator added to PATH')
      warn('Open a new terminal for these changes to take effect.')
    } catch (e) {
      fail('Could not set environment variables automatically.')
      info(`Error: ${e.message}`)
      showAndroidManualInstructions(sdkPath)
    }
  } else {
    // macOS / Linux: write to shell profile
    const profile = IS_MAC
      ? join(homedir(), '.zshrc')
      : join(homedir(), '.bashrc')

    const lines = [
      '',
      '# Android SDK (added by workshop setup check)',
      `export ANDROID_HOME="${sdkPath}"`,
      'export PATH=$PATH:$ANDROID_HOME/platform-tools',
      'export PATH=$PATH:$ANDROID_HOME/emulator',
    ].join('\n') + '\n'

    try {
      appendFileSync(profile, lines)
      applyAndroidEnv(sdkPath)
      ok(`ANDROID_HOME set to ${sdkPath}`)
      ok(`platform-tools and emulator added to PATH`)
      ok(`Written to ${profile}`)
      warn('Open a new terminal for these changes to take effect in future sessions.')
    } catch (e) {
      fail('Could not write to shell profile automatically.')
      info(`Error: ${e.message}`)
      showAndroidManualInstructions(sdkPath)
    }
  }
}

function showAndroidManualInstructions(sdkPath) {
  if (IS_WIN) {
    info('Set these manually via System Properties → Environment Variables:')
    info(`  ANDROID_HOME = ${sdkPath}`)
    info(`  Add to PATH:  ${join(sdkPath, 'platform-tools')}`)
    info(`                ${join(sdkPath, 'emulator')}`)
  } else {
    const profile = IS_MAC ? '~/.zshrc' : '~/.bashrc'
    info(`Add these lines to ${profile}:`)
    info(`  export ANDROID_HOME="${sdkPath}"`)
    info('  export PATH=$PATH:$ANDROID_HOME/platform-tools')
    info('  export PATH=$PATH:$ANDROID_HOME/emulator')
    info(`Then run: source ${profile}`)
  }
}

header('Android')
await check('ANDROID_HOME', async () => {
  let home = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT

  if (home) {
    ok(`ANDROID_HOME = ${home}`)
    return
  }

  // ANDROID_HOME not set, try to detect it
  const detected = detectSdkPath()

  if (!detected) {
    fail('ANDROID_HOME is not set and the Android SDK could not be found in the default location')
    hasErrors = true
    info('Make sure Android Studio is installed and has downloaded the SDK.')
    info('See docs/android-studio.md for setup instructions.')
    return
  }

  warn(`ANDROID_HOME is not set, but the SDK was found at: ${detected}`)

  if (process.stdin.isTTY) {
    const answer = await ask('Fix it now by setting ANDROID_HOME and updating your PATH? [y/N]:')
    if (answer === 'y' || answer === 'yes') {
      await fixAndroidEnv(detected)
    } else {
      showAndroidManualInstructions(detected)
      hasErrors = true
    }
  } else {
    showAndroidManualInstructions(detected)
    hasErrors = true
  }
})

await check('adb', async () => {
  const version = run('adb --version')
  if (version) {
    ok(`adb, ${version.split('\n')[0]}`)
    return
  }

  // adb not in PATH, maybe ANDROID_HOME was just set in this run, try directly
  const home = process.env.ANDROID_HOME
  if (home) {
    const adbPath = join(home, 'platform-tools', IS_WIN ? 'adb.exe' : 'adb')
    if (existsSync(adbPath)) {
      const version2 = run(`"${adbPath}" --version`)
      if (version2) {
        ok(`adb, ${version2.split('\n')[0]}`)
        warn('adb is not in your PATH yet. Open a new terminal after this check.')
        return
      }
    }
  }

  fail('adb not found')
  hasErrors = true
  info('platform-tools is not in your PATH.')
  if (home) {
    info(`Expected location: ${join(home, 'platform-tools')}`)
  }
  info('Re-run this check after opening a new terminal, or follow docs/android-studio.md')
})

await check('Android emulator', async () => {
  const result = run('emulator -list-avds')

  if (result === null) {
    // emulator not in PATH, try directly
    const home = process.env.ANDROID_HOME
    const emulatorPath = home
      ? join(home, 'emulator', IS_WIN ? 'emulator.exe' : 'emulator')
      : null

    if (emulatorPath && existsSync(emulatorPath)) {
      const result2 = run(`"${emulatorPath}" -list-avds`)
      if (result2 !== null) {
        const avds = result2.split('\n').filter(Boolean)
        if (avds.length === 0) {
          fail('No Android Virtual Devices (AVDs) found')
          hasErrors = true
          info('Create one in Android Studio → Device Manager')
          info('See docs/android-studio.md → "Create an Android Virtual Device"')
        } else {
          ok('Android emulator found. Available AVDs:')
          avds.forEach((avd) => info(avd))
          warn('emulator is not in your PATH yet. Open a new terminal after this check.')
        }
        return
      }
    }

    fail('emulator binary not found')
    hasErrors = true
    info('emulator is not in your PATH.')
    if (home) {
      info(`Expected location: ${join(home, 'emulator')}`)
    }
    info('Re-run this check after opening a new terminal, or follow docs/android-studio.md')
    return
  }

  const avds = result.split('\n').filter(Boolean)
  if (avds.length === 0) {
    fail('No Android Virtual Devices (AVDs) found')
    hasErrors = true
    info('Create one in Android Studio → Device Manager')
    info('See docs/android-studio.md → "Create an Android Virtual Device"')
  } else {
    ok('Android emulator found. Available AVDs:')
    avds.forEach((avd) => info(avd))
  }
})

await check('running devices', () => {
  const devices = run('adb devices')
  if (!devices) return
  const lines = devices.split('\n').slice(1).filter((l) => l.trim() && !l.startsWith('*'))
  if (lines.length > 0) {
    ok('Device(s) connected:')
    lines.forEach((l) => info(l.trim()))
  } else {
    warn('No running Android devices or emulators (fine before the workshop)')
  }
})

// ── Java ──────────────────────────────────────────────────────────────────────

function detectAndroidStudioPath() {
  const candidates = IS_MAC
    ? ['/Applications/Android Studio.app']
    : IS_WIN
      ? [
          join(process.env['ProgramFiles'] || 'C:\\Program Files', 'Android', 'Android Studio'),
          join(process.env.LOCALAPPDATA || homedir(), 'Programs', 'Android Studio'),
        ]
      : [
          '/opt/android-studio',
          join(homedir(), 'android-studio'),
          '/snap/android-studio/current',
        ]
  return candidates.find(existsSync) || null
}

function detectJavaHome() {
  // Derive JBR from the Android Studio installation, it's always present if Studio is installed
  const studioPath = detectAndroidStudioPath()
  if (studioPath) {
    const jbrPath = IS_MAC
      ? join(studioPath, 'Contents', 'jbr', 'Contents', 'Home')
      : join(studioPath, 'jbr')
    if (existsSync(join(jbrPath, 'bin', IS_WIN ? 'java.exe' : 'java'))) return jbrPath
  }

  // macOS system Java
  if (IS_MAC) {
    const detected = run('/usr/libexec/java_home 2>/dev/null')
    if (detected && existsSync(join(detected, 'bin', 'java'))) return detected
  }

  // Linux common locations
  if (!IS_WIN && !IS_MAC) {
    const candidates = [
      '/usr/lib/jvm/java-17-openjdk-amd64',
      '/usr/lib/jvm/java-17-openjdk',
      '/usr/lib/jvm/java-21-openjdk-amd64',
      '/usr/lib/jvm/java-21-openjdk',
      '/usr/lib/jvm/temurin-17',
    ]
    for (const p of candidates) {
      if (existsSync(join(p, 'bin', 'java'))) return p
    }
  }

  return null
}

function showJavaManualInstructions(javaHome) {
  if (IS_WIN) {
    info('Set JAVA_HOME manually via System Properties → Environment Variables:')
    info(`  Variable name:  JAVA_HOME`)
    info(`  Variable value: ${javaHome}`)
  } else {
    const profile = IS_MAC ? '~/.zshrc' : '~/.bashrc'
    info(`Add this line to ${profile}:`)
    info(`  export JAVA_HOME="${javaHome}"`)
    info(`Then run: source ${profile}`)
  }
}

async function fixJavaEnv(javaHome) {
  if (IS_WIN) {
    const psCmd = `[Environment]::SetEnvironmentVariable('JAVA_HOME', '${javaHome}', 'User')`
    try {
      execSync(`powershell -NoProfile -Command "${psCmd}"`, { stdio: 'pipe' })
      process.env.JAVA_HOME = javaHome
      ok(`JAVA_HOME set to ${javaHome}`)
      warn('Open a new terminal for these changes to take effect.')
    } catch (e) {
      fail('Could not set JAVA_HOME automatically.')
      info(`Error: ${e.message}`)
      showJavaManualInstructions(javaHome)
    }
  } else {
    const profile = IS_MAC ? join(homedir(), '.zshrc') : join(homedir(), '.bashrc')
    const lines = [
      '',
      '# Java (added by workshop setup check)',
      `export JAVA_HOME="${javaHome}"`,
    ].join('\n') + '\n'

    try {
      appendFileSync(profile, lines)
      process.env.JAVA_HOME = javaHome
      ok(`JAVA_HOME set to ${javaHome}`)
      ok(`Written to ${profile}`)
      warn('Open a new terminal for these changes to take effect in future sessions.')
    } catch (e) {
      fail('Could not write to shell profile automatically.')
      info(`Error: ${e.message}`)
      showJavaManualInstructions(javaHome)
    }
  }
}

header('Java')
await check('JAVA_HOME', async () => {
  const home = process.env.JAVA_HOME
  if (home && existsSync(join(home, 'bin', IS_WIN ? 'java.exe' : 'java'))) {
    ok(`JAVA_HOME = ${home}`)
    return
  }

  if (home) {
    warn(`JAVA_HOME is set to "${home}" but no java binary was found there`)
  }

  const detected = detectJavaHome()

  if (!detected) {
    fail('JAVA_HOME is not set and Java could not be found automatically')
    hasErrors = true
    info('Appium needs Java. The easiest source is Android Studio\'s bundled JDK.')
    info('In Android Studio: Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK')
    info('Or install Java from https://adoptium.net')
    return
  }

  warn(`JAVA_HOME is not set, but Java was found at: ${detected}`)

  if (process.stdin.isTTY) {
    const answer = await ask('Fix it now by setting JAVA_HOME? [y/N]:')
    if (answer === 'y' || answer === 'yes') {
      await fixJavaEnv(detected)
    } else {
      showJavaManualInstructions(detected)
      hasErrors = true
    }
  } else {
    showJavaManualInstructions(detected)
    hasErrors = true
  }
})

// ── iOS (macOS only) ──────────────────────────────────────────────────────────

if (IS_MAC) {
  header('iOS (macOS only)')

  await check('Xcode', () => {
    const path = run('xcode-select -p')
    if (path) {
      ok(`Xcode, ${path}`)
    } else {
      fail('Xcode Command Line Tools not found')
      hasErrors = true
      info('Run: xcode-select --install')
      info('A dialog will appear, click Install and wait for it to finish.')
    }
  })

  await check('xcodebuild', () => {
    const version = run('xcodebuild -version')
    if (version) {
      ok(`xcodebuild, ${version.split('\n')[0]}`)
    } else {
      fail('xcodebuild not found')
      hasErrors = true
      info('Make sure Xcode is fully installed from the App Store.')
      info('Then run: sudo xcodebuild -license accept && xcodebuild -runFirstLaunch')
    }
  })

  await check('iOS Simulator', () => {
    const sims = run('xcrun simctl list devices booted --json')
    if (!sims) {
      warn('xcrun simctl not available, check your Xcode installation')
      return
    }
    try {
      const data = JSON.parse(sims)
      const booted = Object.values(data.devices).flat().filter((d) => d.state === 'Booted')
      if (booted.length > 0) {
        ok('iOS Simulator is running:')
        booted.forEach((d) => info(`${d.name} (${d.udid})`))
      } else {
        warn('No iOS Simulator currently running (fine before the workshop)')
      }
    } catch {
      warn('Could not read simulator status')
    }
  })
} else {
  header('iOS')
  info('iOS testing requires macOS + Xcode. Skipped on this platform.')
}

// ── Appium driver doctor ──────────────────────────────────────────────────────

function runDoctor(driver) {
  info(`Running appium driver doctor ${driver} (this may take a moment)...`)
  const { output } = runCapture(`npx appium driver doctor ${driver}`)
  const clean = stripAnsi(output)

  // Print every non-empty line from the doctor so the user sees the detail
  clean.split('\n').filter(Boolean).forEach((line) => info(line))

  if (clean.includes('0 required fixes needed')) {
    ok(`appium driver doctor ${driver}: 0 required fixes needed`)
  } else {
    fail(`appium driver doctor ${driver}: required fixes found, see output above`)
    hasErrors = true
  }
}

header('Appium')
await check('uiautomator2 driver doctor', () => runDoctor('uiautomator2'))

if (IS_MAC) {
  await check('xcuitest driver doctor', () => runDoctor('xcuitest'))
}

// ─── summary ─────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(50))

if (hasErrors) {
  console.log(`\n${RED}${BOLD}Setup incomplete.${RESET} Fix the items marked with ${RED}✘${RESET} above.`)
  console.log(`Check the ${CYAN}docs/${RESET} folder for step-by-step instructions.`)
  console.log(`Still stuck? Reach out before the workshop so we can help.\n`)
  process.exit(1)
} else {
  console.log(`\n${GREEN}${BOLD}All checks passed!${RESET} Your machine is ready for the workshop.`)
  console.log('The workshop project has its own Appium setup that we will use on the day.\n')
}
