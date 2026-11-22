// Everything that talks to the backend lives here (like a client/repository layer in Java).
// Components never build URLs or headers themselves — they call these functions.

const PAYMENT_API = import.meta.env.VITE_PAYMENT_API ?? 'http://localhost:8080/api/v1';
const RECON_API = import.meta.env.VITE_RECON_API ?? 'http://localhost:8081/api/v1';

// ---------- Types: the SHAPE of the JSON each endpoint returns (mirrors the Java records) ----------

export type Role = 'OPERATOR' | 'AUDITOR' | 'ADMIN';

export type LoginResponse = {
  token: string;
  username: string;
  roles: Role[];
  expiresAt: string;
};

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export type Payment = {
  paymentId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  payerAccount: string;
  payeeAccount: string;
  reference: string;
  createdAt: string;
};

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type CreatePaymentInput = {
  amount: number;
  currency: string;
  payerAccount: string;
  payeeAccount: string;
  reference: string;
};

export type StatementSummary = {
  statementId: string;
  lines: number;
  totalAmount: number;
  uploadedAt: string;
};

export type StatementUploadResult = {
  statementId: string;
  saved: number;
  skippedDuplicates: number;
  errors: string[];
};

export type MatchStatus = 'MATCHED' | 'AMOUNT_MISMATCH' | 'MISSING_IN_BANK' | 'MISSING_IN_OURS';

export type RunSummary = {
  runId: string;
  statementId: string;
  runAt: string;
  matched: number;
  amountMismatch: number;
  missingInBank: number;
  missingInOurs: number;
};

export type ResultLine = {
  status: MatchStatus;
  reference: string;
  expectedPaymentId: string | null;
  bankTxnId: string | null;
  expectedAmount: number | null;
  bankAmount: number | null;
  difference: number | null;
};

export type ReconciliationReport = RunSummary & { results: (ResultLine & { id: string })[] };

export type Explanation = {
  resultId: string;
  source: 'AI' | 'RULES';
  model: string | null;
  explanation: string;
  requestedBy: string;
  createdAt: string;
};

// ---------- One error type for every failed call ----------

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string>;

  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

// ---------- The token: set by the AuthProvider after login, attached to every call ----------

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

// The one place that calls fetch(): adds the token, turns errors into ApiError
async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
  } catch {
    throw new ApiError('Cannot reach the server. Is the backend running?', 0);
  }

  if (!response.ok) {
    // Token missing/expired → log out (but not for a failed login attempt itself)
    if (response.status === 401 && authToken && onUnauthorized) {
      onUnauthorized();
    }
    let detail: string | undefined;
    let fieldErrors: Record<string, string> = {};
    try {
      const body = await response.json();          // our ProblemDetail JSON
      detail = body.detail;
      fieldErrors = body.errors ?? {};
    } catch {
      // body wasn't JSON (e.g. a plain 401/403 from Spring Security)
    }
    throw new ApiError(detail ?? defaultMessage(response.status), response.status, fieldErrors);
  }
  return response.json() as Promise<T>;
}

function defaultMessage(status: number): string {
  if (status === 401) return 'Your session has expired. Please log in again.';
  if (status === 403) return "You don't have permission to do this.";
  if (status >= 500) return 'The server had a problem. Please try again.';
  return `Request failed (HTTP ${status})`;
}

function jsonBody(data: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
}

// ---------- payment-service ----------

export function login(username: string, password: string) {
  return request<LoginResponse>(`${PAYMENT_API}/auth/login`, jsonBody({ username, password }));
}

export function listPayments(page: number, size: number, status?: PaymentStatus) {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) params.set('status', status);
  return request<PageResponse<Payment>>(`${PAYMENT_API}/payments?${params}`);
}

// The idempotency key comes from the caller: the SAME key for retries of the SAME payment
export async function createPayment(input: CreatePaymentInput, idempotencyKey: string) {
  const init = jsonBody(input);
  (init.headers as Record<string, string>)['Idempotency-Key'] = idempotencyKey;
  return request<Payment>(`${PAYMENT_API}/payments`, init);
}

// ---------- reconciliation-service ----------

export function listStatements() {
  return request<StatementSummary[]>(`${RECON_API}/statements`);
}

export function uploadStatement(file: File) {
  const form = new FormData();          // multipart/form-data, like Postman's "form-data"
  form.append('file', file);
  return request<StatementUploadResult>(`${RECON_API}/statements`, { method: 'POST', body: form });
}

export function listRuns() {
  return request<RunSummary[]>(`${RECON_API}/reconciliations`);
}

export function getRun(runId: string) {
  return request<ReconciliationReport>(`${RECON_API}/reconciliations/${runId}`);
}

// Step 7: ask the AI (or the rules fallback) to explain one report line
export function explainResult(resultId: string, refresh = false) {
  const params = new URLSearchParams({ refresh: String(refresh) });
  return request<Explanation>(
    `${RECON_API}/reconciliations/results/${resultId}/explanation?${params}`, { method: 'POST' });
}

export function runReconciliation(statementId: string) {
  const params = new URLSearchParams({ statementId });
  return request<ReconciliationReport>(`${RECON_API}/reconciliations?${params}`, { method: 'POST' });
}
