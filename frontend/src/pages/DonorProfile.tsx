import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, auth } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import '../components/Layout.css';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

interface DonorProfileType {
  id: string;
  blood_group: string;
  date_of_birth: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  is_available: boolean;
  verification_status: string;
}

export default function DonorProfile() {
  const { setUser } = useAuth();
  const [profile, setProfile] = useState<DonorProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ city: '', latitude: '', longitude: '', isAvailable: true });
  const [createForm, setCreateForm] = useState({ bloodGroup: 'O+', dateOfBirth: '', city: '', latitude: '', longitude: '' });
  useWebSocket();

  useEffect(() => {
    api<DonorProfileType>('/donors/me')
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (profile) {
      setForm({
        city: profile.city ?? '',
        latitude: profile.latitude != null ? String(profile.latitude) : '',
        longitude: profile.longitude != null ? String(profile.longitude) : '',
        isAvailable: profile.is_available,
      });
    }
  }, [profile]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await api<DonorProfileType>('/donors', {
        method: 'POST',
        body: JSON.stringify({
          bloodGroup: createForm.bloodGroup,
          dateOfBirth: createForm.dateOfBirth,
          city: createForm.city || undefined,
          latitude: createForm.latitude ? parseFloat(createForm.latitude) : undefined,
          longitude: createForm.longitude ? parseFloat(createForm.longitude) : undefined,
        }),
      });
      setProfile(created);
      const { user: u } = await auth.me();
      setUser(u);
      toast.success('Donor profile created');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api<DonorProfileType>('/donors/me', {
        method: 'PATCH',
        body: JSON.stringify({
          city: form.city || undefined,
          latitude: form.latitude ? parseFloat(form.latitude) : undefined,
          longitude: form.longitude ? parseFloat(form.longitude) : undefined,
          isAvailable: form.isAvailable,
        }),
      });
      setProfile(updated);
      toast.success('Profile updated');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="card">Loading...</div>;
  if (!profile) {
    return (
      <div>
        <h1>Create donor profile</h1>
        <form onSubmit={handleCreate} className="card">
          <div className="form-group">
            <label>Blood group</label>
            <select value={createForm.bloodGroup} onChange={(e) => setCreateForm((f) => ({ ...f, bloodGroup: e.target.value }))}>
              {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Date of birth</label>
            <input type="date" value={createForm.dateOfBirth} onChange={(e) => setCreateForm((f) => ({ ...f, dateOfBirth: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>City</label>
            <input value={createForm.city} onChange={(e) => setCreateForm((f) => ({ ...f, city: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Latitude</label>
            <input type="number" step="any" value={createForm.latitude} onChange={(e) => setCreateForm((f) => ({ ...f, latitude: e.target.value }))} placeholder="e.g. 12.9716" />
          </div>
          <div className="form-group">
            <label>Longitude</label>
            <input type="number" step="any" value={createForm.longitude} onChange={(e) => setCreateForm((f) => ({ ...f, longitude: e.target.value }))} placeholder="e.g. 77.5946" />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create profile'}</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <h1>Donor profile</h1>
      <div className="card">
        <p><strong>Blood group:</strong> {profile.blood_group}</p>
        <p><strong>Verification:</strong> <span className={`badge badge-${profile.verification_status === 'verified' ? 'fulfilled' : 'low'}`}>{profile.verification_status}</span></p>
      </div>
      <form onSubmit={handleSubmit} className="card">
        <h2>Update location & availability</h2>
        <div className="form-group">
          <label>City</label>
          <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
        </div>
        <div className="form-group">
          <label>Latitude (for matching)</label>
          <input type="number" step="any" value={form.latitude} onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))} placeholder="e.g. 12.9716" />
        </div>
        <div className="form-group">
          <label>Longitude</label>
          <input type="number" step="any" value={form.longitude} onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))} placeholder="e.g. 77.5946" />
        </div>
        <div className="form-group">
          <label>
            <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm((f) => ({ ...f, isAvailable: e.target.checked }))} />
            {' '}Available to donate
          </label>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}
