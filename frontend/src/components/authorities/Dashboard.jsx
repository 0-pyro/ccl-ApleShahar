import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredUser, getUserRole } from '../../lib/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const role = getUserRole(getStoredUser());

  useEffect(() => {
    navigate(role === 'authority' ? '/view-complaints' : '/report-issue', { replace: true });
  }, [navigate, role]);

  return (
    <div className="min-h-screen bg-stone-50 font-sans flex flex-col">
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 overflow-y-auto">
        <p className="text-sm text-slate-500">Redirecting to your dashboard...</p>
      </main>
    </div>
  );
};

export default Dashboard;
