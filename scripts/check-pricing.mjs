import assert from 'node:assert/strict'
import { billingStatusAt, parsePricingTable } from '../lib/pricing.js'

const status = (date, time) => billingStatusAt(new Date(date + 'T' + time + '+08:00'))
for (const [time, expected] of [
  ['08:59:59', 'off_peak'], ['09:00:00', 'peak'],
  ['11:59:59', 'peak'], ['12:00:00', 'off_peak'],
  ['13:59:59', 'off_peak'], ['14:00:00', 'peak'],
  ['17:59:59', 'peak'], ['18:00:00', 'off_peak'],
]) {
  assert.equal(status('2026-11-16', time).period, expected, time)
}
assert.deepEqual(status('2026-11-16', '14:58:40').next, { period: 'off_peak', seconds: 10880 })
assert.deepEqual(status('2026-11-20', '18:00:00').next, { period: 'peak', seconds: 63 * 3600 })
assert.deepEqual(billingStatusAt(new Date('2026-11-16T01:00:00Z')), status('2026-11-16', '09:00:00'))
assert.equal(status('2026-10-01', '10:00:00').period, 'off_peak')
assert.equal(status('2026-10-10', '10:00:00').period, 'off_peak') // Saturday make-up workday
assert.equal(status('2027-01-01', '10:00:00').period, 'off_peak')
assert.equal(status('2027-02-08', '10:00:00').period, 'off_peak') // Lunar New Year, day three
assert.equal(status('2027-06-09', '10:00:00').period, 'off_peak')
assert.equal(status('2026-10-05', '10:00:00').period, 'unknown') // Additional weekday off
assert.equal(status('2026-10-04', '10:00:00').next, undefined) // Cannot certify the next peak.
assert.equal(status('2028-01-03', '10:00:00').period, 'unknown') // Unpublished schedule
assert.equal(status('2028-01-03', '19:00:00').period, 'off_peak')

const table = `<table>
<tr><th>模型</th><th><code>deepseek-v4-pro</code></th><th><code>deepseek-flash</code><sup>(1)</sup></th></tr>
<tr><td rowspan="6">价格</td><td rowspan="2">百万tokens输入<br/>（缓存命中）</td><td>空闲时段</td><td>0.15元</td><td>0.02元</td></tr>
<tr><td>高峰时段</td><td><strong>0.30元</strong></td><td>0.04元</td></tr>
<tr><td rowspan="2">百万tokens输入（缓存未命中）</td><td>空闲时段</td><td>4.5元</td><td>1元</td></tr>
<tr><td>高峰时段</td><td>9.0元</td><td>2元</td></tr>
<tr><td rowspan="2">百万 tokens 输出</td><td>空闲时段</td><td>13.5元</td><td>4元</td></tr>
<tr><td>高峰时段</td><td>27.0元</td><td>8元</td></tr>
</table>`
assert.deepEqual(parsePricingTable(table), {
  peak: {
    cacheHitInput: { flash: '0.04元', pro: '0.30元' },
    cacheMissInput: { flash: '2元', pro: '9.0元' },
    output: { flash: '8元', pro: '27.0元' },
  },
  off_peak: {
    cacheHitInput: { flash: '0.02元', pro: '0.15元' },
    cacheMissInput: { flash: '1元', pro: '4.5元' },
    output: { flash: '4元', pro: '13.5元' },
  },
})
assert.throws(() => parsePricingTable(table.replace('<td>8元</td>', '<td>$1.2</td>')), /人民币价格表/)
assert.throws(() => parsePricingTable(table.replace('<tr><td>高峰时段</td><td>27.0元</td><td>8元</td></tr>', '')), /人民币价格表/)

console.log('PASS: Beijing-time boundaries, holiday calendars, and both official price tiers')
