import type { MatchStatus, PaymentStatus } from '../api';

// PROPS = a component's inputs (like constructor parameters in Java)
type Props = { status: MatchStatus | PaymentStatus };

const LABELS: Record<Props['status'], { text: string; tone: 'ok' | 'warn' | 'bad' | 'neutral' }> = {
  MATCHED: { text: 'Matched', tone: 'ok' },
  AMOUNT_MISMATCH: { text: 'Amount mismatch', tone: 'warn' },
  MISSING_IN_BANK: { text: 'Missing in bank', tone: 'bad' },
  MISSING_IN_OURS: { text: 'Missing in ours', tone: 'bad' },
  PENDING: { text: 'Pending', tone: 'neutral' },
  COMPLETED: { text: 'Completed', tone: 'ok' },
  FAILED: { text: 'Failed', tone: 'bad' },
};

export default function StatusBadge({ status }: Props) {
  const { text, tone } = LABELS[status];
  return <span className={`badge badge-${tone}`}>{text}</span>;
}
