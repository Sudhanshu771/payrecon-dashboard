import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/authContext';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const goTo = (location.state as { from?: string } | null)?.from ?? '/';

  // "Controlled inputs": the input's value lives in state, every keystroke updates it
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to={goTo} replace />;     // already logged in
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();                     // stop the browser's default full-page form submit
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      navigate(goTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={handleSubmit}>
        <h1>PayRecon</h1>
        <p className="muted">Sign in to continue</p>

        <label>
          Username
          <input value={username} onChange={e => setUsername(e.target.value)}
                 autoComplete="username" autoFocus required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                 autoComplete="current-password" required />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="hint">Demo users: operator, auditor, admin</p>
      </form>
    </div>
  );
}
