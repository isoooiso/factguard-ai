import { AlertTriangle, CheckCircle2, Info, Link2 } from 'lucide-react'
import { verdictClass, verdictLabel } from '../lib/helpers'
import type { FactReport } from '../lib/types'

export function ReportCard({ report }: { report: FactReport }) {
  return (
    <article className="glass card-gap report-card">
      <div className="row row-between row-start-mobile gap-12">
        <div>
          <div className="eyebrow">{report.content_type}</div>
          <h3>{report.claim}</h3>
        </div>
        <span className={verdictClass(report.verdict)}>{verdictLabel(report.verdict)}</span>
      </div>

      <p className="muted strong">{report.summary}</p>

      <div className="confidence-wrap">
        <div className="row row-between">
          <span>Confidence</span>
          <strong>{report.confidence}%</strong>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${Math.max(4, report.confidence)}%` }} />
        </div>
      </div>

      <div className="grid two-columns small-gap">
        <div className="soft-panel">
          <div className="mini-title"><CheckCircle2 size={16} /> Supporting points</div>
          <ul className="clean-list">
            {report.supporting_points?.length ? (
              report.supporting_points.map((point, index) => <li key={index}>{point}</li>)
            ) : (
              <li>No strong supporting evidence was returned.</li>
            )}
          </ul>
        </div>
        <div className="soft-panel">
          <div className="mini-title"><AlertTriangle size={16} /> Counter points</div>
          <ul className="clean-list">
            {report.counter_points?.length ? (
              report.counter_points.map((point, index) => <li key={index}>{point}</li>)
            ) : (
              <li>No strong counter-evidence was returned.</li>
            )}
          </ul>
        </div>
      </div>

      <div className="soft-panel">
        <div className="mini-title"><Info size={16} /> Explanation</div>
        <p className="muted">{report.explanation}</p>
      </div>

      {!!report.cited_urls?.length && (
        <div className="soft-panel">
          <div className="mini-title"><Link2 size={16} /> Cited sources</div>
          <ul className="clean-list compact-list">
            {report.cited_urls.map((url) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noreferrer">
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!!report.warnings?.length && (
        <div className="warning-box">
          <strong>Warnings</strong>
          <ul className="clean-list compact-list">
            {report.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="row wrap muted tiny-gap">
        <span>Report ID: {report.report_id}</span>
        <span>•</span>
        <span>Visual check: {report.visual_check_used ? 'enabled' : 'disabled'}</span>
        <span>•</span>
        <span>{report.created_at_hint}</span>
      </div>
    </article>
  )
}
