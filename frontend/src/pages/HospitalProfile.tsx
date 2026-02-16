import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, auth } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import GooglePlacePicker from '../components/GooglePlacePicker';
import '../components/Layout.css';

interface HospitalType {
  id: string;
  name: string;
  city: string | null;
  address_line: string | null;
  location_place_id: string | null;
  is_approved: boolean;
}

export default function HospitalProfile() {
  const { setUser } = useAuth();
  const [profile, setProfile] = useState<HospitalType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', city: '', addressLine: '', location: { placeId: '', address: '' }, contactPhone: '' });

  useEffect(() => {
    api<HospitalType>('/hospitals/me')
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await api<HospitalType>('/hospitals', {
        method: 'POST',
        body: JSON.stringify({
          name: createForm.name,
          city: createForm.city || undefined,
          addressLine: createForm.addressLine || undefined,
          locationPlaceId: createForm.location.placeId || undefined,
          contactPhone: createForm.contactPhone || undefined,
        }),
      });
      setProfile(created);
      const { user: u } = await auth.me();
      setUser(u);
      toast.success('Hospital profile created. Pending admin approval.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="card">Loading...</div>;
  if (!profile) {
    return (
      <div>
        <h1>Create hospital profile</h1>
        <form onSubmit={handleCreate} className="card">
          <div className="form-group">
            <label>Hospital name</label>
            <input value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>City</label>
            <input value={createForm.city} onChange={(e) => setCreateForm((f) => ({ ...f, city: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Address</label>
            <input value={createForm.addressLine} onChange={(e) => setCreateForm((f) => ({ ...f, addressLine: e.target.value }))} />
          </div>
          <GooglePlacePicker
            value={createForm.location}
            onChange={(location) => setCreateForm((f) => ({ ...f, location }))}
          />
          <div className="form-group">
            <label>Contact phone</label>
            <input type="tel" value={createForm.contactPhone} onChange={(e) => setCreateForm((f) => ({ ...f, contactPhone: e.target.value }))} />
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
      <h1>Hospital profile</h1>
      <div className="card">
        <p><strong>Name:</strong> {profile.name}</p>
        <p><strong>City:</strong> {profile.city ?? '—'}</p>
        <p><strong>Address:</strong> {profile.address_line ?? '—'}</p>
        <p><strong>Status:</strong> <span className={`badge ${profile.is_approved ? 'badge-fulfilled' : 'badge-high'}`}>{profile.is_approved ? 'Approved' : 'Pending approval'}</span></p>
      </div>
    </div>
  );
}
