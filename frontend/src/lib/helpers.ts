import type { FactReport, Verdict } from './types'

export function makeReportId() {
  const random = Math.random().toString(36).slice(2, 8)
  return `report-${Date.now()}-${random}`
}

export function parseMultilineUrls(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export function safeParseReport(raw: unknown): FactReport | null {
  if (typeof raw !== 'string') return null
  try {
    const parsed = JSON.parse(raw) as FactReport
    if (!parsed || typeof parsed !== 'object') return null
    if (!parsed.report_id || !parsed.verdict || !parsed.summary) return null
    return parsed
  } catch {
    return null
  }
}

export function verdictLabel(verdict: Verdict) {
  switch (verdict) {
    case 'LIKELY_TRUE':
      return 'Likely true'
    case 'LIKELY_FALSE':
      return 'Likely false'
    default:
      return 'Mixed / unclear'
  }
}

export function verdictClass(verdict: Verdict) {
  switch (verdict) {
    case 'LIKELY_TRUE':
      return 'badge badge-true'
    case 'LIKELY_FALSE':
      return 'badge badge-false'
    default:
      return 'badge badge-mixed'
  }
}

export function shortAddress(address?: string | null) {
  if (!address) return 'Not connected'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
