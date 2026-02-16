import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import '../components/Layout.css';

interface RequestType {
  id: string;
  blood_group: string;
  units_required: number;
  urgency: string;
  status: string;
  created_at: string;
  hospital_id: string;
}

export default function RequestsList() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RequestType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'my'>('all');

  useEffect(() => {
    setLoading(true);
    if (filter === 'my' && user?.role === 'hospital') {
      api<{ requests: RequestType[] }>('/requests/my').then((r) => {
        setRequests(r.requests);
        setLoading(false);
      }).catch(() => setLoading(false));
    } else {
      api<{ requests: RequestType[] }>('/requests').then((r) => {
        setRequests(r.requests);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [filter, user?.role]);

  return (
    <div>
      <h1>Blood requests</h1>
      {user?.role === 'hospital' && (
        <div style={{ marginBottom: '1rem' }}>
          <button type="button" className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('all')}>All open</button>
          <button type="button" className={`btn ${filter === 'my' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('my')} style={{ marginLeft: '0.5rem' }}>My requests</button>
        </div>
      )}
      {loading ? (
        <div className="card">Loading...</div>
      ) : requests.length === 0 ? (
        <div className="card">No requests found.</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {requests.map((r) => (
            <li key={r.id} className="card" style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <span className={`badge badge-${r.urgency}`}>{r.urgency}</span>
                  <span className={`badge badge-${r.status === 'open' ? 'open' : 'fulfilled'}`} style={{ marginLeft: '0.5rem' }}>{r.status}</span>
                  <strong style={{ marginLeft: '0.5rem' }}>{r.blood_group}</strong> — {r.units_required} unit(s)
                </div>
                <Link to={`/requests/${r.id}`} className="btn btn-primary">View</Link>
              </div>
              <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {new Date(r.created_at).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
