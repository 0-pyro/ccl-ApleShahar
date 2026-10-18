import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Building2, PlusCircle, HeartHandshake, Leaf, ArrowRight, LogOut, Home, Menu, X } from 'lucide-react';
import logo from '../assets/logo.png';
import { clearSession, getUserRole } from '../lib/api';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    setUser(storedUser ? JSON.parse(storedUser) : null);
  }, [location.pathname]);

  const pathParts = location.pathname.split('/');
  const activeTab = pathParts[pathParts.length - 1];
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  const isHomePage = location.pathname === '/';

  const navItemClass = (tabId) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${activeTab === tabId
      ? 'text-indigo-600 bg-indigo-50'
      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
    }`;

  const renderDashboardLinks = () => {
    if (!user) return null;
    if (getUserRole(user) === 'citizen') {
      return (
        <>
          <Link to="/report-issue" className={navItemClass('report-issue')}>
            Report Issue
          </Link>
          <Link to="/view-complaints" className={navItemClass('view-complaints')}>
            My Complaints
          </Link>
          <Link to="/facility-requests" className={navItemClass('facility-requests')}>
            Facility Requests
          </Link>
        </>
      );
    } else {
      return (
        <>
          <Link to="/view-complaints" className={navItemClass('view-complaints')}>
            Complains
          </Link>
          <Link to="/facility-requests" className={navItemClass('facility-requests')}>
            Facility Requests
          </Link>
        </>
      );
    }
  };

  const handleLogout = () => {
    clearSession();
    setUser(null);
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const capitalize = (s) => {
    s = s.split(" ")
    if (typeof s[0] !== 'string') return '';
    if (typeof s[1] !== 'string') return s[0].charAt(0).toUpperCase() + s[0].slice(1);
    return s[0].charAt(0).toUpperCase() + s[0].slice(1) + " " + s[1].charAt(0).toUpperCase() + s[1].slice(1);
  };

  return (
    <>
      <nav className="sticky top-0 z-0 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">

          <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity flex-shrink-0">
            <div className="h-10 w-10 sm:h-11 sm:w-11 bg-gradient-to-br rounded-xl p-1.5 shadow-sm ring-1 ring-indigo-200/70 flex items-center justify-center overflow-hidden">
              <img src={logo} alt="ApleShahar logo" className="h-full w-full object-contain" />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent hidden sm:inline-block">ApleShahar</span>
          </Link>

          <div className="hidden lg:flex items-center gap-1 border-l border-slate-200 pl-8 ml-8">
            <Link to="/complains" className={navItemClass('complains')}>
              All Complains
            </Link>
            {user && !isAuthPage && (
              <>
                {renderDashboardLinks()}
              </>
            )}
          </div>

          <div className="flex items-center gap-4 ml-auto">
            {!user ? (
              isAuthPage ? (
                <Link
                  to="/"
                  className="text-slate-600 hover:text-slate-900 text-sm font-semibold flex items-center gap-2 transition-colors"
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:block">Home</span>
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="hidden sm:block text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors px-4 py-2"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                  >
                    Get Started <ArrowRight className="w-4 h-4" />
                  </Link>
                </>
              )
            ) : (
              <>

                <div className="hidden md:flex flex-col items-end pr-4 border-r border-slate-200">
                  <span className="text-sm font-semibold text-slate-900">{capitalize(user.name)}</span>
                  <span className="text-xs text-slate-500">{getUserRole(user) === 'authority' ? 'Authority' : 'Citizen'}</span>
                </div>

                <button
                  onClick={handleLogout}
                  className="hidden md:flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-lg transition-all font-semibold text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>

                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </>
            )}
          </div>
        </div>

        {user && mobileMenuOpen && !isAuthPage && (
          <div className="lg:hidden bg-white border-t border-slate-200 px-6 py-4 space-y-2">
            <div className="flex flex-col gap-2 mb-4">
              {renderDashboardLinks()}
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-lg transition-all font-semibold text-sm"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;
