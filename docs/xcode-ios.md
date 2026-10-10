# Setting Up Xcode and an iOS Simulator

> [!WARNING]
> iOS automation with Appium requires Xcode, which is only available on macOS. If you're on Windows or Linux, skip this and focus on Android for the workshop.

Xcode is Apple's development environment. We use it for the iOS Simulator, a virtual iPhone that runs on your Mac.

## 1. Install Xcode (the only manual step)

Xcode is a large download (around 15 GB), so start this early and make sure you have enough disk space (Xcode, the simulator runtime and the simulators need about 30 GB in total).

1. Open the **App Store** on your Mac.
2. Search for **Xcode** and click **Get** / **Install**.
3. Wait for it to finish. This can take 30-60 minutes depending on your connection.
4. **Open Xcode once**. It asks to install extra components, let it do that. Then quit Xcode.

> [!TIP]
> If the App Store is slow, you can download Xcode directly from [https://developer.apple.com/download/all/](https://developer.apple.com/download/all/) with a free Apple ID. Look for Xcode 27 and download the `.xip` file.

## 2. Let the setup do the rest

```bash
npm run setup
```

Choose **iOS**. It:

1. accepts the Xcode licence and installs the Xcode components (asks for your Mac password),
2. downloads the iOS simulator runtime that matches your Xcode (about 8 GB),
3. creates the two workshop simulators, `Workshop_1_iPhone_17_Pro_iOS_27_0` and `Workshop_2_iPhone_17_Pro_iOS_27_0`.

You do not have to download iOS yourself, the setup does it in step 2 (it runs `xcodebuild -downloadPlatform iOS -architectureVariant arm64`). This can take a while, depending on your connection, so start it early. If the iOS version is already installed, this step is skipped. If Xcode downloads it but does not list it, the setup registers it for you, see [the known issue](#known-issue-xcode-27-does-not-list-a-downloaded-ios-version).

Start them with [start-ios-simulator](https://github.com/wswebcreation/start-ios-simulator), it lists your simulators and starts the one you pick:

```bash
npx start-ios-simulator
```

Or directly:

```bash
xcrun simctl boot Workshop_1_iPhone_17_Pro_iOS_27_0
open -a Simulator
```

Check that it runs:

```bash
xcrun simctl list devices | grep Booted
```

## Creating a simulator in Xcode yourself

We advise to let `npm run setup` create the simulators, so everyone has the same setup and you avoid the problem below. If you do want to create a simulator in Xcode yourself, this is the normal way:

1. Open **Xcode**, then go to **Xcode → Open Developer Tool → Device Hub**.
2. Add a new device (**+**).
3. Select the **OS version** (iOS 27) and the **model** (iPhone 17 Pro).
4. If the OS is not available yet, download it there and then configure the device.

> [!WARNING]
> With Xcode 27 this can fail: the iOS version you downloaded does not show up, so you cannot select it. This is a known problem, see [Known issue: Xcode 27 does not list a downloaded iOS version](#known-issue-xcode-27-does-not-list-a-downloaded-ios-version). `npm run setup` works around it.

## Doing it by hand

The setup runs these commands. If it fails, you can run them yourself, one by one.

```bash
# Xcode must be the active developer directory. You should see /Applications/Xcode.app/Contents/Developer
xcode-select -p
sudo xcode-select --switch /Applications/Xcode.app     # only if it points somewhere else

sudo xcodebuild -license accept
sudo xcodebuild -runFirstLaunch

# Download the iOS simulator runtime. On Apple Silicon Xcode 27 needs -architectureVariant arm64
xcodebuild -downloadPlatform iOS -architectureVariant arm64

# Is the runtime registered? iOS 27.0 must be in this list.
xcrun simctl list runtimes

# Create and start a simulator
xcrun simctl create "Workshop_1_iPhone_17_Pro_iOS_27_0" "iPhone 17 Pro" com.apple.CoreSimulator.SimRuntime.iOS-27-0
xcrun simctl boot "Workshop_1_iPhone_17_Pro_iOS_27_0"
open -a Simulator
```

You do not need to install the Xcode command line tools separately, Xcode includes them.

## Known issue: Xcode 27 does not list a downloaded iOS version

**What you see:** you download iOS 27 in Xcode (Settings → Components, or `xcodebuild -downloadPlatform iOS`), and Xcode says it is installed. But in the Device Hub the iOS version cannot be selected ("No Runtimes Available"), and this command shows nothing:

```bash
xcrun simctl list runtimes
```

**Why:** the download is fine, but macOS fails to verify it and never registers it. You can see this here:

```bash
xcrun simctl runtime list
# iOS 27.0 (24A434) - <id> (Ready)          <- downloaded
xcrun simctl runtime verify <id>
# Signature verification failed: -67054 "a sealed resource is missing or invalid"
```

No simulator can be created for a runtime that is not registered. We saw this on Xcode 27.0 (27A266a) on Apple Silicon, with iOS 26.5 and 27.0.

**Fix:** the download contains a plain `.dmg`. Adding that registers the runtime the old way. `npm run setup` does this for you. By hand:

```bash
# 1. the folder of the downloaded runtime: the "path" of the iOS 27.0 entry
xcrun simctl runtime list -j | grep '"path"'
# 2. add the .dmg in the Restore folder inside it
xcrun simctl runtime add "<path>/Restore/<something>.dmg"
# 3. iOS 27.0 must be listed now
xcrun simctl list runtimes
```

It costs almost no extra disk space. The old entry stays in `simctl runtime list` as "Unusable - Cryptex Mount Preferred", that is harmless. After this the Device Hub lists iOS 27 as well, and Xcode creates its standard simulators.

Also try `xcodebuild -downloadPlatform iOS -architectureVariant arm64`. Without the variant, Xcode 27 sometimes cannot find the iOS download at all.

**Other reports of the same problem** (all on Apple's developer forums, we found no reaction or fix from Apple):

- [iOS 27 & watchOS 27 Simulator runtimes download but never register](https://developer.apple.com/forums/thread/830152): the cause (-67054) and the `.dmg` fix we use.
- [Xcode 27 No iOS 27 Simulators](https://developer.apple.com/forums/thread/849096): the same on the release build, "Add Platforms" only lists iOS 26.5 or older. Deleting and downloading again in Settings → Components did not help.
- [Unable to use, install, or delete the iOS 27 runtime](https://developer.apple.com/forums/thread/830772): the `-architectureVariant arm64` fix.

> [!NOTE]
> This is a bug in Xcode 27 and it may be fixed in a later Xcode version (or a macOS update). If you have a newer version than 27.0 and the iOS version shows up in the Device Hub, you do not need any of this. The setup checks first and only applies the fix when it is needed.

## Troubleshooting

- **The iOS version does not show up when adding a device (Xcode 27)**: see [the known issue](#known-issue-xcode-27-does-not-list-a-downloaded-ios-version) below.

- **The runtime download fails or "Get" does nothing in Xcode**: use the terminal command with `-architectureVariant arm64` (see above). Make sure you are signed in with your Apple ID in **Xcode → Settings → Accounts**.

- **Xcode takes forever in the App Store**: try the direct download from the Apple Developer portal (see the tip in step 1).

- **"You do not have permission to install" in the App Store**: make sure you're signed in with your Apple ID. Go to **App Store → Sign In**.

- **Not enough disk space**: free up space before downloading, you need about 30 GB.

- **`xcrun: error: invalid active developer path`**: run:
  ```bash
  sudo xcode-select --switch /Applications/Xcode.app
  ```

- **Simulator is booted but you see a black screen**: this sometimes happens on first boot. Wait 30 seconds. If it stays black, close the Simulator app and reboot the device:
  ```bash
  xcrun simctl shutdown Workshop_1_iPhone_17_Pro_iOS_27_0
  xcrun simctl boot Workshop_1_iPhone_17_Pro_iOS_27_0
  open -a Simulator
  ```

- **Old macOS version**: Xcode 27 requires a recent macOS version. If you're on an older version, check which Xcode version supports your macOS at the Apple Developer portal and download that instead. The setup uses the iOS version that belongs to the Xcode you have.
