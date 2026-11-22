import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/authContext';

// The frame around every page: left menu + top bar. <Outlet /> is where the current page appears.
export default function Layout() {
  const { user, logout, hasRole } = useAuth();

  return (
    <div className="shell">
      <aside className="sidebar">
        <p className="brand">PayRecon</p>
        <nav>
          {/* Each link only shows if the user's role may use that page */}
          {hasRole('OPERATOR', 'AUDITOR') && <NavLink to="/payments">Payments</NavLink>}
          {hasRole('AUDITOR') && <NavLink to="/statements">Bank statements</NavLink>}
          {hasRole('AUDITOR') && <NavLink to="/reconciliation">Reconciliation</NavLink>}
        </nav>
      </aside>

      <div className="content">
        <header className="topbar">
          <span className="muted">
            Signed in as <strong>{user?.username}</strong> ({user?.roles.join(', ')})
          </span>
          <button type="button" onClick={logout}>Log out</button>
        </header>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
