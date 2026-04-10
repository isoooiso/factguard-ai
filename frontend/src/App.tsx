import { useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  Blocks,
  BrainCircuit,
  LoaderCircle,
  Network,
  SearchCheck,
  Shield,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { ReportCard } from './components/ReportCard'
import { shortAddress } from './lib/helpers'
import { connectWallet, getDefaultConfig, loadRecentReports, submitVerification } from './lib/genlayer'
import type { AppConfig, FactReport, VerifyFormState } from './lib/types'
import { makeReportId } from './lib/helpers'

const CONFIG_KEY = 'factguard-config-v1'

const defaultForm = (): VerifyFormState => ({
  reportId: makeReportId(),
  contentType: 'article',
  claim: '',
  contentText: '',
  sourceUrlsText: '',
  notes: '',
  includeVisualCapture: true,
})

export default function App() {
  const [config, setConfig] = useState<AppConfig>(() => {
    const fallback = getDefaultConfig()
    const saved = localStorage.getItem(CONFIG_KEY)
    if (!saved) return fallback
    try {
      return { ...fallback, ...JSON.parse(saved) }
    } catch {
      return fallback
    }
  })
  const [walletAddress, setWalletAddress] = useState<string>('')
  const [provider, setProvider] = useState<any>(null)
  const [form, setForm] = useState<VerifyFormState>(defaultForm())
  const [currentReport, setCurrentReport] = useState<FactReport | null>(null)
  const [recentReports, setRecentReports] = useState<FactReport[]>([])
  const [loadingReports, setLoadingReports] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  }, [config])

  useEffect(() => {
    if (!config.contractAddress) {
      setRecentReports([])
      return
    }

    let cancelled = false
    const run = async () => {
      setLoadingReports(true)
      setError('')
      try {
        const reports = await loadRecentReports(config, 6)
        if (!cancelled) setRecentReports(reports)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load reports.')
      } finally {
        if (!cancelled) setLoadingReports(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [config])

  const connect = async () => {
    setError('')
    try {
      const wallet = await connectWallet()
      setWalletAddress(wallet.address)
      setProvider(wallet.provider)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wallet connection failed.')
    }
  }

  const canSubmit =
    !!walletAddress &&
    !!provider &&
    !!config.contractAddress.trim() &&
    form.claim.trim().length > 10 &&
    form.contentText.trim().length > 30

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setStatusText('Submitting transaction to GenLayer...')

    try {
      const result = await submitVerification(config, { address: walletAddress, provider }, form)
      setCurrentReport(result.report)
      setRecentReports((prev) => [result.report, ...prev.filter((item) => item.report_id !== result.report.report_id)].slice(0, 6))
      setStatusText(`Accepted on-chain: ${result.txHash}`)
      setForm(defaultForm())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.')
      setStatusText('')
    } finally {
      setSubmitting(false)
    }
  }

  const statCards = useMemo(
    () => [
      {
        icon: <Shield size={20} />,
        title: 'Consensus-backed judgment',
        text: 'The verdict is produced inside a GenLayer intelligent contract instead of a normal off-chain API.',
      },
      {
        icon: <SearchCheck size={20} />,
        title: 'Text + source-aware checks',
        text: 'Paste the claim, the source text, and optional URLs to let the contract reason about evidence quality and contradictions.',
      },
      {
        icon: <BrainCircuit size={20} />,
        title: 'Visual corroboration',
        text: 'Optionally capture a webpage screenshot from the first source URL and include it in the on-chain reasoning path.',
      },
    ],
    [],
  )

  return (
    <div className="page-shell">
      <div className="bg-orb orb-1" />
      <div className="bg-orb orb-2" />
      <div className="bg-grid" />

      <main className="container">
        <section className="hero glass">
          <div className="hero-copy">
            <span className="pill"><Sparkles size={14} /> GenLayer-powered fact verification</span>
            <h1>FactGuard AI</h1>
            <p className="hero-text">
              Verify text, articles, tweets, and video transcripts with a beautiful static frontend on GitHub Pages and an
              intelligent GenLayer contract behind the verdict.
            </p>
            <div className="hero-actions">
              <button className="primary-btn" onClick={connect} type="button">
                <Wallet size={16} /> {walletAddress ? `Connected: ${shortAddress(walletAddress)}` : 'Connect wallet'}
              </button>
              <div className="chip subtle-chip">
                <Network size={14} /> {config.network}
              </div>
              <div className="chip subtle-chip">
                <Blocks size={14} /> {config.contractAddress ? 'Contract set' : 'Contract missing'}
              </div>
            </div>
          </div>
          <div className="hero-panel">
            <div className="feature-box">
              <div className="feature-number">01</div>
              <div>
                <strong>Paste the claim and source material</strong>
                <p>Works best with article excerpts, tweet text, transcript chunks, and source links.</p>
              </div>
            </div>
            <div className="feature-box">
              <div className="feature-number">02</div>
              <div>
                <strong>Submit to the intelligent contract</strong>
                <p>The contract fetches optional web evidence and asks GenLayer validators to reach a verdict.</p>
              </div>
            </div>
            <div className="feature-box">
              <div className="feature-number">03</div>
              <div>
                <strong>Review structured reasoning</strong>
                <p>You get a verdict, confidence score, supporting points, counter-points, warnings, and cited URLs.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="stats-grid">
          {statCards.map((item) => (
            <article className="glass stat-card" key={item.title}>
              <div className="icon-badge">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </section>

        <section className="grid main-grid">
          <div className="glass form-card">
            <div className="section-heading">
              <div>
                <div className="eyebrow">Setup</div>
                <h2>Runtime configuration</h2>
              </div>
              <BadgeCheck size={20} />
            </div>

            <div className="grid two-columns small-gap">
              <label className="field">
                <span>GenLayer network</span>
                <select
                  value={config.network}
                  onChange={(event) => setConfig((prev) => ({ ...prev, network: event.target.value as AppConfig['network'] }))}
                >
                  <option value="studionet">studionet</option>
                  <option value="localnet">localnet</option>
                  <option value="testnetBradbury">testnetBradbury</option>
                  <option value="testnetAsimov">testnetAsimov</option>
                </select>
              </label>

              <label className="field field-span-2">
                <span>Deployed contract address</span>
                <input
                  placeholder="0x..."
                  value={config.contractAddress}
                  onChange={(event) => setConfig((prev) => ({ ...prev, contractAddress: event.target.value.trim() }))}
                />
              </label>
            </div>

            <div className="divider" />

            <div className="section-heading">
              <div>
                <div className="eyebrow">Verify</div>
                <h2>Submit a new fact-check</h2>
              </div>
            </div>

            <form className="form-stack" onSubmit={onSubmit}>
              <div className="grid two-columns small-gap">
                <label className="field">
                  <span>Content type</span>
                  <select value={form.contentType} onChange={(event) => setForm((prev) => ({ ...prev, contentType: event.target.value }))}>
                    <option value="article">Article</option>
                    <option value="tweet">Tweet / thread</option>
                    <option value="video-transcript">Video transcript</option>
                    <option value="plain-text">Plain text</option>
                  </select>
                </label>

                <label className="field">
                  <span>Report ID</span>
                  <input value={form.reportId} onChange={(event) => setForm((prev) => ({ ...prev, reportId: event.target.value }))} />
                </label>
              </div>

              <label className="field">
                <span>Claim to verify</span>
                <textarea
                  rows={3}
                  placeholder="Example: This video proves that a new law was passed yesterday."
                  value={form.claim}
                  onChange={(event) => setForm((prev) => ({ ...prev, claim: event.target.value }))}
                />
              </label>

              <label className="field">
                <span>Source text / transcript / excerpt</span>
                <textarea
                  rows={10}
                  placeholder="Paste the article body, tweet text, transcript segment, or the exact passage you want verified."
                  value={form.contentText}
                  onChange={(event) => setForm((prev) => ({ ...prev, contentText: event.target.value }))}
                />
              </label>

              <div className="grid two-columns small-gap">
                <label className="field">
                  <span>Source URLs</span>
                  <textarea
                    rows={5}
                    placeholder="One URL per line. The contract will try to use the first few URLs as evidence."
                    value={form.sourceUrlsText}
                    onChange={(event) => setForm((prev) => ({ ...prev, sourceUrlsText: event.target.value }))}
                  />
                </label>

                <label className="field">
                  <span>Analyst notes</span>
                  <textarea
                    rows={5}
                    placeholder="Optional context: region, timeframe, why this claim matters, or what kind of contradiction you suspect."
                    value={form.notes}
                    onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  />
                </label>
              </div>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={form.includeVisualCapture}
                  onChange={(event) => setForm((prev) => ({ ...prev, includeVisualCapture: event.target.checked }))}
                />
                <span>Use visual webpage capture for the first source URL</span>
              </label>

              <button className="primary-btn large-btn" type="submit" disabled={!canSubmit || submitting}>
                {submitting ? <LoaderCircle size={16} className="spin" /> : <Shield size={16} />}
                {submitting ? 'Checking on-chain...' : 'Run fact-check'}
              </button>

              {!canSubmit && (
                <p className="muted tiny-gap">
                  Connect your wallet, set the deployed contract address, and provide enough claim/source text before submitting.
                </p>
              )}
            </form>
          </div>

          <div className="side-column">
            <div className="glass status-card">
              <div className="section-heading compact">
                <div>
                  <div className="eyebrow">Status</div>
                  <h2>Session</h2>
                </div>
              </div>
              <div className="stack gap-10">
                <div className="status-line"><strong>Wallet:</strong> {shortAddress(walletAddress)}</div>
                <div className="status-line"><strong>Network:</strong> {config.network}</div>
                <div className="status-line break-all"><strong>Contract:</strong> {config.contractAddress || 'not set yet'}</div>
                {statusText && <div className="success-box">{statusText}</div>}
                {error && <div className="error-box">{error}</div>}
              </div>
            </div>

            <div className="glass tips-card">
              <div className="section-heading compact">
                <div>
                  <div className="eyebrow">Best practice</div>
                  <h2>How to get better verdicts</h2>
                </div>
              </div>
              <ul className="clean-list compact-list">
                <li>Paste the exact claim instead of a vague topic.</li>
                <li>For videos, include the transcript segment you want checked.</li>
                <li>Add 1–3 URLs from stronger sources when possible.</li>
                <li>Use notes to specify timeframe, geography, or the exact suspected fake angle.</li>
              </ul>
            </div>
          </div>
        </section>

        {currentReport && (
          <section className="stack gap-16">
            <div className="section-heading section-space">
              <div>
                <div className="eyebrow">Latest result</div>
                <h2>Current report</h2>
              </div>
            </div>
            <ReportCard report={currentReport} />
          </section>
        )}

        <section className="stack gap-16 bottom-space">
          <div className="section-heading section-space">
            <div>
              <div className="eyebrow">History</div>
              <h2>Recent on-chain reports</h2>
            </div>
          </div>

          {loadingReports ? (
            <div className="glass loading-box"><LoaderCircle className="spin" size={18} /> Loading reports...</div>
          ) : recentReports.length ? (
            <div className="stack gap-16">
              {recentReports.map((report) => (
                <ReportCard key={report.report_id} report={report} />
              ))}
            </div>
          ) : (
            <div className="glass empty-box">
              No reports loaded yet. Deploy the contract, paste its address above, and submit your first verification.
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
