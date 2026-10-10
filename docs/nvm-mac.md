# Installing Node.js with NVM on macOS

NVM (Node Version Manager) is a small program that installs and manages Node.js for you. It's the recommended way to install Node.js because it avoids permission issues and lets you switch versions easily.

> [!TIP]
> **Already have nvm?** Skip step 1. Step 2 will download Node.js 24 if you don't have it yet and set it as your default. Other Node.js versions you installed stay available, switch with `nvm use <version>`.

## 1. Install NVM

Open a terminal and paste in this command:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.8/install.sh | bash
```

You'll see a few lines of output as it installs. When it's done, you'll see something like:

```
=> nvm is already installed in /Users/you/.nvm, trying to update the script
```

or

```
=> Close and reopen your terminal to start using nvm
```

**Close your terminal completely and open a new one.** This is important, NVM won't be available until you do.

Then verify it worked:

```bash
nvm --version
```

You should see a version number like `0.40.8`. If you see `command not found`, see the troubleshooting section below.

## 2. Install Node.js

Now install Node.js 24 and make it your default, so every new terminal uses it. Node.js 24 is the LTS (Long Term Support) version, which is more stable and gets security updates for longer.

```bash
nvm install 24
nvm alias default 24
nvm use 24
```

Verify it worked:

```bash
node --version   # should print v24.x.x
npm --version    # should print something like 11.x.x
```

If you see version numbers, you're done.

## Troubleshooting

- **`nvm: command not found` after install**: you need to close the terminal and open a brand new one. If it still doesn't work after that, the install script may not have updated your shell profile. Check that your `~/.zshrc` file (open it with `open ~/.zshrc`) contains these lines near the bottom:
  ```bash
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  ```
  If those lines are missing, add them manually, save the file, close the terminal, and open a new one.

- **Apple Silicon (M#)**: NVM works natively on Apple Silicon. No Rosetta needed for modern Node.js LTS versions.

- **`curl: command not found`**: curl is pre-installed on macOS, so this shouldn't happen. If it does, try installing Xcode Command Line Tools first: `xcode-select --install`.
