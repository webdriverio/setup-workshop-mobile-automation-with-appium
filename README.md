<p align="center">
  <img src="docs/images/wdio-robot.svg" alt="The WebdriverIO robot" width="160">
</p>

# Workshop Setup, Making Sense of Mobile Automation with Appium and WebdriverIO

## Welcome!

Hi, we are the WebdriverIO team, and we are happy you are joining us.

A day of mobile automation goes a lot better when every laptop is ready at the start. So we made this repository: it installs what is missing, and then proves with a real test that your machine can run the workshop. You will work with WebdriverIO v10 and Appium, on an Android emulator and, on a Mac, an iOS simulator.

Thank you for taking the time to prepare. It means we spend the day on the fun part: writing tests and watching them run on a phone. Please do the setup at home, not on the conference wifi. The downloads are big.

WebdriverIO and Appium are open source projects, and they exist because people in their communities build and maintain them. Thank you to everyone who does that, and to everyone who answers questions in the issue trackers and on Discord. This workshop stands on their work.

See you there.

---

Before the workshop starts, make sure your machine is set up correctly. Depending on your download speed this takes **30-60 minutes**, so do this **before you arrive**.

> [!IMPORTANT]
> The workshop is packed and we don't have time to troubleshoot installation issues on the day itself. Please make sure everything is set up and the check script passes **before you arrive**. If you get stuck, [open an issue](https://github.com/webdriverio/setup-workshop-mobile-automation-with-appium/issues/new/choose) in advance so we can help, see [Something fails and you cannot fix it?](#something-fails-and-you-cannot-fix-it).

> [!NOTE]
> **Emulators and simulators are the core of the workshop.** This setup prepares them, and `npm run check` tests them. Real devices are not configured in the workshop, but you can try them at home afterwards.
>
> - **Android:** a real phone will probably work too. Turn on developer options (Settings, About phone, tap the build number 7 times), turn on **USB debugging** in them, connect the phone with a cable, accept the question on the phone, and check that it shows up as `device` in `adb devices`. `npm run check` does not test a real phone.
> - **iOS:** simulators only. Real iPhones need code signing and certificates, which would take too much time, so we do not cover them.

> [!NOTE]
> This setup repository has its own copy of Appium and the drivers, only to test that your machine works. The workshop project itself, with its own dependencies, is something we set up together during the workshop.

---

## How it works

You install **Node.js** yourself. After that, two commands do the rest:

```bash
npm run setup   # installs and configures what is missing (Android, iOS)
npm run check   # proves it works by running a small test on your emulator/simulator
```

Both are safe to run as often as you like. `npm run setup` is the one that changes your machine, and it continues where it left off. `npm run check` only looks: it never changes anything, and for everything that is missing it tells you to run `npm run setup`.

