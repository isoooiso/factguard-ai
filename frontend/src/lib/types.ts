export type Verdict = 'LIKELY_TRUE' | 'LIKELY_FALSE' | 'MIXED_OR_UNCLEAR'

export type FactReport = {
  report_id: string
  content_type: string
  claim: string
  input_excerpt: string
  verdict: Verdict
  confidence: number
  summary: string
  explanation: string
  supporting_points: string[]
  counter_points: string[]
  cited_urls: string[]
  warnings: string[]
  method: string
  created_at_hint: string
  visual_check_used: boolean
  submitted_by: string
}

export type NetworkKey = 'studionet' | 'localnet' | 'testnetBradbury' | 'testnetAsimov'

export type AppConfig = {
  network: NetworkKey
  contractAddress: string
}

export type VerifyFormState = {
  reportId: string
  contentType: string
  claim: string
  contentText: string
  sourceUrlsText: string
  notes: string
  includeVisualCapture: boolean
}

export type VerifyResult = {
  txHash: string
  report: FactReport
}
