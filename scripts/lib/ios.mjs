import { namedTarget } from 'start-ios-simulator'

// The workshop needs two simulators, like on Android. iPhone 17 Pro on the iOS version that ships with the installed Xcode.
export const IPHONE_MODEL = 'iPhone 17 Pro'
export const SIMULATOR_NAMES = [1, 2].map((n) => `Workshop_${n}_${IPHONE_MODEL.replaceAll(' ', '_')}_iOS_{ios}`)

/** What the setup works towards: the two workshop simulators on the iOS version of the installed Xcode. */
export const workshopTarget = (state) => namedTarget(state, state.sdkVersion, SIMULATOR_NAMES, IPHONE_MODEL)
