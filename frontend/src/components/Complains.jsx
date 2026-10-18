import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, Clock, CheckCircle2, XCircle, Loader2, MapPin } from 'lucide-react';
import { getAllComplaints } from '../lib/api';

const STATUS_STYLES = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    in_progress: 'bg-sky-50 text-sky-700 border-sky-200',
    resolved: 'bg-violet-50 text-violet-700 border-violet-200',
    closed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-rose-50 text-rose-700 border-rose-200',
};

const STATUS_LABELS = {
    pending: 'Pending',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed',
    rejected: 'Rejected',
};

const STATUS_ICONS = {
    pending: Clock,
    in_progress: Loader2,
    resolved: CheckCircle2,
    closed: CheckCircle2,
    rejected: XCircle,
};

/**
 * Normalize a raw complaint from the backend into a UI shape.
 */
const toUiComplaint = (item) => {
    const id = String(item?.complaint_id || item?.id || item?._id || 'N/A');
    const issueType = item?.issue_type || item?.type || '';
    const description = item?.prob_description || item?.description || '';
    const title = issueType
        ? issueType.charAt(0).toUpperCase() + issueType.slice(1).replace(/_/g, ' ')
        : description.slice(0, 50) || 'Untitled';

    const rawStatus = item?.status || 'pending';

    let location = null;
    if (item?.location_coords) {
        location = typeof item.location_coords === 'string'
            ? item.location_coords
            : `${item.location_coords?.lat ?? ''}, ${item.location_coords?.lng ?? ''}`;
    }

    return {
        id,
        title,
        description,
        rawStatus,
        statusLabel: STATUS_LABELS[rawStatus] || rawStatus,
        ward: item?.ward_no || item?.ward || null,
        date: item?.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
        photo: item?.image_link || item?.photo || null,
        location,
    };
};

const ISSUE_FILTER_OPTIONS = [
    { value: '', label: 'All Types' },
    { value: 'pothole', label: 'Pothole' },
    { value: 'streetlight', label: 'Streetlight' },
    { value: 'garbage', label: 'Garbage' },
    { value: 'water', label: 'Water' },
    { value: 'drainage', label: 'Drainage' },
    { value: 'tree', label: 'Tree' },
    { value: 'other', label: 'Other' },
];

const STATUS_FILTER_OPTIONS = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
    { value: 'rejected', label: 'Rejected' },
];

export default function Complains() {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const data = await getAllComplaints();
                const list = Array.isArray(data)
                    ? data
                    : Array.isArray(data?.complaints)
                        ? data.complaints
                        : [];
                setComplaints(list.map(toUiComplaint));
            } catch {
                setError('Could not load complaints. Please try again later.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const filtered = complaints.filter((c) => {
        const q = search.toLowerCase();
        const matchesSearch =
            !q ||
            c.title.toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q) ||
            String(c.ward).includes(q) ||
            c.id.toLowerCase().includes(q);
        const matchesStatus = !statusFilter || c.rawStatus === statusFilter;
        const matchesType = !typeFilter || c.rawStatus === typeFilter ||
            c.title.toLowerCase().includes(typeFilter.toLowerCase());
        return matchesSearch && matchesStatus && matchesType;
    });

    // Summary counts
    const counts = {
        total: complaints.length,
        pending: complaints.filter(c => c.rawStatus === 'pending').length,
        inProgress: complaints.filter(c => c.rawStatus === 'in_progress').length,
        resolved: complaints.filter(c => c.rawStatus === 'resolved' || c.rawStatus === 'closed').length,
    };

    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4 md:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">

                <div className="mb-10">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Public Complaints</h1>
                    <p className="mt-2 text-slate-500 text-sm">
                        All complaints submitted by citizens — visible to everyone, read-only.
                    </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Total', value: counts.total, color: 'bg-sky-50 text-black-900 border border-sky-200' },
                        { label: 'Pending', value: counts.pending, color: 'bg-sky-50 text-amber-700 border border-sky-200' },
                        { label: 'In Progress', value: counts.inProgress, color: 'bg-sky-50 text-sky-700 border border-sky-200' },
                        { label: 'Resolved', value: counts.resolved, color: 'bg-sky-50 text-emerald-700 border border-sky-200' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className={`rounded-2xl p-5 ${color}`}>
                            <p className="text-3xl font-black">{loading ? '—' : value}</p>
                            <p className="text-xs font-semibold mt-1 opacity-70 uppercase tracking-wider">{label}</p>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search by issue, ward, or ID…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition"
                    >
                        {STATUS_FILTER_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>

                {error && (
                    <div className="mb-6 flex items-center gap-2 rounded-2xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                    </div>
                )}

                {loading && (
                    <div className="flex items-center justify-center py-20 text-slate-500 gap-2 text-sm">
                        <span className="w-5 h-5 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
                        Loading complaints…
                    </div>
                )}

                {!loading && !error && (
                    <>
                        {filtered.length === 0 ? (
                            <div className="text-center py-20 text-slate-400">
                                <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                <p className="font-semibold">No complaints match your filters.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                {filtered.map((c) => {
                                    const StatusIcon = STATUS_ICONS[c.rawStatus] || Clock;
                                    return (
                                        <div
                                            key={c.id}
                                            className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
                                        >
                                            {/* Photo */}
                                            {c.photo ? (
                                                <img
                                                    src={c.photo}
                                                    alt={c.title}
                                                    className="w-full h-40 object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-40 bg-slate-100 flex items-center justify-center text-slate-300 text-xs">
                                                    No photo
                                                </div>
                                            )}

                                            <div className="p-5 flex flex-col flex-1">
                                                {/* Status badge */}
                                                <div className="mb-3">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${STATUS_STYLES[c.rawStatus] || STATUS_STYLES.pending}`}>
                                                        <StatusIcon className="w-3 h-3" />
                                                        {c.statusLabel}
                                                    </span>
                                                </div>

                                                <h3 className="font-extrabold text-slate-800 text-base capitalize leading-snug mb-2">
                                                    {c.title}
                                                </h3>

                                                <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 flex-1">
                                                    {c.description || 'No description provided.'}
                                                </p>

                                                {/* Meta */}
                                                <div className="mt-4 pt-3 border-t border-slate-50 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                                                    {c.ward && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="w-3 h-3" /> Ward {c.ward}
                                                        </span>
                                                    )}
                                                    <span>{c.date}</span>
                                                    <span className="text-slate-300 font-mono">#{c.id.slice(0, 8)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <p className="text-center text-xs text-slate-400 mt-8">
                            Showing {filtered.length} of {complaints.length} complaints
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
