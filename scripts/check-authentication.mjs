/** Verify upstream authentication errors never expose credential values. */
import assert from 'node:assert/strict'
import { apply } from '../lib/index.js'

const config = {
  keyRef: 'DEEPSEEK_API_KEY', baseURL: 'https://api.deepseek.com',
  platformUsageURL: 'https://platform.deepseek.com/usage', timeoutMs: 10000,
  healthCurrency: 'CNY', alertBalance: 0, alertBalancePercent: 0, balancePercentBase: 0,
}
const secret = 'test-only-credential'
let route
apply({
  effect: (effect) => effect(),
  webServer: { register: (value) => { route = value; return () => {} } },
  tools: { register: () => () => {} },
  credentials: { resolve: async () => ({ value: secret, source: 'file' }) },
}, config)

const originalFetch = globalThis.fetch
try {
  for (const status of [401, 403, 200]) {
    globalThis.fetch = async (url, options) => {
      if (url !== `${config.baseURL}/user/balance`) throw new Error('Pricing offline')
      assert.equal(options.headers.authorization, `Bearer ${secret}`)
      return {
        ok: status === 200, status, statusText: 'Test response',
        json: async () => ({ is_available: true, balance_infos: [
          { currency: 'CNY', total_balance: '82.41', granted_balance: '0', topped_up_balance: '82.41' },
        ] }),
      }
    }
    let response
    await route.handler({ method: 'GET', url: '/dsh-hann-usage/api/balance' }, {
      writeHead: (code) => assert.equal(code, 200),
      end: (text) => { assert.ok(!text.includes(secret)); response = JSON.parse(text) },
    })
    assert.equal(response.source, 'file')
    assert.equal(response.configured, status === 200)
    if (status === 200) {
      assert.equal(response.health.amount, 82.41)
    } else {
      assert.equal(response.error.code, `HTTP_${status}`)
      assert.equal(response.health.level, 'unknown')
      if (status === 401) assert.match(response.error.message, /设置.*模型.*DEEPSEEK_API_KEY.*刷新/)
      else assert.match(response.error.message, /403/)
    }
  }
} finally {
  globalThis.fetch = originalFetch
}
console.log('PASS: upstream 401/403, credential source, secret exclusion, and valid balance')
