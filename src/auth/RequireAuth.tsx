import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { Role } from '../api';
import { useAuth } from './authContext';

// A "route guard": wrap a page in it to protect it.
//   not logged in      → send to /login (and come back here afterwards)
//   logged in, no role → show a "no access" message
export default function RequireAuth({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, hasRole } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (roles && !hasRole(...roles)) {
    return (
      <div className="card">
        <h2>No access</h2>
        <p className="muted">Your role ({user.roles.join(', ')}) can't open this page.</p>
      </div>
    );
  }
  return <>{children}</>;
}
