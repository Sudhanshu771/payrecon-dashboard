import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listRuns, type RunSummary } from '../api';
import { formatDateTime, shortId } from '../format';

// List of every reconciliation run; click a row to open its report
export default function ReconciliationPage() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listRuns().then(setRuns).catch(err => setError(err.message));
  }, []);

  return (
    <>
      <h1>Reconciliation</h1>
      <section className="card">
        <h2>Runs</h2>
        {error && <p className="error">{error}</p>}
        {!runs && !error && <p className="muted">Loading…</p>}
        {runs?.length === 0 && (
          <p className="muted">No runs yet. <Link to="/statements">Upload a bank statement</Link> and reconcile it.</p>
        )}
        {runs && runs.length > 0 && (
          <div className="table-wrap">
            <table className="clickable">
              <thead>
                <tr>
                  <th>Run at</th><th>Statement</th>
                  <th className="num">Matched</th><th className="num">Mismatch</th>
                  <th className="num">Missing in bank</th><th className="num">Missing in ours</th>
                </tr>
              </thead>
              <tbody>
                {runs.map(run => (
                  <tr key={run.runId} onClick={() => navigate(`/reconciliation/${run.runId}`)}>
                    <td>{formatDateTime(run.runAt)}</td>
                    <td className="mono">{shortId(run.statementId)}</td>
                    <td className="num ok">{run.matched}</td>
                    <td className="num warn">{run.amountMismatch}</td>
                    <td className="num bad">{run.missingInBank}</td>
                    <td className="num bad">{run.missingInOurs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
