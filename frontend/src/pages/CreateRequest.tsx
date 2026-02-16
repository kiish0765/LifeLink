import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import GooglePlacePicker from '../components/GooglePlacePicker';
import '../components/Layout.css';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export default function CreateRequest() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    bloodGroup: 'O+',
    unitsRequired: 1,
    urgency: 'high' as 'low' | 'medium' | 'high' | 'critical',
    patientInfo: '',
    notes: '',
    location: { placeId: '', address: '' },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.location.placeId) {
      toast.error('Please pick a location from Google Maps suggestions.');
      return;
    }
    setLoading(true);
    try {
      await api('/requests', {
        method: 'POST',
        body: JSON.stringify({
          bloodGroup: form.bloodGroup,
          unitsRequired: form.unitsRequired,
          urgency: form.urgency,
          patientInfo: form.patientInfo || undefined,
          notes: form.notes || undefined,
          locationPlaceId: form.location.placeId,
          locationAddress: form.location.address || undefined,
        }),
      });
      toast.success('Request created. Donors are being notified.');
      navigate('/requests');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Create blood request</h1>
      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label>Blood group needed</label>
          <select value={form.bloodGroup} onChange={(e) => setForm((f) => ({ ...f, bloodGroup: e.target.value }))}>
            {BLOOD_GROUPS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Units required</label>
          <input type="number" min={1} max={20} value={form.unitsRequired} onChange={(e) => setForm((f) => ({ ...f, unitsRequired: parseInt(e.target.value, 10) || 1 }))} />
        </div>
        <div className="form-group">
          <label>Urgency</label>
          <select value={form.urgency} onChange={(e) => setForm((f) => ({ ...f, urgency: e.target.value as 'low' | 'medium' | 'high' | 'critical' }))}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <GooglePlacePicker
          value={form.location}
          onChange={(location) => setForm((f) => ({ ...f, location }))}
        />
        <div className="form-group">
          <label>Patient info (optional)</label>
          <textarea value={form.patientInfo} onChange={(e) => setForm((f) => ({ ...f, patientInfo: e.target.value }))} rows={2} />
        </div>
        <div className="form-group">
          <label>Notes (optional)</label>
          <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create request'}
          </button>
        </div>
      </form>
    </div>
  );
}
