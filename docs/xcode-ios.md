# Setting Up Xcode and an iOS Simulator

> [!WARNING]
> iOS automation with Appium requires Xcode, which is only available on macOS. If you're on Windows or Linux, skip this and focus on Android for the workshop.

Xcode is Apple's development environment. We use it for the iOS Simulator, a virtual iPhone that runs on your Mac.

## 1. Install Xcode

Xcode is a large download (around 15 GB), so start this early and make sure you have enough disk space.

1. Open the **App Store** on your Mac.
2. Search for **Xcode** and click **Get** / **Install**.
3. Wait for it to finish. This can take 30-60 minutes depending on your connection.

> [!TIP]
> If the App Store is slow, you can download specific Xcode versions directly from [https://developer.apple.com/download/all/](https://developer.apple.com/download/all/) using a free Apple ID. Look for Xcode 26.x and download the `.xip` file.

Once installed, **open Xcode at least once**. It will ask you to install additional components the first time. Let it do that.

## 2. Accept the Xcode Licence and Install Components

Some tools need you to accept Apple's licence agreement before they work. Open a terminal and run:

```bash
sudo xcodebuild -license accept
```

You'll be asked for your Mac password (it won't show anything while you type, that's normal). Press Enter.

Then run:

```bash
xcodebuild -runFirstLaunch
```

This installs platform support files. It may take a few minutes and won't show much output while it runs.

## 3. Install Xcode Command Line Tools

The command line tools are a smaller set of development utilities that other tools depend on. Run:

```bash
xcode-select --install
```

A dialog will appear, click **Install**. If you already have them, you'll see:

```
xcode-select: error: command line tools are already installed
```

That's fine, just continue.

Verify everything is pointing to the right place:

```bash
xcode-select -p
```

You should see: `/Applications/Xcode.app/Contents/Developer`

If you see a different path (like one pointing to old Command Line Tools), run:

```bash
sudo xcode-select --switch /Applications/Xcode.app
```

## 4. Check the iOS Simulator Runtime

Xcode ships with one or two simulator runtimes by default. Check what's installed:

1. Open **Xcode → Settings (⌘,) → Platforms**.
2. You'll see a list of installed platforms and their download status.
3. If **iOS 26** is not in the list, click **+** at the bottom and download it.

Or from the terminal:

```bash
xcodebuild -downloadPlatform iOS
```

## 5. Create and Start an iOS Simulator

### Using Xcode (recommended)

1. From the menu bar, go to **Xcode → Open Developer Tool → Simulator** (or type `open -a Simulator` in the terminal).
2. In the Simulator window, go to **File → New Simulator**.
3. Fill in:
   - **Name**: something like `iPhone 17 Pro Workshop`
   - **Device Type**: iPhone 17 Pro
   - **iOS Version**: iOS 26.x
4. Click **Create**.

The simulator will boot automatically. You'll see a virtual iPhone appear on your screen.

### Using the command line

List what runtimes are available:

```bash
xcrun simctl list runtimes
```

Then create and boot a simulator:

```bash
xcrun simctl create "iPhone 17 Pro Workshop" "iPhone 17 Pro" "com.apple.CoreSimulator.SimRuntime.iOS-26-0"
xcrun simctl boot "iPhone 17 Pro Workshop"
open -a Simulator
```

## 6. Verify the Simulator is Running

```bash
xcrun simctl list devices | grep Booted
```

You should see a line like:

```
iPhone 17 Pro Workshop (XXXXXXXX-...) (Booted)
```

## Troubleshooting

- **Xcode takes forever in the App Store**: try the direct download from the Apple Developer portal (see the tip in step 1).

- **"You do not have permission to install" in the App Store**: make sure you're signed in with your Apple ID. Go to **App Store → Sign In**.

- **Not enough disk space**: Xcode needs about 15 GB for the download and more for the simulator runtimes. Free up space before downloading.

- **`xcrun: error: invalid active developer path`**: run:
  ```bash
  sudo xcode-select --switch /Applications/Xcode.app
  ```

- **Simulator doesn't appear after creating it**: make sure the Simulator app is open (`open -a Simulator`) and the device is booted (`xcrun simctl boot "Device Name"`).

- **Simulator is booted but you see a black screen**: this sometimes happens on first boot. Wait 30 seconds. If it stays black, close the simulator app and reboot the device:
  ```bash
  xcrun simctl shutdown "iPhone 17 Pro Workshop"
  xcrun simctl boot "iPhone 17 Pro Workshop"
  open -a Simulator
  ```

- **Old macOS version**: Xcode 26 requires a recent macOS version. If you're on an older version, check which Xcode version supports your macOS at the Apple Developer portal and download that instead.
