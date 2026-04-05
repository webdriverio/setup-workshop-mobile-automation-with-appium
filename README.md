# Workshop Setup, Making Sense of Mobile Automation with Appium and WebdriverIO

Before the workshop starts, make sure your machine is set up correctly. Depending on your download speed this takes **30-60 minutes**, so do this **before you arrive**.

> [!IMPORTANT]
> The workshop is packed and we don't have time to troubleshoot installation issues on the day itself. Please make sure everything is set up and the check script passes **before you arrive**. If you get stuck, reach out in advance so we can help.

---

## What you'll install

| Tool | Why we need it |
|---|---|
| **Git** | To download the workshop project to your machine |
| **Node.js** (via NVM) | WebdriverIO runs on Node.js |
| **Visual Studio Code** | The editor we use to write and run tests |
| **Android Studio** | Gives us the Android SDK and the emulator |
| **Xcode** *(macOS only)* | Gives us the iOS Simulator |

> [!IMPORTANT]
> Appium itself will be installed **together during the workshop**.


---

## 1. Git

Git is used to download the workshop project to your machine.

See [docs/git.md](docs/git.md) for full instructions.

**Quick check:** open a terminal and run:

```bash
git --version
```

If you see a version number (e.g. `git version 2.x.x`), you're good. If not, follow the guide above.

---

## 2. Clone This Repository

Clone this repository to your machine so you can run the setup check script.

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
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
```

Close your terminal completely and open a new one, then:

```bash
nvm install --lts
nvm use --lts
node --version   # should print v22.x.x or later
```

</details>

<details>
<summary><strong>Linux</strong></summary>

See [docs/nvm-linux.md](docs/nvm-linux.md) for full instructions.

**Quick steps:**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
```

Close your terminal completely and open a new one, then:

```bash
nvm install --lts
nvm use --lts
node --version   # should print v22.x.x or later
```

</details>

<details>
<summary><strong>Windows</strong></summary>

See [docs/nvm-windows.md](docs/nvm-windows.md) for full instructions.

On Windows we use **nvm-windows**:

1. Download `nvm-setup.exe` from the [nvm-windows releases page](https://github.com/coreybutler/nvm-windows/releases/latest).
2. Run the installer and keep all default options.
3. Open a **new** PowerShell window and run:

```powershell
nvm install lts
nvm use lts
node --version   # should print v22.x.x or later
```

</details>

---

## 4. Visual Studio Code

VS Code is the editor we use to write and run our tests during the workshop.

See [docs/vscode.md](docs/vscode.md) for full instructions including recommended extensions.

**Quick steps:**

1. Download from [https://code.visualstudio.com](https://code.visualstudio.com) and install.
2. Open a **new** terminal and verify:
   ```bash
   code --version
   ```
   If it says `command not found`, the check script (step 7) can fix this for you.

---

## 5. Android Studio + Android Emulator

Android Studio gives us the Android SDK and lets us run a virtual phone (emulator) on your computer.

See [docs/android-studio.md](docs/android-studio.md) for full instructions.

**Quick steps:**

1. Download from [https://developer.android.com/studio](https://developer.android.com/studio) and install.
2. Run the Setup Wizard inside Android Studio, choose **Standard**.
3. Set `ANDROID_HOME` and add `platform-tools` + `emulator` to your `PATH` (explained in the guide).
4. Open **Device Manager**, create a **Pixel 9** device with **API 36**, and start it.
5. Confirm with `adb devices`, you should see `emulator-5554 device`.

---

## 6. Xcode + iOS Simulator *(macOS only)*

iOS automation requires Xcode, which is only available on macOS. If you're on Windows or Linux you'll focus on Android during the iOS parts of the workshop.

See [docs/xcode-ios.md](docs/xcode-ios.md) for full instructions.

**Quick steps:**

1. Install **Xcode** from the App Store (≈ 15 GB, download in advance!).
2. Accept the licence: `sudo xcodebuild -license accept`
3. Install platform tools: `xcodebuild -runFirstLaunch`
4. Open **Xcode → Settings → Platforms** and make sure **iOS 26** is installed.
5. Open the Simulator app and boot an **iPhone 17 Pro** device.

---

## 7. Verify Your Setup

From inside the cloned workshop folder, run:

```bash
npm run check
```

The script checks each tool and tells you exactly what is working and what isn't. It can also fix some things automatically when it prompts you with `[y/N]`.

Fix anything marked with ✘ before the workshop. Warnings (⚠) are fine to leave.

**Example of a passing check:**

```
Git
  ✔  git version 2.47.1

Node.js
  ✔  node v22.14.0
  ✔  npm 10.9.2

Visual Studio Code
  ✔  Visual Studio Code 1.99.0

Java
  ✔  Java, openjdk version "17.0.10"

Android
  ✔  ANDROID_HOME = /Users/you/Library/Android/sdk
  ✔  adb, Android Debug Bridge version 1.0.41
  ✔  Android emulator found. Available AVDs:
       Pixel_9_API_36
  ⚠  No running Android devices or emulators (fine before the workshop)

iOS (macOS only)
  ✔  Xcode, /Applications/Xcode.app/Contents/Developer
  ✔  xcodebuild, Xcode 16.x
  ⚠  No iOS Simulator currently running (fine before the workshop)

──────────────────────────────────────────────────

All checks passed! Your machine is ready for the workshop.
```

---

## Troubleshooting

If you get stuck, each guide in the [docs/](docs/) folder has a troubleshooting section at the bottom.

| Problem | Where to look |
|---|---|
| Git not found | [docs/git.md](docs/git.md) |
| `nvm` not found after install | [docs/nvm-mac.md](docs/nvm-mac.md) / [docs/nvm-linux.md](docs/nvm-linux.md) / [docs/nvm-windows.md](docs/nvm-windows.md) |
| `code` command not working | [docs/vscode.md](docs/vscode.md) |
| `adb` not found | [docs/android-studio.md](docs/android-studio.md) |
| Emulator won't start | [docs/android-studio.md](docs/android-studio.md) |
| Xcode issues | [docs/xcode-ios.md](docs/xcode-ios.md) |

Still stuck? Reach out before the workshop so we can sort it out in advance.

---

## What we install during the workshop

You do **not** need to install these ahead of time:

- Appium (global npm package)
- Appium drivers (`uiautomator2` for Android, `xcuitest` for iOS)
- Appium Inspector (optional GUI tool)
- The workshop project itself and its dependencies (shared on the day)
