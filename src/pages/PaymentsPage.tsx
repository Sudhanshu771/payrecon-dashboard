import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ApiError, createPayment, listPayments, type Payment, type PageResponse, type PaymentStatus } from '../api';
import { useAuth } from '../auth/authContext';
import StatusBadge from '../components/StatusBadge';
import { formatDateTime, formatMoney } from '../format';

const PAGE_SIZE = 10;

export default function PaymentsPage() {
  const { hasRole } = useAuth();
  const canCreate = hasRole('OPERATOR');

  const [data, setData] = useState<PageResponse<Payment> | null>(null);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<PaymentStatus | ''>('');
  const [error, setError] = useState<string | null>(null);
  // Bumping this number forces a re-load (e.g. after creating a payment)
  const [reloadKey, setReloadKey] = useState(0);

  // Re-load whenever page, status or reloadKey changes (the dependency list)
  useEffect(() => {
    listPayments(page, PAGE_SIZE, status || undefined)
      .then(result => { setData(result); setError(null); })
      .catch(err => setError(err.message));
  }, [page, status, reloadKey]);

  return (
    <>
      <h1>Payments</h1>

      {canCreate && <NewPaymentForm onCreated={() => { setPage(0); setReloadKey(k => k + 1); }} />}

      <section className="card">
        <div className="card-head">
          <h2>All payments</h2>
          <select value={status} onChange={e => { setStatus(e.target.value as PaymentStatus | ''); setPage(0); }}>
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        {error && <p className="error">{error}</p>}
        {!data && !error && <p className="muted">Loading…</p>}
        {data && data.content.length === 0 && <p className="muted">No payments yet.</p>}

        {data && data.content.length > 0 && (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Created</th><th>Reference</th><th className="num">Amount</th>
                    <th>Payer</th><th>Payee</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.content.map(p => (
                    <tr key={p.paymentId}>
                      <td>{formatDateTime(p.createdAt)}</td>
                      <td>{p.reference}</td>
                      <td className="num">{formatMoney(p.amount, p.currency)}</td>
                      <td className="mono">{p.payerAccount}</td>
                      <td className="mono">{p.payeeAccount}</td>
                      <td><StatusBadge status={p.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pager">
              <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
              <span className="muted">
                Page {data.page + 1} of {Math.max(data.totalPages, 1)} · {data.totalElements} payments
              </span>
              <button type="button" disabled={page + 1 >= data.totalPages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </>
        )}
      </section>
    </>
  );
}

// ---------- The "new payment" form (a second component in the same file) ----------

const EMPTY = { amount: '', payerAccount: '', payeeAccount: '', reference: '' };

function NewPaymentForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState(EMPTY);
  // ONE idempotency key per payment being entered: a double-click or retry re-sends the SAME key,
  // so the backend returns the same payment instead of creating two. A new key only after success.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof typeof EMPTY, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));       // copy the old object, change one field
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setMessage(null);
    try {
      const payment = await createPayment({
        amount: Number(form.amount),
        currency: 'INR',
        payerAccount: form.payerAccount.trim(),
        payeeAccount: form.payeeAccount.trim(),
        reference: form.reference.trim(),
      }, idempotencyKey);
      setMessage({ kind: 'ok', text: `Payment ${payment.reference} created (${formatMoney(payment.amount)})` });
      setForm(EMPTY);
      setIdempotencyKey(crypto.randomUUID());
      onCreated();
    } catch (err) {
      if (err instanceof ApiError) setFieldErrors(err.fieldErrors);
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Could not create payment' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="card">
      <h2>New payment</h2>
      <form className="form-grid" onSubmit={handleSubmit}>
        <Field label="Amount (INR)" error={fieldErrors.amount}>
          <input type="number" min="0.01" step="0.01" value={form.amount}
                 onChange={e => update('amount', e.target.value)} required />
        </Field>
        <Field label="Reference" error={fieldErrors.reference}>
          <input value={form.reference} maxLength={64} placeholder="INV-10001"
                 onChange={e => update('reference', e.target.value)} required />
        </Field>
        <Field label="Payer account" error={fieldErrors.payerAccount}>
          <input value={form.payerAccount} maxLength={34} placeholder="HDFC0001234-501002345678"
                 onChange={e => update('payerAccount', e.target.value)} required />
        </Field>
        <Field label="Payee account" error={fieldErrors.payeeAccount}>
          <input value={form.payeeAccount} maxLength={34} placeholder="ICIC0004321-002301556789"
                 onChange={e => update('payeeAccount', e.target.value)} required />
        </Field>
        <div className="form-actions">
          <button type="submit" className="primary" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create payment'}
          </button>
          {message && <span className={message.kind === 'ok' ? 'ok' : 'error'}>{message.text}</span>}
        </div>
      </form>
    </section>
  );
}

// "children" = whatever is written between <Field> and </Field>
function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label>
      {label}
      {children}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}
