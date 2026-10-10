# Workshop Setup, Making Sense of Mobile Automation with Appium and WebdriverIO

Before the workshop starts, make sure your machine is set up correctly. Depending on your download speed this takes **30-60 minutes**, so do this **before you arrive**.

> [!IMPORTANT]
> The workshop is packed and we don't have time to troubleshoot installation issues on the day itself. Please make sure everything is set up and the check script passes **before you arrive**. If you get stuck, reach out in advance so we can help.

> [!NOTE]
> This setup repository has its own copy of Appium and the drivers, only to test that your machine works. The workshop project itself, with its own dependencies, is something we set up together during the workshop.

---

## How it works

You install **Node.js** yourself. After that, two commands do the rest:

```bash
npm run setup   # installs and configures what is missing (Android, iOS)
npm run check   # proves it works by running a small test on your emulator/simulator
```

Both are safe to run as often as you like. Run `npm run setup` again after fixing something and it continues where it left off.

`npm run setup` checks which platforms your machine supports and only shows those. Android works on macOS, Windows and Linux. iOS needs macOS and Xcode, so on Windows or Linux you won't see iOS in the list, and that is expected.

---

## Requirements

### Your computer

> [!IMPORTANT]
> **You need administrator rights on your machine.** The setup installs software and changes system settings, and without admin rights we can't do anything. A locked-down company laptop usually won't work. If you're not sure, ask your IT department, or bring a personal laptop.

The workshop runs **two Android emulators** at the same time, so your computer needs some room:

| | Minimum | Recommended |
|---|---|---|
| **Memory (RAM)** | 8 GB | 16 GB |
| **Free disk space** | 20 GB | 30 GB |
| **CPU** | 4 cores | 8 cores |

Each emulator uses 2 GB of memory and 4 CPU cores while it runs, and up to 6 GB of disk space on top of the Android tools (about 6 GB). On macOS, Xcode and the iOS simulator need a lot more disk space (Xcode alone is ≈ 15 GB).

The emulators also need hardware acceleration, otherwise they are far too slow to use. Check the one for your system:

<details>
<summary><strong>macOS</strong></summary>

Nothing to enable. Both Apple Silicon (M1 and newer) and Intel Macs work, the setup downloads the emulator image that matches your Mac.

</details>

<details>
<summary><strong>Windows</strong></summary>

Virtualization must be on, and **Windows Hypervisor Platform** (or Hyper-V) must be enabled:

1. Make sure virtualization is enabled in your BIOS/UEFI (often called *Intel VT-x*, *AMD-V* or *SVM Mode*). Most laptops have it on already.
2. Open PowerShell **as Administrator** and run:
   ```powershell
   Enable-WindowsOptionalFeature -Online -FeatureName HypervisorPlatform
   ```
3. Restart your computer when asked.

</details>

<details>
<summary><strong>Linux</strong></summary>

Your CPU must support virtualization and **KVM** must be available to your user:

```bash
ls -l /dev/kvm            # the file must exist
sudo adduser $USER kvm    # allow your user to use it, then log out and log in again
```

If `/dev/kvm` doesn't exist, enable virtualization in your BIOS/UEFI and install KVM (for example `sudo apt install qemu-kvm` on Debian/Ubuntu).

</details>

Once the Android tools are installed (step 5) you can confirm acceleration works with `emulator -accel-check`.

### Tools

