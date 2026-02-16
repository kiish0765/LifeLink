import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import '../components/Layout.css';

interface DashboardStats {
  totalDonors: number;
  totalHospitals: number;
  openRequests: number;
  fulfilledRequestsToday: number;
  donationsThisMonth: number;
  requestsByUrgency: { urgency: string; count: number }[];
  requestsByBloodGroup: { bloodGroup: string; count: number }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<DashboardStats>('/analytics/dashboard')
      .then(setStats)
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="card">Loading...</div>;
  if (!stats) return null;

  return (
    <div>
      <h1>Analytics dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Donors</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.totalDonors}</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Hospitals</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.totalHospitals}</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Open requests</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.openRequests}</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Fulfilled today</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.fulfilledRequestsToday}</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Donations this month</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.donationsThisMonth}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        <div className="card">
          <h3>Open requests by urgency</h3>
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {stats.requestsByUrgency.map((r) => (
              <li key={r.urgency}>{r.urgency}: {r.count}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3>Open requests by blood group</h3>
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {stats.requestsByBloodGroup.map((r) => (
              <li key={r.bloodGroup}>{r.bloodGroup}: {r.count}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
