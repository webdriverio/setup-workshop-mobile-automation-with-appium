# Installing Node.js with NVM on Windows

On Windows we use **nvm-windows**, a separate tool that gives you the same workflow as NVM on Mac/Linux. It installs and manages Node.js for you and avoids permission issues. We use version 2 of nvm-windows.

> [!TIP]
> **Already have nvm-windows?** Skip step 1. Step 2 will download Node.js 24 if you don't have it yet and set it as your default. Other Node.js versions you installed stay available, switch with `nvm use <version>`.

## 1. Install nvm-windows

1. Go to the [nvm-windows releases page](https://github.com/nvm-windows/nvm/releases/latest).
2. In the **Assets** section, download **`nvm-<version>-x64-setup.exe`**. On an ARM laptop, download **`nvm-<version>-arm64-setup.exe`** instead.
3. Double-click the installer to run it. Do **not** right-click and choose "Run as administrator", that would set up nvm-windows for the administrator account instead of yours. If Windows asks for permission, click **Yes**. Click through with all default options, they're fine.
4. At the end, click **Finish**.

> [!IMPORTANT]
> Always open a **new** terminal window after installation. Existing windows won't see nvm-windows yet.

> [!NOTE]
> **Why not winget or Chocolatey?** Both still install the old nvm-windows 1.x. Use the installer above. If you already have nvm-windows 1.x, running the installer upgrades it to 2.x for you.

Open a new PowerShell window and verify:

```powershell
nvm list
```

If you see a list (it may be empty), nvm-windows works. If you see `nvm is not recognized`, see the troubleshooting section below.

## 2. Install Node.js 24

Install Node.js 24 and switch to it. Node.js 24 is the LTS (Long Term Support) version, which is more stable and gets security updates for longer. `nvm use` also makes it your default, so every new terminal uses it.

```powershell
nvm install 24
nvm use 24
```


Verify it worked:

```powershell
node --version   # should print v24.x.x
npm --version    # should print something like 11.x.x
nvm default      # should show v24.x.x
```

If you see version numbers, you're done.

## Troubleshooting

- **`nvm is not recognized`**: make sure you opened a **new** terminal window after installation. Existing windows won't see the new tool.

- **`node --version` doesn't show v24 after `nvm use 24`**: if you previously installed Node.js directly (not via nvm-windows), uninstall it first through **Settings → Apps**, then open a new terminal and run `nvm use 24` again. Having both can cause conflicts.

- **Antivirus software blocks the install**: some antivirus tools block unknown installers. You may need to temporarily disable real-time protection during the installation. Re-enable it right after.

- **Installed as Administrator by mistake**: nvm-windows is then set up for the administrator account, not yours. Uninstall it through **Settings → Apps**, then run the installer again as a normal user.
