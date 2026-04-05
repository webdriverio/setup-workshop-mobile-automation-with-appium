# Installing Visual Studio Code

Visual Studio Code (VS Code) is a free code editor made by Microsoft. It's what we use to write and run tests during the workshop.

## 1. Download and Install

Go to [https://code.visualstudio.com](https://code.visualstudio.com) and click the big download button. It will detect your platform automatically.

<details>
<summary><strong>macOS</strong></summary>

1. Open the downloaded `.zip` file. macOS extracts it automatically and you'll see **Visual Studio Code.app** appear.
2. Drag **Visual Studio Code** into your **Applications** folder. Don't run it directly from Downloads.
3. Open VS Code from your Applications folder. If macOS warns you that it was downloaded from the internet, click **Open**.

**Make the `code` terminal command work:**

The `code` command lets you open files and folders in VS Code directly from the terminal (e.g. `code .` to open the current folder). To enable it:

1. Open VS Code.
2. Press **⌘ + Shift + P** to open the Command Palette (a search bar at the top).
3. Type `Shell Command` and click **Shell Command: Install 'code' command in PATH**.
4. Enter your Mac password if asked.
5. Open a **new** terminal and verify:
   ```bash
   code --version
   ```

Alternatively, the setup check script (`npm run check`) will offer to do this for you automatically.

</details>

<details>
<summary><strong>Windows</strong></summary>

1. Run the downloaded installer (`.exe`).
2. During installation, on the **Select Additional Tasks** screen, make sure you check:
   - **Add to PATH** (this is the important one)
   - **Register Code as an editor for supported file types** (optional but handy)
3. Click **Install** and wait for it to finish, then click **Finish**.
4. Open a **new** Command Prompt or PowerShell and verify:
   ```powershell
   code --version
   ```

If you forgot to check "Add to PATH", the setup check script (`npm run check`) will show you exactly how to add it manually.

</details>

<details>
<summary><strong>Linux</strong></summary>

**Debian / Ubuntu:**

```bash
sudo apt install wget gpg
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
sudo install -o root -g root -m 644 packages.microsoft.gpg /etc/apt/trusted.gpg.d/
echo "deb [arch=amd64 signed-by=/etc/apt/trusted.gpg.d/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" | sudo tee /etc/apt/sources.list.d/vscode.list
sudo apt update && sudo apt install code
```

**Fedora / RHEL:**

```bash
sudo rpm --import https://packages.microsoft.com/keys/microsoft.asc
echo "[code]
name=Visual Studio Code
baseurl=https://packages.microsoft.com/yumrepos/vscode
enabled=1
gpgcheck=1
gpgkey=https://packages.microsoft.com/keys/microsoft.asc" | sudo tee /etc/yum.repos.d/vscode.repo
sudo dnf install code
```

Verify:

```bash
code --version
```

</details>

## 2. Recommended Extensions

Extensions add extra features to VS Code. Install these two before the workshop:

| Extension | Publisher | Why |
|---|---|---|
| **Markdown Preview Enhanced** | Yiyi Wang | Preview markdown files (like this README) directly in VS Code |
| **Pretty TypeScript Errors** | yoavbls | Makes TypeScript error messages readable instead of walls of red text |

**To install:**

1. Open VS Code.
2. Click the **Extensions** icon in the left sidebar (it looks like four squares, or press **⌘/Ctrl + Shift + X**).
3. Search for each extension by name and click **Install**.

Or install both at once from the terminal:

```bash
code --install-extension shd101wyy.markdown-preview-enhanced
code --install-extension yoavbls.pretty-ts-errors
```

## Troubleshooting

- **`code: command not found`**: the `code` CLI wasn't added to your PATH during install.
  - macOS: open VS Code → **⌘ + Shift + P** → type `Shell Command` → click **Install 'code' command in PATH**
  - Windows: see the exact steps in the check script output when you run `npm run check`
  - Linux: the package install should handle this automatically. If not, check that `/usr/bin/code` exists and that `/usr/bin` is in your PATH.

- **VS Code opens but shows a blank window**: try closing it and opening it again. If it keeps happening, go to **Help → Toggle Developer Tools** and look for errors in the Console tab.

- **Extensions won't install ("Error while installing extension")**: you may be behind a firewall or proxy. Try installing from the VS Code Marketplace website instead: search for the extension, click Install, and it will redirect to VS Code.
