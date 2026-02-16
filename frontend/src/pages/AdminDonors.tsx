import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import '../components/Layout.css';

interface DonorType {
  id: string;
  user_id: string;
  blood_group: string;
  city: string | null;
  is_available: boolean;
  verification_status: string;
}

export default function AdminDonors() {
  const [donors, setDonors] = useState<DonorType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ donors: DonorType[] }>('/donors')
      .then((r) => setDonors(r.donors))
      .catch(() => toast.error('Failed to load donors'))
      .finally(() => setLoading(false));
  }, []);

  const handleVerify = async (id: string, status: 'verified' | 'rejected') => {
    try {
      await api(`/donors/${id}/verify`, { method: 'POST', body: JSON.stringify({ status }) });
      toast.success('Updated');
      setDonors((prev) => prev.map((d) => (d.id === id ? { ...d, verification_status: status } : d)));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  if (loading) return <div className="card">Loading...</div>;

  return (
    <div>
      <h1>Donors</h1>
      {donors.length === 0 ? (
        <div className="card">No donors.</div>
      ) : (
        <div className="card">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>ID</th>
                <th style={{ padding: '0.5rem' }}>Blood</th>
                <th style={{ padding: '0.5rem' }}>City</th>
                <th style={{ padding: '0.5rem' }}>Status</th>
                <th style={{ padding: '0.5rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {donors.map((d) => (
                <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{d.id.slice(0, 8)}</td>
                  <td style={{ padding: '0.5rem' }}>{d.blood_group}</td>
                  <td style={{ padding: '0.5rem' }}>{d.city ?? '—'}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <span className={`badge badge-${d.verification_status === 'verified' ? 'fulfilled' : 'low'}`}>{d.verification_status}</span>
                    {d.is_available && <span className="badge badge-open" style={{ marginLeft: '0.25rem' }}>available</span>}
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    {d.verification_status !== 'verified' && (
                      <button type="button" className="btn btn-primary" style={{ marginRight: '0.25rem' }} onClick={() => handleVerify(d.id, 'verified')}>Verify</button>
                    )}
                    {d.verification_status !== 'rejected' && (
                      <button type="button" className="btn btn-secondary" onClick={() => handleVerify(d.id, 'rejected')}>Reject</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
