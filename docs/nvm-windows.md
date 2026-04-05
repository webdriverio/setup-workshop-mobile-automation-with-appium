# Installing Node.js with NVM on Windows

On Windows we use **nvm-windows**, a separate tool that gives you the same workflow as NVM on Mac/Linux. It installs and manages Node.js for you and avoids permission issues.

## 1. Install nvm-windows

1. Go to the [nvm-windows releases page](https://github.com/coreybutler/nvm-windows/releases/latest).
2. Look for the **Assets** section and download **`nvm-setup.exe`**.
3. Run the installer. Click through with all default options, they're fine.
4. At the end, click **Finish**.

> [!IMPORTANT]
> Always open a **new** terminal window after installation. Existing windows won't see nvm-windows yet.

Open a new PowerShell window and verify:

```powershell
nvm version
```

You should see a version number like `1.1.12`. If you see `nvm is not recognized`, see the troubleshooting section below.

## 2. Install Node.js

Install the latest LTS (Long Term Support) version of Node.js. LTS versions are more stable and are a better choice for day-to-day work.

```powershell
nvm install lts
nvm use lts
```

> [!NOTE]
> If you get an "Access denied" error when running `nvm use lts`, right-click on PowerShell in the Start menu and choose **Run as Administrator**. Run `nvm use lts` once as Administrator. After that, you can go back to a normal terminal.

Verify it worked:

```powershell
node --version   # should print something like v22.x.x
npm --version    # should print something like 10.x.x
```

If you see version numbers, you're done.

## Troubleshooting

- **`nvm is not recognized`**: make sure you opened a **new** terminal window after installation. Existing windows won't see the new tool.

- **"Access denied" when running `nvm use`**: run PowerShell as Administrator for this one command. Right-click PowerShell → **Run as Administrator**, run `nvm use lts`, then close it. You can use a normal terminal after this.

- **Antivirus software blocks the install**: some antivirus tools flag nvm-windows because it creates symbolic links (shortcuts) between folders. You may need to temporarily disable real-time protection during the `nvm use lts` step. Re-enable it right after.

- **Multiple Node.js versions causing confusion**: if you previously installed Node.js directly (not via nvm-windows), uninstall it first through **Settings → Apps** before using nvm-windows. Having both can cause conflicts.
