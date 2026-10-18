import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip } from 'react-leaflet';
import { TrendingUp, CheckCircle, ArrowRight, AlertCircle, Eye, Leaf, Droplets, Lightbulb, Trash2, Trees } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { getAllComplaints, getAllFacilityRequests } from '../lib/api';
import vvcmc from '../assets/vvcmc.png';

const MAP_CENTER = [19.428, 72.827];

const FACILITY_LABELS = {
  street_light: 'Street Light',
  garbage_bin: 'Garbage Bin',
  park: 'Public Park',
  bench: 'Public Bench',
  playground: 'Playground',
  water_tap: 'Water Tap',
  road: 'Road / Footpath',
  toilet: 'Public Toilet',
  other: 'Facility',
};

const FACILITY_ICONS = {
  street_light: Lightbulb,
  garbage_bin: Trash2,
  park: Trees,
  water_tap: Droplets,
  playground: Trees,
  default: Leaf,
};

function FacilityIcon({ type }) {
  const Icon = FACILITY_ICONS[type] || FACILITY_ICONS.default;
  return <Icon className="w-5 h-5 text-emerald-600" />;
}

function parseCoords(location_coords) {
  if (!location_coords) return null;
  try {
    if (typeof location_coords === 'string') {
      const parts = location_coords.split(',').map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return [parts[0], parts[1]];
    }
    if (typeof location_coords === 'object') {
      const lat = Number(location_coords.lat ?? location_coords.latitude);
      const lng = Number(location_coords.lng ?? location_coords.longitude);
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    }
  } catch { }
  return null;
}

function buildChartData(complaints) {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      name: d.toLocaleString('default', { month: 'short' }),
      issues: 0,
      fixed: 0,
    });
  }

  complaints.forEach((c) => {
    if (!c.created_at) return;
    const d = new Date(c.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const slot = months.find((m) => m.key === key);
    if (!slot) return;
    slot.issues++;
    if (c.status === 'resolved' || c.status === 'closed') slot.fixed++;
  });

  return months;
}

const markerColor = (status) => {
  if (status === 'resolved' || status === 'closed') return '#16a34a';
  if (status === 'in_progress') return '#3b82f6';
  if (status === 'rejected') return '#ef4444';
  return '#f97316';
};

