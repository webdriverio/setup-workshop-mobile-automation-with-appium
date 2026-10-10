import { Launcher } from '@wdio/cli'

// Runs in its own process: the runner keeps the config in memory, so each platform needs a fresh process
process.exit(await new Launcher(new URL('./wdio.conf.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')).run())
