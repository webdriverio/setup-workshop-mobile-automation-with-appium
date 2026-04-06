# Setting Up Android Studio and an Android Emulator

Android Studio is a development environment made by Google. We use it to install the Android SDK (a set of tools for building and testing Android apps) and to create a virtual Android phone (called an emulator) that runs on your computer.

## 1. Download and Install Android Studio

Go to [https://developer.android.com/studio](https://developer.android.com/studio) and click the big download button. The file is around 1 GB, so this may take a while.

<details>
<summary><strong>macOS</strong></summary>

1. Open the downloaded `.dmg` file. A window will appear with the Android Studio icon.
2. Drag **Android Studio** into the **Applications** folder shown in that window.
3. Open Android Studio from your Applications folder. macOS may warn you that it was downloaded from the internet, click **Open** anyway.
4. The Setup Wizard will start. When it asks which type of setup you want, choose **Standard** and click **Next**.
5. It will then download the Android SDK components. This can take several minutes depending on your connection. Let it finish.

When you see the **Welcome to Android Studio** screen, the installation is done.

</details>

<details>
<summary><strong>Windows</strong></summary>

1. Run the downloaded `.exe` installer.
2. Click **Next** through the installer, keeping all default options.
3. On the final screen, make sure **Start Android Studio** is checked, then click **Finish**.
4. The Setup Wizard will start inside Android Studio. When it asks which type of setup you want, choose **Standard** and click **Next**.
5. It will then download the Android SDK components. This can take several minutes depending on your connection. Let it finish.

When you see the **Welcome to Android Studio** screen, the installation is done.

</details>

<details>
<summary><strong>Linux</strong></summary>

1. Unpack the downloaded `.tar.gz` file. You can do this by right-clicking it in your file manager and choosing **Extract**, or from a terminal:
   ```bash
   tar -xzf android-studio-*.tar.gz -C ~/
   ```
2. Start Android Studio from the terminal:
   ```bash
   ~/android-studio/bin/studio.sh
   ```
3. The Setup Wizard will start. When it asks which type of setup you want, choose **Standard** and click **Next**.
4. It will then download the Android SDK components. This can take several minutes depending on your connection. Let it finish.

When you see the **Welcome to Android Studio** screen, the installation is done.

> [!TIP]
> To launch Android Studio more easily in the future, go to **Tools → Create Desktop Entry** inside Android Studio.

</details>

## 2. Set ANDROID_HOME and Update Your PATH

Appium and the other tools we use need to know where Android Studio installed the Android SDK on your computer. We do this by setting an environment variable called `ANDROID_HOME`.

An **environment variable** is just a named value your operating system makes available to all programs. Think of it like a sticky note your computer can read.

<details>
<summary><strong>macOS / Linux</strong></summary>

Open a terminal and run this command to find out where the SDK was installed:

```bash
ls ~/Library/Android/sdk       # macOS
ls ~/Android/Sdk               # Linux
```

If you see a list of folders (like `build-tools`, `emulator`, `platform-tools`), that's the right location.

Now add these lines to your shell profile. The shell profile is a file that runs every time you open a new terminal:

- **macOS (zsh):** `~/.zshrc`
- **Linux (bash):** `~/.bashrc`

Open the file in a text editor, scroll to the bottom, and add:

```bash
# macOS
export ANDROID_HOME=$HOME/Library/Android/sdk

# Linux (use this line instead of the one above)
# export ANDROID_HOME=$HOME/Android/Sdk

export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/emulator
```

Save the file, then reload it in your terminal:

```bash
source ~/.zshrc    # macOS
source ~/.bashrc   # Linux
```

Now verify it works:

```bash
adb --version
```

You should see something like `Android Debug Bridge version 1.0.41`. If you see `command not found`, double-check that you saved the file and reloaded it.

</details>

<details>
<summary><strong>Windows</strong></summary>

The default SDK location on Windows is:

```
C:\Users\<YourName>\AppData\Local\Android\Sdk
```

Replace `<YourName>` with your actual Windows username.

**Step 1: Set ANDROID_HOME**

1. Press **Windows key**, type `environment variables`, and click **Edit the system environment variables**.
2. In the window that opens, click **Environment Variables** at the bottom.
3. Under **User variables**, click **New**.
4. Set:
   - Variable name: `ANDROID_HOME`
   - Variable value: `C:\Users\<YourName>\AppData\Local\Android\Sdk`
5. Click **OK**.

**Step 2: Add tools to PATH**

1. In the same **Environment Variables** window, find the `Path` variable under **User variables** and click **Edit**.
2. Click **New** and add:
   ```
   %ANDROID_HOME%\platform-tools
   ```
3. Click **New** again and add:
   ```
   %ANDROID_HOME%\emulator
   ```
4. Click **OK** on all dialogs.

**Step 3: Verify**

Open a **new** Command Prompt or PowerShell window (important: existing windows won't see the new variables) and run:

```powershell
adb --version
```

You should see `Android Debug Bridge version 1.0.41` or similar.

</details>

## 3. Create an Android Virtual Device (Emulator)

An Android Virtual Device (AVD) is a virtual phone that runs inside your computer. We create one through Android Studio.

1. Open Android Studio.
2. On the welcome screen, click **More Actions → Virtual Device Manager**.
   - If you have a project open, go to **Tools → Device Manager** instead.
3. Click the **+** button (Create virtual device).
4. You'll see a list of phone models. Select **Pixel 9** and click **Next**.
5. You'll now see a list of Android versions (called system images). Look for **API 36 (Android 16)**.
   - If it has a **Download** link next to it, click that first and wait for it to finish downloading.
   - Once downloaded, select it and click **Next**.
6. On the final screen you'll see a summary. The name will be something like `Pixel 9 API 36`. Click **Finish**.

Your virtual device is now created and will appear in the Device Manager list.

## 4. Start the Emulator

### Using Android Studio

In the **Device Manager**, click the **play button ▶** next to your newly created device.

### Using the command line

First, list your available AVDs:

```bash
emulator -list-avds
```

Then start one by name (replace the name with what you see in the list above):

```bash
emulator -avd Pixel_9_API_36
```

The emulator runs in the foreground. To keep using your terminal, add `&` at the end on macOS/Linux, or open a separate terminal window on Windows.

A window will open showing a virtual Android phone booting up. The first boot takes around 1-2 minutes. Once you see the Android home screen (with a clock and some icons), the emulator is ready.

Confirm your computer can see it by running this in a terminal:

```bash
adb devices
```

You should see:

```
List of devices attached
emulator-5554   device
```

If you see `emulator-5554 offline`, wait another 30 seconds and run it again. The emulator may still be finishing its boot.

## 5. Install start-android-emulator (optional but recommended)

[`start-android-emulator`](https://github.com/wswebcreation/start-android-emulator) is a small command-line tool that lets you list and start your AVDs from the terminal without having to open Android Studio. Handy during the workshop, and yes, your trainer built it fir his own convenience 😉.

Install it globally with npm:

```bash
npm install -g start-android-emulator
```

Run it:

```bash
start-android-emulator
```

It will show you a list of your available AVDs and ask which one to boot. That's it.

> [!NOTE]
> This requires Node.js to be installed first (step 3 in the main README) and `ANDROID_HOME` to be set correctly (step 2 above).

## Troubleshooting

- **Emulator is very slow or freezes**: hardware acceleration is probably not set up. On macOS and Windows this should be automatic. On Linux, you need KVM:
  ```bash
  sudo apt install qemu-kvm libvirt-daemon-system
  sudo usermod -aG kvm $USER
  ```
  Log out and log back in, then try again.

- **Emulator window is tiny**: in the emulator window, go to **...** (Extended controls) → **Settings** and increase the scale.

- **`adb: command not found`**: `platform-tools` is not in your PATH. Re-check step 2 and make sure you opened a new terminal after saving the changes.

- **`emulator: command not found`**: `emulator` is not in your PATH. Re-check step 2.

- **ANDROID_HOME is set but adb still not found**: the SDK may have been installed to a different path than expected. Open Android Studio → **Settings → Appearance & Behavior → System Settings → Android SDK** and look at the **Android SDK Location** at the top. Use that path as your `ANDROID_HOME`.

- **HAXM error on Windows**: go to **SDK Manager → SDK Tools** and install **Intel x86 Emulator Accelerator (HAXM)**. If that fails, check that hardware virtualization is enabled in your BIOS (look for VT-x or Intel Virtualization Technology).

- **Apple Silicon Macs (M1/M2/M3/M4)**: when selecting a system image, choose one labelled with the Apple logo or marked as **arm64**. x86 images won't work on Apple Silicon.

- **"Waiting for target device to come online" hangs forever**: close the emulator, restart Android Studio, and try again. If it keeps happening, delete the AVD and create a new one.
