import { Link, useLocation } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';
import logo from '../assets/logo.png';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  if (isAuthPage) return null;

  return (
    <footer className="border-t border-slate-200 bg-[#F1F5F9] mt-20 ">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 ">
        <div className="hidden lg:block grid grid-cols-1 md:grid-cols-5 gap-12 mb-4">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-6 hover:opacity-80 transition-opacity">
              <div className="h-10 w-10 sm:h-11 sm:w-11 bg-gradient-to-br rounded-xl p-1.5 shadow-sm ring-1 ring-indigo-200/70 flex items-center justify-center overflow-hidden">
                <img src={logo} alt="ApleShahar logo" className="h-full w-full object-contain" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">ApleShahar</span>
            </Link>
            <p className="text-sm leading-relaxed mb-">
              Empowering communities through transparent civic engagement and collaborative problem-solving.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-8 mb-6 border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                  <Mail className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold">Email us</p>
                <a href="mailto:support@apleshahar.com" className="text-sm  hover:text-indigo-600 transition-colors">
                  support@apleshahar.com
                </a>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                  <Phone className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold">Call us</p>
                <a href="tel:+919876543210" className="text-sm hover:text-indigo-600 transition-colors">
                  +91 9665348677
                </a>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold">Visit us</p>
                <a href="https://www.google.com/maps/dir/19.4347942,72.7776873/Vasai+Virar+City+Municipal+Corporation+(Head+Office),+CRW6%2B88W,+Virat+Nagar,+Virar+West,+Vasai-Virar,+Maharashtra+401303/@19.4356434,72.7729054,14z/data=!3m1!4b1!4m9!4m8!1m0!1m5!1m1!1s0x3be7a9001bf9cb6b:0x2a5c17c199188ce7!2m2!1d72.8108141!2d19.445868!3e0?entry=ttu&g_ep=EgoyMDI2MDQyNy4wIKXMDSoASAFQAw%3D%3D" target='_blank' className="text-sm hover:text-indigo-600 transition-colors">
                  Vasai Virar City Municipal Corporation (V.V.C.M.C Head Office) Opp. Virar Police Station, Bazaar ward, Virar East, Maharashtra 401305
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-center items-center gap-6">
          <p className="text-sm text-black">
            © {currentYear} ApleShahar. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
