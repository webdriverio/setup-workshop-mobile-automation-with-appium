import { bold, cyan, dim } from './ui.mjs'

/** What people learn in the workshop, the same for the full day and the half day. */
export const LEARNING_POINTS = [
  'how Appium and WebdriverIO talk to a device, from the request to the response',
  'how to find elements the smart way: accessibility ID first, then UiAutomator, predicate strings and class chains, with XPath as the last resort',
  'how to tap, swipe, scroll and long press with the W3C Actions API and the mobile gestures of WebdriverIO',
  'how to read the two layers of logs, WebdriverIO and Appium, to see why a test fails',
  'how to deal with permission modals, and how to test webviews and hybrid apps by switching contexts',
]

/**
 * The text that is shown while the emulators and simulators start, one line at a time. A line without text is a pause
 * for the eye only, so the caller does not wait after it.
 */
export function workshopLines() {
  return [
    bold(cyan('Making Sense of Mobile Automation with Appium and WebdriverIO')),
    dim('To turn frustration into understanding'),
    '',
    'In this workshop you will learn:',
    '',
    ...LEARNING_POINTS.map((point) => `  ${cyan('•')} ${point}`),
    '',
    dim('Full day or half day, you work through the same exercises. In the half day a few of them are homework, so you finish those after the workshop.'),
  ]
}
