import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  User, ShieldAlert, ArrowRight, Mail, Phone, Lock, MapPin, AlertCircle,
} from "lucide-react";
import { fetchMe, getUserRole, loginUser, registerUser, setStoredToken, setStoredUser } from "../../lib/api";

// 29 Vasai-Virar Municipal Corporation wards (matches backend all_wards.json)
const WARDS = Array.from({ length: 29 }, (_, i) => i + 1);

const Signup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState(location.state?.tab || "citizen");
  const [formData, setFormData] = useState({
    name: "", email: "", contact: "", password: "", ward: "", securityCode: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.name) return "Please tell us your name.";
    if (!formData.email) return "Please provide an email address.";
    if (!formData.password) return "Please set a password to secure your account.";
    if (!formData.contact) return "Please provide a contact number.";
    if (!formData.ward) return "Please select your ward.";
    if (role === "authority" && !formData.securityCode) return "Please provide a security code.";
    return null;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    const validationError = validateForm();
    if (validationError) return setError(validationError);

    const payload = {
      name: formData.name,
      email: formData.email,
      contact: formData.contact,
      password: formData.password,
      ward_no: formData.ward,
      role,
      security_code: role === "authority" ? formData.securityCode : undefined,
    };
    console.log(payload);
    try {
      setLoading(true);
      await registerUser(payload);

      // Auto-login after successful registration
      const loginResponse = await loginUser({ email: formData.email, password: formData.password });
      const token = loginResponse?.session?.access_token;
      const authUser = loginResponse?.user;

      if (!token || !authUser) {
        navigate("/login", { state: { message: "Registration successful. Please sign in." }, replace: true });
        return;
      }

      setStoredToken(token);

      let dbProfile = null;
      try {
        const meRes = await fetchMe();
        dbProfile = meRes?.user ?? null;
      } catch (_) { }

      const mergedUser = {
        ...authUser,
        role: dbProfile?.role ?? role,
        ward_no: dbProfile?.ward_no ?? formData.ward,
        name: dbProfile?.name ?? formData.name,
        contact: dbProfile?.contact ?? formData.contact,
      };
      setStoredUser(mergedUser);

      navigate(role === "authority" ? "/view-complaints" : "/report-issue", { replace: true });
    } catch (err) {
      setError(err?.payload?.error || err?.message || "Unable to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <h2 className="mt-2 text-center text-4xl font-bold tracking-tight text-slate-900">Create Account</h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full relative z-10">
        <div className="bg-white/95 backdrop-blur-sm py-10 px-6 shadow-xl sm:rounded-2xl sm:px-12 border border-white/50 rounded-2xl">

          <div className="mb-8">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Select your role</p>
            <div className="flex gap-3 p-1 bg-gradient-to-r from-slate-100 to-slate-50 rounded-xl">
              {["citizen", "authority"].map((r) => (
                <button key={r} type="button"
                  onClick={() => { setRole(r); setError(""); }}
                  className={`flex-1 flex justify-center items-center gap-2 py-3 text-sm font-semibold rounded-lg transition-all duration-300 ${role === r ? "bg-white text-indigo-600 shadow-md border border-indigo-100/50" : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  {r === "citizen" ? <User className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSignup}>
            {error && (
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 p-4 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            )}

            <div className="group">
              <label className="block text-sm font-semibold leading-6 text-slate-900 mb-2">Full name</label>
              <div className="relative">
                <div className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors"><User className="w-5 h-5" /></div>
                <input type="text" name="name" value={formData.name} onChange={handleChange}
                  className="block w-full pl-12 pr-4 py-3 text-slate-900 bg-white rounded-lg border border-slate-300 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 sm:text-sm"
                  placeholder="e.g. Alex Doe" required />
              </div>
            </div>

            <div className="group">
              <label className="block text-sm font-semibold leading-6 text-slate-900 mb-2">Email address</label>
              <div className="relative">
                <div className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors"><Mail className="w-5 h-5" /></div>
                <input type="email" name="email" value={formData.email} onChange={handleChange}
                  className="block w-full pl-12 pr-4 py-3 text-slate-900 bg-white rounded-lg border border-slate-300 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 sm:text-sm"
                  placeholder="hello@example.com" required />
              </div>
            </div>

            <div className="group">
              <label className="block text-sm font-semibold leading-6 text-slate-900 mb-2">Contact number</label>
              <div className="relative">
                <div className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors"><Phone className="w-5 h-5" /></div>
                <input type="tel" name="contact" value={formData.contact} onChange={handleChange}
                  className="block w-full pl-12 pr-4 py-3 text-slate-900 bg-white rounded-lg border border-slate-300 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 sm:text-sm"
                  placeholder="e.g. +91 98765 43210" required />
              </div>
            </div>

            <div className="group">
              <label className="block text-sm font-semibold leading-6 text-slate-900 mb-2">Ward number</label>
              <div className="relative">
                <div className="absolute left-4 top-3.5 text-slate-400 pointer-events-none"><MapPin className="w-5 h-5" /></div>
                <select name="ward" value={formData.ward} onChange={handleChange}
                  className="block w-full pl-12 pr-4 py-3 text-slate-900 bg-white rounded-lg border border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 sm:text-sm appearance-none"
                  required
                >
                  <option value="">Select your ward</option>
                  {WARDS.map((w) => (
                    <option key={w} value={w}>Ward {w}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-3.5 text-slate-400 pointer-events-none">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {role === "authority" && (
              <div className="group animate-in fade-in slide-in-from-top-4 duration-300">
                <label className="block text-sm font-semibold leading-6 text-slate-900 mb-2">Security code</label>
                <div className="relative">
                  <div className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors"><Lock className="w-5 h-5" /></div>
                  <input type="password" name="securityCode" value={formData.securityCode} onChange={handleChange}
                    className="block w-full pl-12 pr-4 py-3 text-slate-900 bg-white rounded-lg border border-slate-300 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 sm:text-sm"
                    placeholder="Enter security code" required />
                </div>
              </div>
            )}

            <div className="group">
              <label className="block text-sm font-semibold leading-6 text-slate-900 mb-2">Password</label>
              <div className="relative">
                <div className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors"><Lock className="w-5 h-5" /></div>
                <input type="password" name="password" value={formData.password} onChange={handleChange}
                  className="block w-full pl-12 pr-4 py-3 text-slate-900 bg-white rounded-lg border border-slate-300 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 sm:text-sm"
                  placeholder="••••••••" required />
              </div>
              <p className="text-xs text-slate-500 mt-1.5">Use at least 8 characters</p>
            </div>

            <div className="flex justify-center">
              <button type="submit" disabled={loading}
                className="w-full lg:w-[50%] mt-8 flex justify-center items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-3.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:from-indigo-700 hover:to-indigo-800 transition-all duration-300 cursor-pointer active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Creating account..." : <><span>Create account</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
            <p className="mt-4 text-center text-sm text-slate-600">
              Already have an account?{" "}
              <Link to="/login" state={{ tab: role }} className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition-colors">
                Sign in
              </Link>
            </p>
          </form>

          <p className="text-xs text-center text-slate-500 mt-6">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
