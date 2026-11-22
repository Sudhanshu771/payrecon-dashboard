import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { explainResult, getRun, type Explanation, type MatchStatus, type ReconciliationReport } from '../api';

type ReportLine = ReconciliationReport['results'][number];
import StatusBadge from '../components/StatusBadge';
import { formatDateTime, formatMoney, shortId } from '../format';

const FILTERS: { value: MatchStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'MATCHED', label: 'Matched' },
  { value: 'AMOUNT_MISMATCH', label: 'Mismatch' },
  { value: 'MISSING_IN_BANK', label: 'Missing in bank' },
  { value: 'MISSING_IN_OURS', label: 'Missing in ours' },
];

// One run's full report. The runId comes from the URL: /reconciliation/:runId
export default function RunDetailsPage() {
  const { runId } = useParams();
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<MatchStatus | 'ALL'>('ALL');

  useEffect(() => {
    if (!runId) return;
    getRun(runId).then(setReport).catch(err => setError(err.message));
  }, [runId]);       // re-load if the URL points to a different run

  if (error) return <p className="error">{error}</p>;
  if (!report) return <p className="muted">Loading…</p>;

  // "Derived data": computed from state on every draw, not stored separately
  const lines = filter === 'ALL' ? report.results : report.results.filter(r => r.status === filter);

  return (
    <>
      <p><Link to="/reconciliation">← All runs</Link></p>
      <h1>Reconciliation report</h1>
      <p className="muted">
        Run {shortId(report.runId)} · statement {shortId(report.statementId)} · {formatDateTime(report.runAt)}
      </p>

      <div className="metrics">
        <Metric label="Matched" value={report.matched} tone="ok" />
        <Metric label="Amount mismatch" value={report.amountMismatch} tone="warn" />
        <Metric label="Missing in bank" value={report.missingInBank} tone="bad" />
        <Metric label="Missing in ours" value={report.missingInOurs} tone="bad" />
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Lines</h2>
          <div className="chips">
            {FILTERS.map(f => (
              <button key={f.value} type="button"
                      className={filter === f.value ? 'chip active' : 'chip'}
                      onClick={() => setFilter(f.value)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Status</th><th>Reference</th><th>Bank txn</th><th>Our payment</th>
                <th className="num">Ours</th><th className="num">Bank</th><th className="num">Difference</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map(line => <LineRow key={line.id} line={line} />)}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

// One report line + its own "Explain" button and answer. Each row keeps its OWN state.
function LineRow({ line }: { line: ReportLine }) {
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function explain(refresh: boolean) {
    setLoading(true);
    setError(null);
    try {
      setExplanation(await explainResult(line.id, refresh));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not get an explanation');
    } finally {
      setLoading(false);
    }
  }

  const canExplain = line.status !== 'MATCHED';

  return (
    <>
      <tr>
        <td><StatusBadge status={line.status} /></td>
        <td>{line.reference}</td>
        <td className="mono">{line.bankTxnId ?? '–'}</td>
        <td className="mono">{shortId(line.expectedPaymentId)}</td>
        <td className="num">{formatMoney(line.expectedAmount)}</td>
        <td className="num">{formatMoney(line.bankAmount)}</td>
        <td className={`num ${line.difference && line.difference !== 0 ? 'warn' : ''}`}>
          {formatMoney(line.difference)}
        </td>
        <td className="num">
          {canExplain && !explanation && (
            <button type="button" className="small" disabled={loading} onClick={() => explain(false)}>
              {loading ? 'Thinking…' : '✨ Explain'}
            </button>
          )}
        </td>
      </tr>
      {(explanation || error) && (
        <tr className="explain-row">
          <td colSpan={8}>
            {error && <p className="error">{error}</p>}
            {explanation && (
              <div className="explain-box">
                <p>{explanation.explanation}</p>
                <p className="hint-line">
                  {explanation.source === 'AI' ? `AI suggestion (${explanation.model})` : 'Rule-based hint (AI not configured)'}
                  {' · '}review before acting · asked by {explanation.requestedBy}
                  {' · '}
                  <button type="button" className="link" disabled={loading} onClick={() => explain(true)}>
                    {loading ? 'asking…' : 'ask again'}
                  </button>
                </p>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: 'ok' | 'warn' | 'bad' }) {
  return (
    <div className="metric">
      <span className="muted">{label}</span>
      <strong className={value > 0 ? tone : ''}>{value}</strong>
    </div>
  );
}