`npm run setup` and `npm run check` are built on top of two open source tools: [start-android-emulator](https://github.com/wswebcreation/start-android-emulator) and [start-ios-simulator](https://github.com/wswebcreation/start-ios-simulator). They do the work of installing the Android SDK, the iOS runtime and the emulators and simulators, and you can keep using them after the workshop, see [5. Android](#start-the-emulators) and [6. iOS](#start-the-simulators).

Big downloads (the Android SDK, the demo apps) continue where they stopped when your connection drops, so a bad wifi does not mean starting over.

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

Each emulator uses 2 GB of memory and 4 CPU cores while it runs, and 1 to 2 GB of disk space for its own data. The Android tools themselves take about 6 GB. On macOS, Xcode and the iOS simulator need a lot more disk space (Xcode alone is ≈ 15 GB).

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

Once the Android tools are installed (step 5) `npm run check` tests this for you. You can also run it yourself: `emulator -accel-check`.

### Tools

| Tool | Minimum version | Who installs it |
|---|---|---|
| **Git** | 2.x | You, see [step 1](#1-git) |
| **Node.js** | 24 | You, see [step 3](#3-nodejs-via-nvm) |
| **Visual Studio Code** | Latest | You, see [step 4](#4-visual-studio-code) |
| **Java** | 17+ | `npm run setup` |
| **Android SDK + 2 emulators** | Android 17 (API 37.0) | `npm run setup` |
| **Xcode** *(macOS only)* | 27 | You (App Store), see [step 6](#6-ios-macos-only) |
| **iOS Simulator runtime + 2 simulators** *(macOS only)* | iOS 27 (the version that comes with your Xcode) | `npm run setup` |

> [!NOTE]
> **We do not use Android Studio in this workshop.** We set up Android with the command-line tools instead, so everyone has the same setup. If you have Android Studio installed and want to use it to manage your emulators, that's fine, but we can't support it when something goes wrong. If you run into issues, use the command line as described below.

> [!NOTE]
> **For iOS we also prefer the command line over the Xcode interface.** `npm run setup` downloads the iOS version and creates the two simulators for you, so everyone has the same setup. You can add simulators in Xcode yourself (**Open Developer Tool → Device Hub**), but with Xcode 27 a downloaded iOS version can be missing there. We can't support problems that come from that, see [section 6](#6-ios-macos-only).

---

## 1. Git

Git is used to clone this repository to your machine.

### Quick check

Open a terminal and run:

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

### Quick steps

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

### Quick steps

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

Then install the dependencies of this repository (this includes Appium and its drivers, used by the session test of the check in step 7):

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

On macOS the installer does not add the `code` command. `npm run setup` offers to add it for you (choose **Visual Studio Code** in the menu), or do it yourself, see [docs/vscode.md](docs/vscode.md). The `code` command is optional, the workshop works without it.

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
5. **The Android demo app** (118 MB), the app we test in the workshop. Downloaded now, so you don't have to do it on the conference wifi.
6. **Environment variables.** `ANDROID_HOME`, `JAVA_HOME` and your `PATH`, so Appium and `adb` can find everything.

### Where things end up

| What | Where |
|---|---|
| Android SDK | - MacOS: `~/Library/Android/sdk` <br />- Linux: `~/Android/Sdk` (Linux) <br /> - Windows: `%LOCALAPPDATA%\Android\Sdk` |
| Java (only if downloaded) | `~/.jdks/temurin-21` (the folder IntelliJ and Android Studio also use for JDKs) |
| Demo apps (Android and iOS) | `Downloads/appium-workshop-apps`. On the day you copy them into the `apps` folder of the workshop project, we will tell you when. |
| Environment variables | One block in `~/.zshrc` (macOS) or `~/.bashrc` (Linux), user environment variables on Windows |

When the script is done, **open a new terminal** so the environment variables apply.

### Options

```bash
npm run setup -- --dry-run   # show what would happen, change nothing
npm run setup -- --yes       # don't ask questions, set up everything for your machine
```

### Already have Java or an Android SDK?

The script finds and reuses them. It only downloads what is missing, and it only adds the environment variables that are missing.

### Start the emulators

Install [start-android-emulator](https://github.com/wswebcreation/start-android-emulator) once, globally. It is the one-stop shop for Android emulators, and `npm run setup` is built on top of it:

```bash
npm install -g start-android-emulator
```

Then:

| Command | What it does |
|---|---|
| `start-android-emulator` | Pick an emulator from a list and start it. It waits until the emulator has booted and leaves it running, so run it twice for the two workshop emulators. |
| `start-android-emulator Workshop_1_Pixel_10_API_37_0` | Start an emulator by name |
| `start-android-emulator --check` | See what is set up and what is missing, and which emulators you have |
| `start-android-emulator --setup` | Install what is missing (Java, the Android SDK, the emulator) |
| `start-android-emulator --create`, `--delete` | Create or delete emulators |
| `start-android-emulator --update`, `--prune` | Keep the SDK up to date, and remove what no emulator uses |

Use `start-android-emulator --help` for all options. You can also try it without installing: `npx start-android-emulator` does the same.

> [!TIP]
> Global packages belong to one Node.js version. If you switch versions with `nvm`, install the package again.

Do you prefer to go bare metal? The tools of the Android SDK do the same. Start one emulator per terminal:

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

iOS automation requires Xcode, which is only available on macOS. If you're on Windows or Linux you'll focus on Android during the iOS parts of the workshop. We use iOS **simulators** only, real iPhones are not part of the workshop because of the signing and certificate challenges.

You install **Xcode** yourself from the App Store (≈ 15 GB, download it in advance and open it once). Then run `npm run setup` and choose **iOS**. It accepts the Xcode licence (asks for your Mac password), downloads the iOS simulator runtime (≈ 8 GB), creates the two workshop simulators and downloads the iOS demo app (15 MB).

See [docs/xcode-ios.md](docs/xcode-ios.md) for the details and for what to do when something goes wrong.

> [!NOTE]
> **Known issue with Xcode 27:** a downloaded iOS version can be missing when you add a simulator yourself in Xcode (**Open Developer Tool → Device Hub**), so you cannot create one. `npm run setup` works around this. It may be fixed in a later Xcode version. Details in [docs/xcode-ios.md](docs/xcode-ios.md#known-issue-xcode-27-does-not-list-a-downloaded-ios-version).

### Start the simulators

Install [start-ios-simulator](https://github.com/wswebcreation/start-ios-simulator) once, globally. It is the one-stop shop for iOS simulators, and `npm run setup` is built on top of it:

```bash
npm install -g start-ios-simulator
```

Then:

| Command | What it does |
|---|---|
| `start-ios-simulator` | Pick a simulator from a list and start it. It opens in a window of its own, waits until it has booted and leaves it running, so run it twice for the two workshop simulators. |
| `start-ios-simulator Workshop_1_iPhone_17_Pro_iOS_27_0` | Start a simulator by name |
| `start-ios-simulator --check` | See what is set up and what is missing, and which simulators you have |
| `start-ios-simulator --setup` | Install what is missing (the Xcode licence, the iOS runtime) |
| `start-ios-simulator --create`, `--delete` | Create or delete simulators |
| `start-ios-simulator --prune` | Remove iOS runtimes that no simulator uses |

Use `start-ios-simulator --help` for all options. You can also try it without installing: `npx start-ios-simulator` does the same.

> [!TIP]
> Global packages belong to one Node.js version. If you switch versions with `nvm`, install the package again.

Do you prefer to go bare metal? Xcode's own tools do the same. Start the simulator:

```bash
xcrun simctl boot Workshop_1_iPhone_17_Pro_iOS_27_0
```

Then open it. With Xcode 26 or older: `open -a Simulator`. Xcode 27 replaced the Simulator app by Device Hub: **Xcode → Open Developer Tool → Device Hub**.

Confirm it is running:

```bash
xcrun simctl list devices | grep Booted
# Workshop_1_iPhone_17_Pro_iOS_27_0 (XXXXXXXX-...) (Booted)
```

---

## 7. Verify your setup

At the end of `npm run setup` you are asked if you want to run the check. You can also run it yourself at any time:

```bash
npm run check
```

The check only looks, it never changes anything on your machine. It goes through this list and marks each item with ✔ or ✘:

1. **Your computer:** free disk space, memory and whether the download servers can be reached. Little memory or an unreachable server is only a warning ⚠. Too little free disk space (less than 10 GB) is a ✘.
2. **Tools:** Git, Node.js 24+, npm and Visual Studio Code (the `code` command is optional, so a missing one is only a warning).
3. **Java and Android:** `JAVA_HOME`, `ANDROID_HOME`, `adb` and `emulator` on your `PATH`, the two workshop emulators, hardware acceleration (a warning when it is missing) and the Android demo app.
4. **iOS (macOS only):** Xcode, its licence and components, the iOS simulator runtime, the two workshop simulators and the iOS demo app.
5. **WebdriverIO session:** the real proof. It starts Appium and runs a small WebdriverIO test that opens the **Settings** app on your emulator/simulator and reads the screen. This is the same thing you do in the first exercise of the workshop. This step is skipped when an earlier item failed, because it cannot work then.

Android and iOS are tested at the same time, each on its own line that updates while it runs. When both are done, the explanation of anything that failed is shown below, with `[Android]` or `[iOS]` in front.

If no emulator or simulator is running, the check starts one for you (this takes a minute or two) and closes it again when it is done. One that you started yourself is left open.

To test only one platform (this limits all the checks, not only the session):

```bash
npm run check -- --android   # only Android
npm run check -- --ios       # only iOS (macOS only)
```

Fix anything marked with ✘ by running `npm run setup` (open a new terminal afterwards) and run the check again. When everything passes, you are ready for the workshop.

### Good to know

The check is also a warm-up. The first iOS session builds a helper app (WebDriverAgent) that takes a few minutes, and the first Android session sets up Appium's helper on the emulator. After a passing check these are done and cached, so the first exercise of the workshop starts fast. Run the check a day before the workshop.

### Something fails and you cannot fix it?

When the check fails it saves a report with everything it found (your system, the output above and the Appium log) in `workshop-check-report.txt` in this folder. Want a report when everything passes too? Run `npm run check -- --report`.

Then open an issue, we will help you:

1. Go to [New issue](https://github.com/webdriverio/setup-workshop-mobile-automation-with-appium/issues/new/choose) and choose **Setup problem**. The form asks for what we need.
2. Drag `workshop-check-report.txt` into the form. If `npm run setup` is what fails, there is no report: copy the last lines of your terminal into the form instead.
3. Mention **@wswebcreation** in the issue, so it reaches Wim right away. (The form also assigns it to Wim.)

The issue is public. The report has paths on your computer (with your user name) and no passwords or tokens, remove anything you do not want to share.

### The Android test fails the first time?

Right after a fresh emulator start, the check can fail with `Cannot find any free port in range 8200..8299` or `EADDRNOTAVAIL`. These messages mean the connection between your computer and the emulator was not ready yet, nothing is wrong with your setup. The check waits until the emulator is ready and tries once more by itself. If it still fails, run it again, or start the emulator yourself, wait until you see the home screen and run `npm run check -- --android`.

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
| `Cannot find any free port in range 8200..8299` or `EADDRNOTAVAIL` during the check | The emulator was not ready yet. Run `npm run check -- --android` again, see [7. Verify your setup](#7-verify-your-setup) |
| The check fails and I cannot fix it | Open an issue with `workshop-check-report.txt`, see [Something fails and you cannot fix it?](#something-fails-and-you-cannot-fix-it) |
| Download fails because of a company firewall or proxy | See [Behind a company proxy](#behind-a-company-proxy-or-firewall) |
| Xcode issues | [docs/xcode-ios.md](docs/xcode-ios.md) |

### Behind a company proxy or firewall

If your network uses a proxy, set it in your terminal **before** you run the setup or the check, and they will use it for all their downloads (also the Android SDK):

```bash
# macOS / Linux
export HTTPS_PROXY=http://proxy.company.com:8080

# Windows PowerShell
$env:HTTPS_PROXY = "http://proxy.company.com:8080"
```

`npm run check` tells you at the top which download servers it cannot reach. If the proxy is set and they still fail, ask your IT department to allow them (`dl.google.com`, `android.googlesource.com`, `api.adoptium.net`, `github.com`, `objects.githubusercontent.com` and `registry.npmjs.org`), or use another network, like a phone hotspot. This is not tested with every kind of proxy, so tell us if it does not work for you.

Still stuck? [Open an issue](https://github.com/webdriverio/setup-workshop-mobile-automation-with-appium/issues/new/choose) before the workshop so we can sort it out in advance, see [Something fails and you cannot fix it?](#something-fails-and-you-cannot-fix-it).

---

## What we set up during the workshop

You do **not** need to install any of the following ahead of time:

- The workshop project itself and its dependencies
- Appium Inspector

---

## Thank you, and see you soon!

Thank you for taking the time to get your machine ready. It really helps, and it means we can spend the day on what we are all here for.

We can't wait to meet you and to see your first test run on a phone.

See you soon!

Grtz from the whole WebdriverIO team
