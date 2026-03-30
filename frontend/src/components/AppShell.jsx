import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

function AppLink({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `nav-link${isActive ? " nav-link-active" : ""}`
      }
    >
      {children}
    </NavLink>
  );
}

export function AppShell() {
  const location = useLocation();
  const { isAuthenticated, logout, user } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname, isAuthenticated]);

  return (
    <div className="site-shell">
      <div className="background-orb background-orb-left" />
      <div className="background-orb background-orb-right" />

      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="brand">
            <span className="brand-mark">AI</span>
            <span>
              <strong>Interview Coach</strong>
              <small>Fast practice. Better answers.</small>
            </span>
          </Link>

          <button
            type="button"
            className="nav-toggle"
            aria-expanded={mobileNavOpen}
            aria-label="Toggle navigation"
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>

          <nav className={`site-nav${mobileNavOpen ? " site-nav-open" : ""}`}>
            {isAuthenticated ? (
              <>
                <AppLink to="/dashboard">Dashboard</AppLink>
                <AppLink to="/generate">Generate</AppLink>
                <AppLink to="/history">History</AppLink>
                <AppLink to="/analytics">Analytics</AppLink>
                <div className="nav-user">
                  <span>{user?.name || "User"}</span>
                  <button type="button" className="button button-ghost" onClick={logout}>
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <AppLink to="/login">Login</AppLink>
                <Link to="/register" className="button button-primary button-small">
                  Create account
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="page-shell">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div>
          <strong>AI Interview Coach</strong>
          <p>Practice interviews with smarter feedback, cleaner history, and a faster workflow.</p>
        </div>
        <div className="footer-links">
          <Link to="/">Home</Link>
          {isAuthenticated ? <Link to="/generate">Practice now</Link> : <Link to="/register">Get started</Link>}
          {isAuthenticated ? <Link to="/analytics">Analytics</Link> : <Link to="/login">Login</Link>}
        </div>
      </footer>
    </div>
  );
}
