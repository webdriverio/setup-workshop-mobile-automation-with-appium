import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'

const confirm = mock.fn(async () => false)
mock.module('@inquirer/prompts', { namedExports: { confirm } })
const { dry, runPlan } = await import('../scripts/lib/plan.mjs')
const { FLAGS } = await import('../scripts/lib/ui.mjs')

const step = (done, apply = async () => true) => ({ title: 'step', description: 'about step', done, apply })

beforeEach(() => {
  FLAGS.yes = true
  mock.method(console, 'log', () => {})
})
afterEach(() => mock.restoreAll())

test('does nothing and succeeds when every step is done', async () => {
  const apply = mock.fn(async () => true)
  const onReady = mock.fn()
  assert.equal(await runPlan('Test', [step(true, apply)], onReady), true)
  assert.equal(apply.mock.callCount(), 0)
  assert.deepEqual(onReady.mock.calls[0].arguments, [[]])
})

test('applies only the missing steps, in order, and reports them', async () => {
  const order = []
  const steps = [
    step(false, async () => order.push('a')),
    step(true, async () => order.push('skipped')),
    step(false, async () => order.push('b')),
  ]
  const onReady = mock.fn()
  assert.equal(await runPlan('Test', steps, onReady), true)
  assert.deepEqual(order, ['a', 'b'])
  assert.equal(onReady.mock.calls[0].arguments[0].length, 2)
})

test('stops at the first failing step', async () => {
  const later = mock.fn(async () => true)
  const onReady = mock.fn()
  const steps = [step(false, async () => false), step(false, later)]
  assert.equal(await runPlan('Test', steps, onReady), false)
  assert.equal(later.mock.callCount(), 0)
  assert.equal(onReady.mock.callCount(), 0)
})

test('when you answer no, nothing is installed and you are back at the start', async () => {
  FLAGS.yes = false
  const apply = mock.fn(async () => true)
  const onReady = mock.fn()
  assert.equal(await runPlan('Test', [step(false, apply)], onReady), false)
  assert.equal(confirm.mock.callCount(), 1)
  assert.equal(apply.mock.callCount(), 0)
  assert.equal(onReady.mock.callCount(), 0)
})

test('the overview shows which steps are done and which are missing', async () => {
  const lines = []
  console.log.mock.mockImplementation((line) => lines.push(line))
  await runPlan('Test', [{ ...step(true), title: 'Done one' }, { ...step(false), title: 'Todo one' }], () => {})
  const text = lines.join('\n')
  assert.match(text, /Done one.*already done/)
  assert.match(text, /Todo one.*missing/)
  assert.match(text, /about step/)
})

test('dry marks a message as something that would happen', () => {
  const lines = []
  console.log.mock.mockImplementation((line) => lines.push(line))
  dry('would download Java')
  assert.match(lines[0], /\[dry run\] would download Java/)
})
