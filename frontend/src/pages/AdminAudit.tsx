import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import '../components/Layout.css';

interface AuditLogType {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: unknown;
  created_at: string;
}

export default function AdminAudit() {
  const [logs, setLogs] = useState<AuditLogType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ logs: AuditLogType[] }>('/analytics/audit')
      .then((r) => setLogs(r.logs))
      .catch(() => toast.error('Failed to load audit log'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="card">Loading...</div>;

  return (
    <div>
      <h1>Audit log</h1>
      {logs.length === 0 ? (
        <div className="card">No audit events.</div>
      ) : (
        <div className="card">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>Time</th>
                <th style={{ padding: '0.5rem' }}>User</th>
                <th style={{ padding: '0.5rem' }}>Action</th>
                <th style={{ padding: '0.5rem' }}>Resource</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>{new Date(log.created_at).toLocaleString()}</td>
                  <td style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)' }}>{log.user_id?.slice(0, 8) ?? '—'}</td>
                  <td style={{ padding: '0.5rem' }}>{log.action}</td>
                  <td style={{ padding: '0.5rem' }}>{log.resource_type} {log.resource_id ? log.resource_id.slice(0, 8) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
