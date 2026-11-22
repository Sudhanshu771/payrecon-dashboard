import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listStatements, runReconciliation, uploadStatement,
  type StatementSummary, type StatementUploadResult,
} from '../api';
import { formatDateTime, formatMoney, shortId } from '../format';

export default function StatementsPage() {
  const navigate = useNavigate();
  const [statements, setStatements] = useState<StatementSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<StatementUploadResult | null>(null);
  const [runningFor, setRunningFor] = useState<string | null>(null);

  function load() {
    listStatements().then(setStatements).catch(err => setError(err.message));
  }

  useEffect(load, []);

  async function handleUpload(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await uploadStatement(file));
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  // Run the matching, then jump straight to the report
  async function reconcile(statementId: string) {
    setRunningFor(statementId);
    setError(null);
    try {
      const report = await runReconciliation(statementId);
      navigate(`/reconciliation/${report.runId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reconciliation failed');
      setRunningFor(null);
    }
  }

  return (
    <>
      <h1>Bank statements</h1>

      <section className="card">
        <h2>Upload a statement</h2>
        <p className="muted">CSV columns: bank_txn_id, reference, amount, currency, value_date (yyyy-MM-dd)</p>
        <form className="upload-row" onSubmit={handleUpload}>
          <input type="file" accept=".csv,text/csv"
                 onChange={e => setFile(e.target.files?.[0] ?? null)} />
          <button type="submit" className="primary" disabled={!file || uploading}>
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </form>

        {result && (
          <div className="notice">
            <p>
              <strong>{result.saved}</strong> lines saved · <strong>{result.skippedDuplicates}</strong> duplicates
              skipped · <strong>{result.errors.length}</strong> errors
            </p>
            {result.errors.length > 0 && (
              <ul className="error">{result.errors.map(e => <li key={e}>{e}</li>)}</ul>
            )}
            {result.saved > 0 && (
              <button type="button" className="primary" disabled={runningFor !== null}
                      onClick={() => reconcile(result.statementId)}>
                Reconcile this statement
              </button>
            )}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Uploaded statements</h2>
        {error && <p className="error">{error}</p>}
        {!statements && !error && <p className="muted">Loading…</p>}
        {statements?.length === 0 && <p className="muted">No statements uploaded yet.</p>}
        {statements && statements.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Uploaded</th><th>Statement</th><th className="num">Lines</th><th className="num">Total</th><th /></tr>
              </thead>
              <tbody>
                {statements.map(s => (
                  <tr key={s.statementId}>
                    <td>{formatDateTime(s.uploadedAt)}</td>
                    <td className="mono">{shortId(s.statementId)}</td>
                    <td className="num">{s.lines}</td>
                    <td className="num">{formatMoney(s.totalAmount)}</td>
                    <td className="num">
                      <button type="button" disabled={runningFor !== null} onClick={() => reconcile(s.statementId)}>
                        {runningFor === s.statementId ? 'Reconciling…' : 'Reconcile'}
                      </button>
                    </td>
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
