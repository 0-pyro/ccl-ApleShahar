import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './components/Landing';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

import ViewComplains from './components/ViewComplains';
import ManageComplain from './components/ManageComplain';
import ViewFacilityRequests from './components/authorities/ViewFacilityRequests';
import ReportComplainDetails from './components/ReportComplainDetails';
import Complains from './components/Complains';
import { getStoredToken, getStoredUser, getUserRole } from './lib/api';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const token = getStoredToken();
  const user = getStoredUser();
  const role = getUserRole(user);

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    const fallback = role === 'authority' ? '/view-complaints' : '/report-issue';
    return <Navigate to={fallback} replace />;
  }

  return children;
};

const DashboardRedirect = () => {
  const role = getUserRole(getStoredUser());
  return <Navigate to={role === 'authority' ? '/view-complaints' : '/report-issue'} replace />;
};

function App() {

  return (
    <Router>
      <div className="min-h-screen bg-stone-50 text-stone-800 font-sans flex flex-col">
        {true && <Navbar />}
        <div className="flex-1 w-full flex flex-col">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            {/* Public — no auth required */}
            <Route path="/complains" element={<Complains />} />

            <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />
            <Route
              path="/view-complaints"
              element={
                <ProtectedRoute allowedRoles={['citizen', 'authority']}>
                  <ViewComplains />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage-complaint"
              element={
                <ProtectedRoute allowedRoles={['citizen', 'authority']}>
                  <ManageComplain />
                </ProtectedRoute>
              }
            />
            <Route
              path="/facility-requests"
              element={
                <ProtectedRoute allowedRoles={['citizen', 'authority']}>
                  <ViewFacilityRequests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/report-issue"
              element={
                <ProtectedRoute allowedRoles={['citizen']}>
                  <ReportComplainDetails />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
