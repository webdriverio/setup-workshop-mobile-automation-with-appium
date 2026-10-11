import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { test } from 'node:test'

const { canReach, proxyUrl } = await import('../scripts/lib/network.mjs')

test('the proxy is read from the usual variables, upper or lower case', () => {
  assert.equal(proxyUrl({}), null)
  assert.equal(proxyUrl({ HTTPS_PROXY: 'http://a:1' }), 'http://a:1')
  assert.equal(proxyUrl({ https_proxy: 'http://b:2' }), 'http://b:2')
  assert.equal(proxyUrl({ HTTP_PROXY: 'http://c:3' }), 'http://c:3')
  assert.equal(proxyUrl({ http_proxy: 'http://d:4' }), 'http://d:4')
})

test('a server is reachable when it answers, whatever it answers', async () => {
  const server = createServer((req, res) => res.writeHead(404).end())
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    assert.equal(await canReach(`http://127.0.0.1:${server.address().port}/`), true)
  } finally {
    server.close()
  }
})

test('a server is not reachable when nothing answers or it is too slow', async () => {
  assert.equal(await canReach('http://127.0.0.1:1/'), false)
  const server = createServer(() => {})
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    assert.equal(await canReach(`http://127.0.0.1:${server.address().port}/`, { timeout: 100 }), false)
  } finally {
    server.closeAllConnections()
    server.close()
  }
})
