import { fetchVersions, namedTarget, resolveVersion } from 'start-android-emulator'

// Android 17. Pinned on purpose (not "latest"), so every attendee gets the same version. 37.1+ only ship 16 KB page-size images.
export const API_LEVEL = '37.0'

// The workshop needs two emulators. Both Pixel 10 on the Android version above.
// avdmanager has no pixel_10 hardware profile yet, but the Pixel 10 screen is identical to the Pixel 9 (1080x2424),
// so we use the pixel_9 profile with the Pixel 10 skin (the device frame around the screen).
export const PIXEL_MODEL = 10
export const AVD_DEVICE = { profile: 'pixel_9', skin: `pixel_${PIXEL_MODEL}` }
export const AVD_NAMES = [1, 2].map((n) => `Workshop_${n}_Pixel_${PIXEL_MODEL}_API_${API_LEVEL.replace('.', '_')}`)

/** What the setup works towards: the two workshop emulators on the pinned Android version. */
export async function workshopTarget() {
  const { versions } = await fetchVersions()
  return namedTarget(resolveVersion(API_LEVEL, versions), AVD_NAMES.map((name) => ({ name, device: AVD_DEVICE })))
}
