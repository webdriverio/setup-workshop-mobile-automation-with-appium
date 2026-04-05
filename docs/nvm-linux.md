# Installing Node.js with NVM on Linux

NVM (Node Version Manager) is a small program that installs and manages Node.js for you. It's the recommended way to install Node.js because it avoids permission issues and lets you switch versions easily.

## 1. Install NVM

Open a terminal and paste in this command:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
```

> [!NOTE]
> If `curl` is not installed, use `wget` instead:
> ```bash
> wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
> ```

You'll see a few lines of output as it installs. When it's done, you'll see something like:

```
=> Close and reopen your terminal to start using nvm or run the following to use it now:
```

**Close your terminal completely and open a new one.** This is important, NVM won't be available until you do.

Then verify it worked:

```bash
nvm --version
```

You should see a version number like `0.40.4`. If you see `command not found`, see the troubleshooting section below.

## 2. Install Node.js

Now install the latest LTS (Long Term Support) version of Node.js. LTS versions are more stable and get security updates for longer.

```bash
nvm install --lts
nvm use --lts
```

Verify it worked:

```bash
node --version   # should print something like v22.x.x
npm --version    # should print something like 10.x.x
```

If you see version numbers, you're done.

## Troubleshooting

- **`nvm: command not found` after opening a new terminal**: the install script may not have updated your shell profile. Check that your `~/.bashrc` (or `~/.zshrc` if you use zsh) contains these lines:
  ```bash
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  ```
  If they're missing, add them manually, save the file, then run `source ~/.bashrc` and try again.

- **Permissions errors**: NVM installs into `~/.nvm` in your home directory, so you should never need `sudo`. If you see permission errors, make sure you're not accidentally running the command as root.

- **Never use `sudo` with npm**: when Node.js is installed via NVM, running `sudo npm install -g` can cause problems. You don't need sudo with NVM.
