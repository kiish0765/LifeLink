import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import '../components/Layout.css';

interface HospitalType {
  id: string;
  name: string;
  city: string | null;
  is_approved: boolean;
}

export default function AdminHospitals() {
  const [hospitals, setHospitals] = useState<HospitalType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ hospitals: HospitalType[] }>('/hospitals')
      .then((r) => setHospitals(r.hospitals))
      .catch(() => toast.error('Failed to load hospitals'))
      .finally(() => setLoading(false));
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await api(`/hospitals/${id}/approve`, { method: 'POST' });
      toast.success('Hospital approved');
      setHospitals((prev) => prev.map((h) => (h.id === id ? { ...h, is_approved: true } : h)));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  if (loading) return <div className="card">Loading...</div>;

  return (
    <div>
      <h1>Hospitals</h1>
      {hospitals.length === 0 ? (
        <div className="card">No hospitals.</div>
      ) : (
        <div className="card">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>Name</th>
                <th style={{ padding: '0.5rem' }}>City</th>
                <th style={{ padding: '0.5rem' }}>Status</th>
                <th style={{ padding: '0.5rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {hospitals.map((h) => (
                <tr key={h.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.5rem' }}>{h.name}</td>
                  <td style={{ padding: '0.5rem' }}>{h.city ?? '—'}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <span className={`badge ${h.is_approved ? 'badge-fulfilled' : 'badge-high'}`}>{h.is_approved ? 'Approved' : 'Pending'}</span>
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    {!h.is_approved && (
                      <button type="button" className="btn btn-primary" onClick={() => handleApprove(h.id)}>Approve</button>
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