const Landing = () => {
  const [allComplaints, setAllComplaints] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;

  useEffect(() => {
    const load = async () => {
      try {
        const [cData, fData] = await Promise.all([
          getAllComplaints(),
          getAllFacilityRequests(),
        ]);

        const cList = Array.isArray(cData)
          ? cData
          : Array.isArray(cData?.complaints) ? cData.complaints : [];

        const fList = Array.isArray(fData)
          ? fData
          : Array.isArray(fData?.requests) ? fData.requests : [];

        setAllComplaints(cList);
        setFacilities(fList);
      } catch {
      } finally {
        setDataLoading(false);
      }
    };
    load();
  }, []);

  const stats = useMemo(() => {
    const resolvedCount = allComplaints.filter(c =>
      c.status === 'resolved' || c.status === 'closed'
    ).length;

    const closedCount = allComplaints.filter(c => c.status === 'closed').length;
    const approvedFacilities = facilities.filter(f => f.status === 'approved').length;

    const decided = allComplaints.filter(c =>
      c.status === 'resolved' || c.status === 'closed' || c.status === 'pending'
    ).length;
    const satisfaction = decided > 0
      ? Math.round((closedCount / decided) * 100)
      : null;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekResolved = allComplaints.filter(c => {
      if (c.status !== 'resolved' && c.status !== 'closed') return false;
      const resolvedAt = c.resolved_at || c.updated_at || c.created_at;
      return resolvedAt && new Date(resolvedAt) >= sevenDaysAgo;
    }).length;

    const uniqueWards = new Set(allComplaints.map(c => c.ward).filter(Boolean)).size;

    return { resolvedCount, approvedFacilities, satisfaction, lastWeekResolved, uniqueWards };
  }, [allComplaints, facilities]);


  const mapComplaints = useMemo(() =>
    allComplaints
      .map((c) => ({
        id: c.complaint_id || c.id,
        status: c.status || 'pending',
        issueType: c.issue_type || 'issue',
        ward: c.ward,
        coords: parseCoords(c.location_coords),
      }))
      .filter((c) => c.coords !== null),
    [allComplaints]
  );

  const resolvedOnMap = mapComplaints.filter(c => c.status === 'resolved' || c.status === 'closed').length;
  const activeOnMap = mapComplaints.filter(c => c.status !== 'resolved' && c.status !== 'closed').length;

  const chartData = useMemo(() => buildChartData(allComplaints), [allComplaints]);

  const approvedFacilities = useMemo(() =>
    facilities
      .filter(f => f.status === 'approved')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 3),
    [facilities]
  );

  const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}K+` : String(n);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <section className="max-w-7xl mx-auto px-6 lg:px-8 pt-32 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl md:text-6xl text-center font-bold tracking-tight text-slate-900 leading-[1.15] mb-6">
              Your voice shapes our city
            </h1>
            <p className="text-lg text-slate-600 mb-10 leading-relaxed max-w-lg">
              Report issues, propose facilities, and see real changes happen. Direct communication with city authorities means faster solutions for our community.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-12">
              <Link
                to={user ? (user.role === 'citizen' ? '/report-issue' : '/view-complaints') : '/signup'}
                className="w-full sm:w-auto bg-[#c5a85a] hover:bg-[#d5b153] text-white px-8 py-3.5 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex justify-center items-center gap-2"
              >
                Start Contributing <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="#features" className="w-full sm:w-auto px-8 py-3.5 text-slate-600 hover:text-slate-900 font-semibold transition-colors border border-slate-300 rounded-lg hover:border-slate-400 flex justify-center items-center">
                Learn More
              </a>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-2xl font-bold text-slate-900">
                  {dataLoading ? '—' : fmt(stats.resolvedCount)}
                </div>
                <div className="text-slate-600">Issues Resolved</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">
                  {dataLoading ? '—' : stats.approvedFacilities}
                </div>
                <div className="text-slate-600">New Facilities</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">
                  {dataLoading ? '—'
                    : stats.satisfaction !== null ? `${stats.satisfaction}%`
                      : 'N/A'}
                </div>
                <div className="text-slate-600">Satisfaction</div>
              </div>
            </div>
          </div>

          <div className="relative h-[500px] rounded-2xl overflow-hidden shadow-2xl">
            <img
              src={vvcmc}
              alt="Community park"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
            <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur p-4 rounded-xl shadow-lg border border-white/50">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {dataLoading
                      ? 'Loading...'
                      : `Last week: ${stats.lastWeekResolved} issue${stats.lastWeekResolved !== 1 ? 's' : ''} resolved`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-t border-slate-200 py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">How It Works</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">Three simple steps to make your community better</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: 'Step 1', title: 'Report an Issue', desc: 'Spot a pothole, broken streetlight, or garbage dump? Take a photo and report it instantly. Your location is automatically tracked.' },
              { step: 'Step 2', title: 'Track Progress', desc: 'Get real-time updates as authorities assess and work on your report. See exactly what\'s being done to fix the problem.' },
              { step: 'Step 3', title: 'See Results', desc: 'Celebrate when issues are resolved and before/after photos are shared. Your contribution made the difference.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="bg-white p-8 rounded-xl border border-slate-200 hover:border-indigo-200 hover:shadow-lg transition-all">
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-shrink-0 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">

                  </div>
                  <span className="text-sm font-bold text-slate-500">{step}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
                <p className="text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-bold text-slate-900 mb-6">Real Impact. Real Numbers.</h2>
            <p className="text-lg text-slate-600 mb-8">Our community is driving tangible changes across the city. Here's the proof:</p>
            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-slate-900 mb-1">
                  {dataLoading ? '...' : `${fmt(stats.resolvedCount)} Issues Resolved`}
                </h4>
                <p className="text-slate-600 text-sm">Across all sectors — roads, utilities, sanitation, and more</p>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1">
                  {dataLoading ? '...' : `${stats.uniqueWards} Ward${stats.uniqueWards !== 1 ? 's' : ''} Active`}
                </h4>
                <p className="text-slate-600 text-sm">Citizens contributing daily to make the city better</p>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1">
                  {dataLoading ? '...' : `${stats.approvedFacilities} Facilit${stats.approvedFacilities !== 1 ? 'ies' : 'y'} Approved`}
                </h4>
                <p className="text-slate-600 text-sm">Community-requested improvements approved by authorities</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <h3 className="text-2xl font-bold text-slate-900">6-Month Trends</h3>
            </div>
            <div className="h-[300px] w-full">
              {dataLoading ? (
                <div className="h-full flex items-center justify-center">
                  <span className="w-6 h-6 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIssues" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c7d2e0" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#c7d2e0" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorFixed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" name="Reported" dataKey="issues" stroke="#94a3b8" strokeWidth={2} fill="url(#colorIssues)" />
                    <Area type="monotone" name="Resolved" dataKey="fixed" stroke="#4f46e5" strokeWidth={2} fill="url(#colorFixed)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Active Work Zones</h2>
            <p className="text-lg text-slate-600">Live view of complaints across Vasai-Virar</p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <div className="h-[420px] w-full z-0 rounded-xl overflow-hidden border border-slate-200 relative">
              {dataLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-10">
                  <span className="w-6 h-6 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
                </div>
              )}
              <MapContainer center={MAP_CENTER} zoom={12} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; OpenStreetMap contributors &copy; CARTO'
                />
                {mapComplaints.map((c) => (
                  <CircleMarker
                    key={c.id}
                    center={c.coords}
                    radius={8}
                    pathOptions={{ fillColor: markerColor(c.status), fillOpacity: 0.85, color: '#fff', weight: 2 }}
                  >
                    <LeafletTooltip direction="top" offset={[0, -8]}>
                      <div className="text-xs font-medium">
                        <div className="capitalize">{c.issueType?.replace(/_/g, ' ')}</div>
                        <div className="text-slate-500 capitalize">Ward {c.ward} · {c.status}</div>
                      </div>
                    </LeafletTooltip>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
            <div className="mt-6 flex flex-wrap gap-6 justify-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-600 rounded-full ring-2 ring-white shadow-sm"></div>
                <span className="text-slate-600">Resolved / Closed ({resolvedOnMap})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full ring-2 ring-white shadow-sm"></div>
                <span className="text-slate-600">In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full ring-2 ring-white shadow-sm"></div>
                <span className="text-slate-600">Pending ({activeOnMap})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full ring-2 ring-white shadow-sm"></div>
                <span className="text-slate-600">Rejected</span>
              </div>
            </div>
            {!dataLoading && mapComplaints.length === 0 && (
              <p className="text-center text-slate-400 text-sm mt-4">No complaints with location data found.</p>
            )}
          </div>
        </div>
      </section>

      <section className="py-24 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 border-b border-slate-200 pb-8">
          <div>
            <h2 className="text-4xl font-bold text-slate-900 mb-2">Recently Approved Facilities</h2>
            <p className="text-slate-600">New parks, playgrounds, and public spaces built from your ideas</p>
          </div>
          <Link
            to={user ? '/facility-requests' : '/signup'}
            className="text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-2 whitespace-nowrap"
          >
            Suggest a facility <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {dataLoading ? (
          <div className="flex justify-center py-12">
            <span className="w-6 h-6 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : approvedFacilities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {approvedFacilities.map((f) => {
              const typeLabel = FACILITY_LABELS[f.facility_type] || f.facility_type || 'Facility';
              const date = f.created_at ? new Date(f.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
              return (
                <div key={f.request_id || f.id} className="group border border-slate-200 hover:border-emerald-200 rounded-xl p-6 transition-all hover:shadow-lg bg-white">
                  <div className="flex items-center gap-3 mb-4">
                    <div>
                      <h4 className="font-bold text-slate-900 capitalize">{typeLabel}</h4>
                      <p className="text-xs text-slate-500">Ward {f.ward_no || f.ward}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mb-4 leading-relaxed line-clamp-3">
                    {f.request_reason || f.reason || 'No description provided.'}
                  </p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                    <span className="text-xs text-slate-400">Requested: {date}</span>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
                      Approved
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <p className="text-sm">No approved facility requests yet. Be the first to suggest one!</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Landing;
