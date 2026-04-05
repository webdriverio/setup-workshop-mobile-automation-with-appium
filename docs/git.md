# Installing Git

Git is the tool we use to download (clone) the workshop project to your machine. You only need the basics, just enough to run one `git clone` command.

## Do you already have Git?

Open a terminal and run:

```bash
git --version
```

If you see something like `git version 2.x.x` you're good, skip the rest of this page.

If you see an error like `command not found`, follow the steps for your platform below.

---

<details>
<summary><strong>macOS</strong></summary>

Git comes with the Xcode Command Line Tools, which you likely already installed as part of the Xcode setup. If not, running any `git` command will prompt macOS to install them for you automatically:

```bash
git --version
```

A dialog will appear asking if you want to install the developer tools. Click **Install** and wait for it to finish (a few minutes).

Once done, verify:

```bash
git --version
# git version 2.x.x
```

</details>

<details>
<summary><strong>Windows</strong></summary>

1. Go to [https://git-scm.com/download/win](https://git-scm.com/download/win). The download starts automatically.
2. Run the installer.
3. Most of the options can stay as default. The one thing to pay attention to:
   - On the screen **"Adjusting your PATH environment"**, choose **"Git from the command line and also from 3rd-party software"** (this is usually the default).
4. Click **Next** through the rest and then **Install**.
5. Open a **new** Command Prompt or PowerShell and verify:

```powershell
git --version
# git version 2.x.x
```

> [!IMPORTANT]
> Always open a new terminal after installing Git. An existing window won't see the new installation because the paths need to be reloaded.

</details>

<details>
<summary><strong>Linux</strong></summary>

**Debian / Ubuntu:**

```bash
sudo apt update && sudo apt install git
```

**Fedora / RHEL:**

```bash
sudo dnf install git
```

Verify:

```bash
git --version
# git version 2.x.x
```

</details>

## Troubleshooting

- **`git: command not found` after install on Windows**: you need to open a new terminal window. Git was added to PATH during install, but existing windows won't see it.
- **`xcrun: error: invalid active developer path` on macOS**: run `xcode-select --install` and follow the dialog.
- **SSL errors when cloning**: your network (often corporate networks or public Wi-Fi) may be blocking Git traffic. Try a different network or use a mobile hotspot.
