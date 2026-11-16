export type BillingPeriod = 'peak' | 'off_peak'

interface PricePair {
  flash: string
  pro: string
}

export interface PriceRows {
  cacheHitInput: PricePair
  cacheMissInput: PricePair
  output: PricePair
}

type PriceTable = Record<BillingPeriod, PriceRows>

export interface PricingInfo {
  period: BillingPeriod | 'unknown'
  periodLabel: string
  rateLabel: string
  beijingTime: string
  docsURL: string
  updatedAt: number
  rows?: PriceRows
  rowsByPeriod?: PriceTable
  error?: { code: string; message: string }
}

const HOURS = 3600
const DAY = 24 * HOURS
const PEAK_WINDOWS = [[9 * HOURS, 12 * HOURS], [14 * HOURS, 18 * HOURS]] as const

// China's statutory dates and additional weekdays off in the State Council's
// annual schedules. DeepSeek specifies statutory holidays and weekends. Its
// public pricing page does not separately classify the additional days off.
// See README.md for the official calendars and the fallback beyond these years.
const holidays: Record<number, { statutory: string[]; additionalDaysOff: string[] } | undefined> = {
  2026: {
    statutory: ['01-01', '02-16', '02-17', '02-18', '02-19', '04-05', '05-01', '05-02', '06-19', '09-25', '10-01', '10-02', '10-03'],
    additionalDaysOff: ['01-02', '02-20', '02-23', '04-06', '05-04', '05-05', '10-05', '10-06', '10-07'],
  },
  2027: {
    statutory: ['01-01', '02-05', '02-06', '02-07', '02-08', '04-05', '05-01', '05-02', '06-09', '09-15', '10-01', '10-02', '10-03'],
    additionalDaysOff: ['02-09', '02-10', '02-11', '02-12', '05-03', '05-04', '05-05', '10-04', '10-05', '10-06', '10-07'],
  },
}

// Dates in this calendar use UTC accessors on a clock shifted to UTC+08:00.
function daytimePeriod(day: Date): BillingPeriod | 'unknown' {
  const weekday = day.getUTCDay()
  if (weekday === 0 || weekday === 6) return 'off_peak'
  const schedule = holidays[day.getUTCFullYear()]
  const monthDay = day.toISOString().slice(5, 10)
  if (schedule === undefined || schedule.additionalDaysOff.includes(monthDay)) return 'unknown'
  return schedule.statutory.includes(monthDay) ? 'off_peak' : 'peak'
}

const billingLabels = {
  peak: { periodLabel: '高峰时段', rateLabel: '全价' },
  off_peak: { periodLabel: '空闲时段', rateLabel: '半价' },
  unknown: { periodLabel: '计费时段待确认', rateLabel: '' },
} as const

interface BillingStatus {
  period: PricingInfo['period']
  periodLabel: string
  rateLabel: string
  beijingTime: string
  next?: { period: BillingPeriod; seconds: number }
}

export function billingStatusAt(now = new Date()): BillingStatus {
  const beijing = new Date(now.getTime() + 8 * HOURS * 1000)
  const beijingTime = beijing.toISOString().slice(11, 16)
  const seconds = beijing.getUTCHours() * HOURS + beijing.getUTCMinutes() * 60 + beijing.getUTCSeconds()
  const currentWindow = PEAK_WINDOWS.find(([start, end]) => seconds >= start && seconds < end)
  const period = currentWindow === undefined ? 'off_peak' : daytimePeriod(beijing)
  const status: BillingStatus = { period, ...billingLabels[period], beijingTime }
  if (period === 'unknown') return status
  if (period === 'peak' && currentWindow !== undefined) {
    return { ...status, next: { period: 'off_peak', seconds: currentWindow[1] - seconds } }
  }

  for (let daysAhead = 0; daysAhead < 14; daysAhead += 1) {
    const date = new Date(beijing.getTime() + daysAhead * DAY * 1000)
    const nextWindow = PEAK_WINDOWS.find(([start]) => daysAhead * DAY + start > seconds)
    if (nextWindow === undefined) continue
    const nextDayPeriod = daytimePeriod(date)
    if (nextDayPeriod === 'unknown') break
    if (nextDayPeriod === 'peak') {
      return { ...status, next: { period: 'peak', seconds: daysAhead * DAY + nextWindow[0] - seconds } }
    }
  }
  return status
}

function textCell(html: string): string {
  return html.replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, '').replace(/<[^>]*>/g, '')
    .replace(/&nbsp;|&#160;/gi, ' ').trim()
}

export function parsePricingTable(html: string): PriceTable {
  const table = Array.from(html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi), ([markup]) => markup)
    .find((markup) => markup.includes('deepseek-flash') && markup.includes('deepseek-v4-pro') && markup.includes('缓存命中'))
  const invalidTable = (): never => { throw new Error('官方人民币价格表格式未匹配') }
  if (table === undefined) return invalidTable()
  const rows = Array.from(table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi), ([, row]) =>
    Array.from(row.matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi), ([, , cell]) => textCell(cell)))
  const modelColumns = rows.find(([label]) => label === '模型')?.slice(1) ?? []
  const flashColumn = modelColumns.indexOf('deepseek-flash')
  const proColumn = modelColumns.indexOf('deepseek-v4-pro')
  if (flashColumn < 0 || proColumn < 0) return invalidTable()

  const prices: Record<BillingPeriod, Partial<PriceRows>> = { peak: {}, off_peak: {} }
  let metric: keyof PriceRows | undefined
  for (const cells of rows) {
    const label = cells.join('').replace(/\s+/g, '')
    if (label.includes('缓存命中')) metric = 'cacheHitInput'
    if (label.includes('缓存未命中')) metric = 'cacheMissInput'
    if (label.includes('百万tokens输出')) metric = 'output'
    const periodIndex = cells.findIndex((cell) => cell === '高峰时段' || cell === '空闲时段')
    if (metric === undefined || periodIndex < 0) continue
    const period = cells[periodIndex] === '高峰时段' ? 'peak' : 'off_peak'
    const flash = cells[periodIndex + 1 + flashColumn]
    const pro = cells[periodIndex + 1 + proColumn]
    const cnyPrice = /^\d+(?:\.\d+)?\s*元$/u
    if (!cnyPrice.test(flash) || !cnyPrice.test(pro) || prices[period][metric] !== undefined) return invalidTable()
    prices[period][metric] = { flash, pro }
  }

  const complete = ({ cacheHitInput, cacheMissInput, output }: Partial<PriceRows>): PriceRows => {
    if (cacheHitInput === undefined || cacheMissInput === undefined || output === undefined) return invalidTable()
    return { cacheHitInput, cacheMissInput, output }
  }
  return { peak: complete(prices.peak), off_peak: complete(prices.off_peak) }
}
