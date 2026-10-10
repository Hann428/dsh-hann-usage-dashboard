/** Verify the renamed package's built loader, routes, and saved thresholds. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = new URL('../', import.meta.url)
const manifest = JSON.parse(fs.readFileSync(new URL('package.json', root), 'utf8'))
const expected = 'dsh-hann-usage-dashboard'
assert.equal(manifest.name, expected)
assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml')
const patch = require('js-yaml').load(fs.readFileSync(new URL('cordis.patch.yml', root), 'utf8'))
assert.equal(patch[0].insert[0].name, expected)
assert.equal(patch[0].insert[0].id, expected)

const bundle = fs.readFileSync(new URL('lib/client.js', root), 'utf8')
const oldKey = 'dsh-usage-dashboard:health-thresholds'
const newKey = `${expected}:health-thresholds`
const legacy = { alertBalance: '89', alertBalancePercent: '6', alertBalanceEnabled: true, alertBalancePercentEnabled: false }
const current = { ...legacy, alertBalance: '12', alertBalanceEnabled: false }

function mountClient(entries, writeFails = false) {
  const storage = new Map(entries)
  const states = []
  const effects = []
  const requests = []
  let registration
  let renderPanel
  let client
  const react = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useState: (initial) => {
      const value = typeof initial === 'function' ? initial() : initial
      states.push(value)
      return [value, () => {}]
    },
    useEffect: (effect) => { effects.push(effect) },
    useMemo: (compute) => compute(),
    useSyncExternalStore: (_subscribe, read) => read(),
  }
  const window = {
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => {
        if (writeFails) throw new Error('Storage is read-only')
        storage.set(key, value)
      },
    },
    setInterval: () => 1,
    clearInterval: () => {},
    __ModuleLoader__: {
      load: ({ id, factory }) => {
        assert.equal(id, expected)
        client = factory((name) => {
          assert.equal(name, 'react')
          return react
        })
      },
    },
  }
  vm.runInNewContext(bundle, {
    window,
    fetch: async (url) => {
      requests.push(url)
      return { ok: true, json: async () => ({ configured: false }) }
    },
  })
  assert.equal(client.name, expected)
  client.apply({
    effect: (effect) => effect(),
    slots: {
      inject: (_slot, register) => register(),
      register: (meta, render) => { registration = meta; renderPanel = render },
    },
  })
  assert.equal(registration.id, expected)
  const panel = renderPanel()
  panel.type()
  const cleanups = effects.map((effect) => effect()).filter((cleanup) => typeof cleanup === 'function')
  assert.equal(requests[0], '/dsh-hann-usage/api/balance')
  cleanups.forEach((cleanup) => cleanup())
  return { storage, thresholds: JSON.parse(JSON.stringify(states[2])) }
}

const migrated = mountClient([[oldKey, JSON.stringify(legacy)]])
assert.deepEqual(migrated.thresholds, legacy)
assert.deepEqual(JSON.parse(migrated.storage.get(newKey)), legacy)
assert.deepEqual(mountClient([[oldKey, JSON.stringify(legacy)], [newKey, JSON.stringify(current)]]).thresholds, current)
assert.deepEqual(mountClient([[oldKey, JSON.stringify(legacy)]], true).thresholds, legacy)
assert.equal(mountClient([[oldKey, 'not-json']]).thresholds.alertBalanceEnabled, false)
assert.equal(mountClient([]).thresholds.alertBalancePercentEnabled, false)

const host = await import(new URL('lib/index.js', root))
assert.equal(host.name, expected)
const routes = []
const tools = []
host.apply({
  effect: (effect) => effect(),
  webServer: { register: (route) => { routes.push(route); return () => {} } },
  tools: { register: (tool) => { tools.push(tool); return () => {} } },
  credentials: { resolve: async () => undefined },
}, {
  keyRef: 'DEEPSEEK_API_KEY', baseURL: 'https://api.deepseek.com',
  platformUsageURL: 'https://platform.deepseek.com/usage', timeoutMs: 10000,
  healthCurrency: 'CNY', alertBalance: 0, alertBalancePercent: 0, balancePercentBase: 0,
})
assert.equal(routes.length, 1)
assert.equal(routes[0].path, '/dsh-hann-usage/api')
assert.equal(tools.length, 1)
let response
const res = {
  writeHead: (status) => { res.status = status },
  end: (body) => { response = JSON.parse(body) },
}
await routes[0].handler({ method: 'GET', url: '/dsh-usage/api/balance' }, res)
assert.equal(res.status, 404)
const originalFetch = globalThis.fetch
globalThis.fetch = async () => { throw new Error('Offline smoke check') }
try {
  await routes[0].handler({ method: 'GET', url: '/dsh-hann-usage/api/balance' }, res)
  assert.equal(res.status, 200)
  assert.equal(response.configured, false)
  assert.ok(response.error.code)
} finally {
  globalThis.fetch = originalFetch
}
console.log('PASS: package/patch/module ids, panel registration, threshold migration, renamed route, and missing-key handling')
