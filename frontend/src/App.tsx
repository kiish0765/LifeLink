import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import DonorProfile from './pages/DonorProfile';
import HospitalProfile from './pages/HospitalProfile';
import RequestsList from './pages/RequestsList';
import RequestDetail from './pages/RequestDetail';
import CreateRequest from './pages/CreateRequest';
import Donations from './pages/Donations';
import AdminDashboard from './pages/AdminDashboard';
import AdminDonors from './pages/AdminDonors';
import AdminHospitals from './pages/AdminHospitals';
import AdminAudit from './pages/AdminAudit';
import About from './pages/About';

function PrivateRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/about" element={<About />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="donor/profile" element={<PrivateRoute roles={['donor']}><DonorProfile /></PrivateRoute>} />
        <Route path="hospital/profile" element={<PrivateRoute roles={['hospital']}><HospitalProfile /></PrivateRoute>} />
        <Route path="requests" element={<RequestsList />} />
        <Route path="requests/new" element={<PrivateRoute roles={['hospital', 'receiver']}><CreateRequest /></PrivateRoute>} />
        <Route path="requests/:id" element={<RequestDetail />} />
        <Route path="donations" element={<PrivateRoute roles={['donor']}><Donations /></PrivateRoute>} />
        <Route path="admin" element={<PrivateRoute roles={['admin']}><AdminDashboard /></PrivateRoute>} />
        <Route path="admin/donors" element={<PrivateRoute roles={['admin']}><AdminDonors /></PrivateRoute>} />
        <Route path="admin/hospitals" element={<PrivateRoute roles={['admin']}><AdminHospitals /></PrivateRoute>} />
        <Route path="admin/audit" element={<PrivateRoute roles={['admin']}><AdminAudit /></PrivateRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
