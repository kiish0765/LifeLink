import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import '../components/Layout.css';

interface RequestDetailType {
  request: {
    id: string;
    blood_group: string;
    units_required: number;
    urgency: string;
    status: string;
    patient_info: string | null;
    notes: string | null;
    created_at: string;
  };
  matches: { donor_id: string; status: string; distance_km: number | null }[];
}

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [data, setData] = useState<RequestDetailType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api<RequestDetailType>(`/requests/${id}`)
      .then(setData)
      .catch(() => toast.error('Request not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleRespond = async (status: 'accepted' | 'rejected') => {
    try {
      await api(`/requests/${id}/respond`, { method: 'POST', body: JSON.stringify({ status }) });
      toast.success('Response recorded');
      if (id) api<RequestDetailType>(`/requests/${id}`).then(setData);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      await api(`/requests/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      toast.success('Status updated');
      if (id) api<RequestDetailType>(`/requests/${id}`).then(setData);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  if (loading || !data) return <div className="card">Loading...</div>;
  const { request, matches } = data;
  const myMatch = user?.donorId ? matches.find((m) => m.donor_id === user.donorId) : null;

  return (
    <div>
      <h1>Request {request.id.slice(0, 8)}</h1>
      <div className="card">
        <p><strong>Blood group:</strong> {request.blood_group}</p>
        <p><strong>Units:</strong> {request.units_required}</p>
        <p><strong>Urgency:</strong> <span className={`badge badge-${request.urgency}`}>{request.urgency}</span></p>
        <p><strong>Status:</strong> <span className={`badge badge-${request.status === 'open' ? 'open' : 'fulfilled'}`}>{request.status}</span></p>
        {request.patient_info && <p><strong>Patient info:</strong> {request.patient_info}</p>}
        {request.notes && <p><strong>Notes:</strong> {request.notes}</p>}
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Created {new Date(request.created_at).toLocaleString()}</p>
      </div>
      {user?.role === 'donor' && myMatch && (
        <div className="card">
          <h3>Your match</h3>
          <p>Status: {myMatch.status}. Distance: {myMatch.distance_km != null ? `${myMatch.distance_km} km` : '—'}</p>
          {myMatch.status === 'pending' && (
            <div className="form-actions">
              <button type="button" className="btn btn-primary" onClick={() => handleRespond('accepted')}>Accept</button>
              <button type="button" className="btn btn-secondary" onClick={() => handleRespond('rejected')}>Reject</button>
            </div>
          )}
        </div>
      )}
      {(user?.role === 'hospital' || user?.role === 'admin') && (
        <div className="card">
          <h3>Matches ({matches.length})</h3>
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {matches.map((m) => (
              <li key={m.donor_id}>Donor {m.donor_id.slice(0, 8)} — {m.status} {m.distance_km != null ? `(${m.distance_km} km)` : ''}</li>
            ))}
          </ul>
          {request.status === 'open' && (
            <div className="form-actions" style={{ marginTop: '1rem' }}>
              <button type="button" className="btn btn-primary" onClick={() => handleStatusChange('in_progress')}>Mark In progress</button>
              <button type="button" className="btn btn-secondary" onClick={() => handleStatusChange('fulfilled')}>Mark Fulfilled</button>
              <button type="button" className="btn btn-secondary" onClick={() => handleStatusChange('cancelled')}>Cancel</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
