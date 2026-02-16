import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="dashboard">
      <h1>Welcome, {user?.email}</h1>
      <p className="dashboard-role">You are logged in as <strong>{user?.role}</strong>.</p>

      {user?.role === 'donor' && (
        <div className="dashboard-cards">
          <Link to="/donor/profile" className="dashboard-card">
            <h3>My donor profile</h3>
            <p>Update blood group, location, and availability</p>
          </Link>
          <Link to="/requests" className="dashboard-card">
            <h3>Blood requests</h3>
            <p>View and respond to emergency requests</p>
          </Link>
          <Link to="/donations" className="dashboard-card">
            <h3>My donations</h3>
            <p>View your donation history</p>
          </Link>
        </div>
      )}

      {user?.role === 'hospital' && (
        <div className="dashboard-cards">
          <Link to="/hospital/profile" className="dashboard-card">
            <h3>Hospital profile</h3>
            <p>Manage hospital details and location</p>
          </Link>
          <Link to="/requests/new" className="dashboard-card highlight">
            <h3>Create blood request</h3>
            <p>Raise an emergency request — donors are notified instantly</p>
          </Link>
          <Link to="/requests" className="dashboard-card">
            <h3>My requests</h3>
            <p>Track and manage your requests</p>
          </Link>
        </div>
      )}

      {user?.role === 'admin' && (
        <div className="dashboard-cards">
          <Link to="/admin" className="dashboard-card">
            <h3>Analytics dashboard</h3>
            <p>Stats and overview</p>
          </Link>
          <Link to="/admin/donors" className="dashboard-card">
            <h3>Donors</h3>
            <p>Verify and manage donors</p>
          </Link>
          <Link to="/admin/hospitals" className="dashboard-card">
            <h3>Hospitals</h3>
            <p>Approve and manage hospitals</p>
          </Link>
          <Link to="/admin/audit" className="dashboard-card">
            <h3>Audit log</h3>
            <p>Safety and transparency</p>
          </Link>
        </div>
      )}

      {user?.role === 'receiver' && (
        <div className="dashboard-cards">
          <Link to="/requests" className="dashboard-card">
            <h3>Blood requests</h3>
            <p>View open requests (coordinate with hospitals)</p>
          </Link>
        </div>
      )}
    </div>
  );
}