| Tool | Minimum version | Who installs it |
|---|---|---|
| **Git** | 2.x | You, see [step 1](#1-git) |
| **Node.js** | 24 | You, see [step 3](#3-nodejs-via-nvm) |
| **Visual Studio Code** | Latest | You, see [step 4](#4-visual-studio-code) |
| **Java** | 17+ | `npm run setup` |
| **Android SDK + 2 emulators** | Android 17 (API 37.0) | `npm run setup` |
| **Xcode** *(macOS only)* | 26.4 | You, see [step 6](#6-ios-macos-only) |
| **iOS Simulator** *(macOS only)* | iOS 26.2 or higher | You, see [step 6](#6-ios-macos-only) |

> [!NOTE]
> **We do not use Android Studio in this workshop.** We set up Android with the command-line tools instead, so everyone has the same setup. If you have Android Studio installed and want to use it to manage your emulators, that's fine, but we can't support it when something goes wrong. If you run into issues, use the command line as described below.

---

## 1. Git

Git is used to clone this repository to your machine.

**Quick check:** open a terminal and run:

```bash
git --version
```

If you see a version number (e.g. `git version 2.x.x`), you're good. If not, follow the [./docs/git.md](Git Hub Guide) for full instructions.

---

## 2. Clone this repository

Open a terminal and run:

```bash
git clone https://github.com/webdriverio/setup-workshop-mobile-automation-with-appium.git
cd setup-workshop-mobile-automation-with-appium
```

---

## 3. Node.js via NVM

NVM (Node Version Manager) installs and manages Node.js for you. It avoids permission issues and makes switching versions easy later.

<details>
<summary><strong>macOS</strong></summary>

See [docs/nvm-mac.md](docs/nvm-mac.md) for full instructions.

**Quick steps:**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.8/install.sh | bash
```

Close your terminal completely and open a new one, then install Node.js 24 and make it your default:

```bash
nvm install 24
nvm alias default 24
nvm use 24
node --version   # should print v24.x.x
```

> [!TIP]
> Already have nvm? Skip the `curl` command, the three commands above download Node.js 24 and set it as the default for every new terminal.

</details>

<details>
<summary><strong>Linux</strong></summary>

See [docs/nvm-linux.md](docs/nvm-linux.md) for full instructions.

**Quick steps:**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.8/install.sh | bash
```

Close your terminal completely and open a new one, then install Node.js 24 and make it your default:

```bash
nvm install 24
nvm alias default 24
nvm use 24
node --version   # should print v24.x.x
```

> [!TIP]
> Already have nvm? Skip the `curl` command, the three commands above download Node.js 24 and set it as the default for every new terminal.

</details>

<details>
<summary><strong>Windows</strong></summary>

See [docs/nvm-windows.md](docs/nvm-windows.md) for full instructions.

On Windows we use **nvm-windows** (version 2).

1. Download `nvm-<version>-x64-setup.exe` (or `arm64-setup.exe` on an ARM laptop) from the [nvm-windows releases page](https://github.com/nvm-windows/nvm/releases/latest).
2. Double-click it to run it (don't choose "Run as administrator"), accept the Windows permission prompt, and keep all default options.

Open a **new** PowerShell window and install Node.js 24. `nvm use` also makes it your default for every new terminal:

```powershell
nvm install 24
nvm use 24
node --version   # should print v24.x.x
```

> [!TIP]
> Already have nvm-windows? Run the same three commands. The installer also upgrades nvm-windows 1.x to 2.x for you.

> [!WARNING]
> `winget` and Chocolatey still install the old nvm-windows 1.x, so please use the installer above.

</details>

Then install the dependencies of this repository (this includes Appium and its drivers, used by the check in step 7):

```bash
npm install
```

---

## 4. Visual Studio Code

VS Code is the editor we use to write and run our tests during the workshop.

See [docs/vscode.md](docs/vscode.md) for full instructions including recommended extensions.

1. Download from [https://code.visualstudio.com](https://code.visualstudio.com) and install.
2. Open a **new** terminal and verify:
   ```bash
   code --version
   ```

> **TODO (Wim):** the old `check` script could create the `code` symlink on macOS. The new `check` has not been rewritten yet, so decide if that fix stays or the docs cover it.

---

## 5. Android

Run the setup script and choose **Android**:

```bash
npm run setup
```

It first checks your machine and shows you what we need for the workshop, with a short explanation and whether it is already done or missing. You then answer **yes** or **no** once. After a **yes** it sets up everything that is missing, and you are back at the start, where you can pick another platform or choose **Finish**. This is what it covers:

1. **Java 17+.** If you don't have it, it downloads Java 21 (about 200 MB). Your system Java is not touched.
2. **Android command-line tools** (about 170 MB), if there is no Android SDK yet.
3. **Android SDK packages** (about 6 GB of disk space once installed): the Android 17 platform, the emulator, `adb` and a system image.
4. **Two emulators.** The workshop needs two, so we create `Workshop_1_Pixel_10_API_37_0` and `Workshop_2_Pixel_10_API_37_0` (a Pixel 10 running Android 17, with the Pixel 10 device frame).
5. **Environment variables.** `ANDROID_HOME`, `JAVA_HOME` and your `PATH`, so Appium and `adb` can find everything.

**Where things end up**

| What | Where |
|---|---|
| Android SDK | - MacOS: `~/Library/Android/sdk` <br />- Linux: `~/Android/Sdk` (Linux) <br /> - Windows: `%LOCALAPPDATA%\Android\Sdk` |
| Java (only if downloaded) | `~/.jdks/temurin-21` (the folder IntelliJ and Android Studio also use for JDKs) |
| Environment variables | One block in `~/.zshrc` (macOS) or `~/.bashrc` (Linux), user environment variables on Windows |

When the script is done, **open a new terminal** so the environment variables apply.

**Options**

```bash
npm run setup -- --dry-run   # show what would happen, change nothing
npm run setup -- --yes       # Android only, don't ask questions
```

**Already have Java or an Android SDK?** The script finds and reuses them. It only downloads what is missing, and it only adds the environment variables that are missing.

**Start the emulators**

Use [start-android-emulator](https://github.com/wswebcreation/start-android-emulator), it lists your emulators and starts the ones you pick:

```bash
npx start-android-emulator
```

Or start one directly:

```bash
emulator -avd Workshop_1_Pixel_10_API_37_0
```

Confirm it is running:

```bash
adb devices
# List of devices attached
# emulator-5554   device
```

---

## 6. iOS (macOS only)

iOS automation requires Xcode, which is only available on macOS. If you're on Windows or Linux you'll focus on Android during the iOS parts of the workshop.

See [docs/xcode-ios.md](docs/xcode-ios.md) for full instructions.

**Quick steps:**

1. Install **Xcode** from the App Store (≈ 15 GB, download in advance!).
2. Accept the licence: `sudo xcodebuild -license accept`
3. Install platform tools: `xcodebuild -runFirstLaunch`
4. Open **Xcode → Settings → Platforms** and make sure an iOS runtime is installed.
5. Start a simulator from the terminal:
   ```bash
   xcrun simctl boot "iPhone 17 Pro"
   open -a Simulator
   ```

> **TODO (Wim):** this section is unchanged. Still to do:
> - Newer iOS and Xcode versions, and the simulator name (`iPhone 17 Pro`).
> - I'm planning to add iOS to `npm run setup` (runtime download and simulator creation). Xcode itself still comes from the App Store. Once that's in, this section gets as short as the Android one.

---

## 7. Verify your setup

```bash
npm run check
```

The script checks each tool and tells you exactly what is working and what isn't. Fix anything marked with ✘ before the workshop. Warnings (⚠) are fine to leave.

> **TODO (Wim):** this describes the old check. The new `check` will end with a small WebdriverIO test that starts Appium and opens a session on your emulator/simulator, which is the real proof that everything works. That isn't built yet. When it is, this section and the example output need to be replaced. The old example output is gone because it showed Android Studio and API 36.

---

## Troubleshooting

Run `npm run setup` again first. It re-checks everything and fixes what it can.

| Problem | Where to look |
|---|---|
| Git not found | [docs/git.md](docs/git.md) |
| `nvm` not found after install | [docs/nvm-mac.md](docs/nvm-mac.md) / [docs/nvm-linux.md](docs/nvm-linux.md) / [docs/nvm-windows.md](docs/nvm-windows.md) |
| `code` command not working | [docs/vscode.md](docs/vscode.md) |
| `adb` or `emulator` not found | Open a **new** terminal after `npm run setup`, then run `npm run setup` again |
| Download fails or is very slow | Run `npm run setup` again, it starts the missing download from the beginning |
| Emulator won't start | **TODO (Wim):** needs a troubleshooting page. The old Android Studio guide is gone |
| Xcode issues | [docs/xcode-ios.md](docs/xcode-ios.md) |

Still stuck? Reach out before the workshop so we can sort it out in advance.

---

## What we set up during the workshop

You do **not** need to install any of the following ahead of time:

- The workshop project itself and its dependencies
- Appium Inspector

> **TODO (Wim):** check this list. Appium and the drivers used to be in it, but they are now installed here by `npm install`.
