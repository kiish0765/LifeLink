import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Layout.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <header className="header">
        <Link to="/" className="logo">LifeLink</Link>
        <nav className="nav">
          <Link to="/">Dashboard</Link>
          <Link to="/requests">Requests</Link>
          {user?.role === 'donor' && (
            <>
              <Link to="/donor/profile">My Profile</Link>
              <Link to="/donations">My Donations</Link>
            </>
          )}
          {user?.role === 'hospital' && (
            <>
              <Link to="/hospital/profile">Hospital</Link>
              <Link to="/requests/new">New Request</Link>
            </>
          )}
          {user?.role === 'admin' && (
            <>
              <Link to="/admin">Analytics</Link>
              <Link to="/admin/donors">Donors</Link>
              <Link to="/admin/hospitals">Hospitals</Link>
              <Link to="/admin/audit">Audit Log</Link>
            </>
          )}
        </nav>
        <div className="header-user">
          <span className="role-badge">{user?.role}</span>
          <button type="button" onClick={handleLogout} className="btn btn-ghost">Logout</button>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
