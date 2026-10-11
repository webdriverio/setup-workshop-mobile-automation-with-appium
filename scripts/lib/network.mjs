/**
 * Network questions for the check. Behind a company proxy (HTTPS_PROXY / HTTP_PROXY) the check says so, the relaunch
 * with proxy support (NODE_USE_ENV_PROXY=1) comes from start-android-emulator.
 */

export const proxyUrl = (env = process.env) => env.HTTPS_PROXY || env.https_proxy || env.HTTP_PROXY || env.http_proxy || null

/** Can we reach this server? Any answer, even "not found", means yes. */
export async function canReach(url, { timeout = 8000 } = {}) {
  try {
    await fetch(url, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(timeout) })
    return true
  } catch {
    return false
  }
}
