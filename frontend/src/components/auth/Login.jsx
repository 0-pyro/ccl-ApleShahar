import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowRight, Mail, Lock, AlertCircle } from 'lucide-react';
import { fetchMe, getUserRole, loginUser, setStoredToken, setStoredUser } from '../../lib/api';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.email) return 'Please provide your email address.';
    if (!formData.password) return 'Please provide your password.';
    return null;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) return setError(validationError);

    try {
      setLoading(true);
      const response = await loginUser({
        email: formData.email,
        password: formData.password,
      });

      const token = response?.session?.access_token;
      const authUser = response?.user;

      if (!token || !authUser) {
        throw new Error('Invalid login response from server.');
      }

      setStoredToken(token);

      let dbProfile = null;
      try {
        const meRes = await fetchMe();
        dbProfile = meRes?.user ?? null;
      } catch (_) {

      }

      const mergedUser = {
        ...authUser,
        role: dbProfile?.role ?? getUserRole(authUser),
        ward_no: dbProfile?.ward_no ?? authUser?.user_metadata?.ward_no ?? null,
        name: dbProfile?.name ?? authUser?.user_metadata?.full_name ?? '',
        contact: dbProfile?.contact ?? null,
      };
      setStoredUser(mergedUser);

      const role = mergedUser.role;
      navigate(role === 'authority' ? '/' : '/', { replace: true });
    } catch (err) {
      setError(err?.payload?.error || err?.message || 'Unable to login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-scree bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <h2 className="mt-2 text-center text-4xl font-bold tracking-tight text-slate-900">Welcome Back</h2>
        <p className="mt-3 text-center text-sm text-slate-600 leading-relaxed">
          Sign in to access your account and manage services
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/95 backdrop-blur-sm py-10 px-6 shadow-xl sm:rounded-2xl sm:px-12 border border-white/50 rounded-2xl">
          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 p-4 rounded-lg flex gap-3 animate-in fade-in slide-in-from-top">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            )}

            <div className="group">
              <label className="block text-sm font-semibold leading-6 text-slate-900 mb-2">Email address</label>
              <div className="relative">
                <div className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full pl-12 pr-4 py-3 text-slate-900 bg-white rounded-lg border border-slate-300 shadow-sm ring-0 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 sm:text-sm"
                  placeholder="hello@example.com"
                  required
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-sm font-semibold leading-6 text-slate-900 mb-2">Password</label>
              <div className="relative">
                <div className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full pl-12 pr-4 py-3 text-slate-900 bg-white rounded-lg border border-slate-300 shadow-sm ring-0 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 sm:text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-8 flex justify-center items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-3.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:from-indigo-700 hover:to-indigo-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all duration-300 cursor-pointer active:scale-95"
            >
              {loading ? 'Signing in...' : <><span>Sign in</span> <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-xs text-center text-slate-500 mt-6">
            Secure login with encrypted connection
          </p>

          <p className="mt-4 text-center text-sm text-slate-600">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition-colors">
              Create one
            </Link>
          </p>
          {location.state?.message && (
            <p className="mt-3 text-center text-sm text-emerald-700">{location.state.message}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
