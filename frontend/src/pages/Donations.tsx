import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import '../components/Layout.css';

interface DonationType {
  id: string;
  request_id: string | null;
  units_donated: number;
  donated_at: string;
  notes: string | null;
}

export default function Donations() {
  const [donations, setDonations] = useState<DonationType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ donations: DonationType[] }>('/requests/donations/me')
      .then((r) => setDonations(r.donations))
      .catch(() => toast.error('Failed to load donations'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="card">Loading...</div>;

  return (
    <div>
      <h1>My donations</h1>
      {donations.length === 0 ? (
        <div className="card">No donations recorded yet.</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {donations.map((d) => (
            <li key={d.id} className="card" style={{ marginBottom: '0.75rem' }}>
              <strong>{d.units_donated} unit(s)</strong> — {new Date(d.donated_at).toLocaleDateString()}
              {d.request_id && <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Request: {d.request_id.slice(0, 8)}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
