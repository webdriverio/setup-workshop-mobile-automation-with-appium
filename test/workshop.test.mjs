import assert from 'node:assert/strict'
import { test } from 'node:test'
import { LEARNING_POINTS, workshopLines } from '../scripts/lib/workshop.mjs'

const text = () => workshopLines().join('\n')

test('the text names the workshop and lists what people learn, one line per point', () => {
  assert.match(text(), /Making Sense of Mobile Automation with Appium and WebdriverIO/)
  assert.match(text(), /you will learn/)
  for (const point of LEARNING_POINTS) assert.ok(workshopLines().some((line) => line.includes(point)))
})

test('the text says that the half day has some exercises as homework', () => {
  assert.match(text(), /half day a few of them are homework/)
})
