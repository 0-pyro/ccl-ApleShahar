import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ShieldCheck, AlertCircle, ThumbsUp, ThumbsDown, Lock } from 'lucide-react';
import {
  getStoredUser,
  getUserRole,
  handleApiError,
  resolveComplaint,
  updateComplaintStatus,
  submitComplaintSatisfaction,
} from '../lib/api';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'rejected', label: 'Rejected' },
];

const STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  rejected: 'Rejected',
};

export default function ManageComplain() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useMemo(() => getStoredUser(), []);

  const isCitizen = getUserRole(user) === 'citizen';
  const [complaint, setComplaint] = useState(null);
  const [status, setStatus] = useState('pending');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [resolvedDescription, setResolvedDescription] = useState('');

  const [resolvedPhotoFile, setResolvedPhotoFile] = useState(null);
  const [resolvedPhotoPreview, setResolvedPhotoPreview] = useState(null);

  const [savedMessage, setSavedMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [satisfactionSaving, setSatisfactionSaving] = useState(false);

  useEffect(() => {
    const stateComplaint = location.state?.complaint;
    if (stateComplaint) {
      setComplaint(stateComplaint);
      const rawStatus = stateComplaint.rawStatus || stateComplaint.status || 'pending';
      setStatus(STATUS_OPTIONS.find(o => o.value === rawStatus) ? rawStatus : 'pending');
      setResolvedDescription(stateComplaint.resolvedDescription || '');
    }
  }, [location.state]);

  const handleResolvedPhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setResolvedPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setResolvedPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  // ── Authority: save status changes ──────────────────────────────────────────
  const handleSave = async (event) => {
    event.preventDefault();
    if (!complaint) return;
    setSavedMessage('');
    setError('');

    const complaintId =
      complaint.raw?.complaint_id ||
      complaint.raw?.id ||
      complaint.id;

    if (!complaintId) { setError('Complaint ID is missing.'); return; }

    try {
      setSaving(true);

      // Update status
      await updateComplaintStatus(complaintId, status, estimatedTime);

      // If resolved, also save the resolve description + optional photo
      if (status === 'resolved' || resolvedDescription || resolvedPhotoFile) {
        await resolveComplaint(complaintId, resolvedDescription, resolvedPhotoFile);
      }

      setComplaint((prev) =>
        prev ? { ...prev, status: STATUS_LABELS[status] || status, rawStatus: status } : prev
      );
      setSavedMessage(
        status === 'resolved'
          ? 'Marked as resolved. The citizen can now review and close this complaint.'
          : 'Changes saved successfully.'
      );
    } catch (err) {
      setError(handleApiError(err, navigate));
    } finally {
      setSaving(false);
    }
  };

  // ── Citizen: confirm satisfaction or re-initiate ─────────────────────────────
  const handleSatisfaction = async (satisfied) => {
    if (!complaint) return;
    const complaintId =
      complaint.raw?.complaint_id ||
      complaint.raw?.id ||
      complaint.id;

    if (!complaintId) { setError('Complaint ID is missing.'); return; }

    setError('');
    setSatisfactionSaving(true);
    try {
      await submitComplaintSatisfaction(complaintId, satisfied);
      // satisfied → 'closed' | not satisfied → 'pending'
      const newRawStatus = satisfied ? 'closed' : 'pending';
      setComplaint((prev) =>
        prev
          ? { ...prev, rawStatus: newRawStatus, status: STATUS_LABELS[newRawStatus] || newRawStatus }
          : prev
      );
      setSavedMessage(
        satisfied
          ? 'Complaint closed. Thank you for confirming!'
          : 'Complaint re-initiated. The authority will be notified.'
      );
    } catch (err) {
      setError(handleApiError(err, navigate));
    } finally {
      setSatisfactionSaving(false);
    }
  };

  if (!complaint) {
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-xl">
          <p className="text-lg font-semibold text-slate-900">No complaint available</p>
          <p className="mt-3 text-sm text-slate-500">Select a report from the list to manage it.</p>
          <button
            type="button"
            onClick={() => navigate('/view-complaints')}
            className="mt-8 inline-flex items-center gap-2 rounded-3xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" /> Back to reports
          </button>
        </div>
      </div>
    );
  }

  const rawStatus = complaint.rawStatus || '';
  const isResolved = rawStatus === 'resolved';   // authority resolved — citizen must review
  const isClosed = rawStatus === 'closed';     // citizen confirmed — permanently locked

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              {isCitizen ? 'View report' : 'Manage report'}
            </p>
            <h1 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">{complaint.title}</h1>
          </div>
          <button
            type="button"
            onClick={() => navigate('/view-complaints')}
            className="inline-flex items-center gap-2 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" /> Back to all reports
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
          {/* Left: Complaint Details */}
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-900">
                    {STATUS_LABELS[rawStatus] || complaint.status}
                  </div>
                  <p className="text-sm text-slate-500">{complaint.location} • {complaint.date}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Report ID</p>
                    <p className="mt-2 font-semibold text-slate-900 break-all">{complaint.id}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Ward</p>
                    <p className="mt-2 font-semibold text-slate-900">{complaint.ward}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Issue Type</p>
                    <p className="mt-2 font-semibold text-slate-900">{complaint.title}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_0.85fr]">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Issue summary</h2>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{complaint.description}</p>
                  </div>
                  <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Location</p>
                    <p className="mt-3 text-sm font-semibold text-slate-900">{complaint.location}</p>
                  </div>
                </div>
                <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50">
                  {complaint.photo ? (
                    <img src={complaint.photo} alt="Complaint evidence" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
                      No photo attached
                    </div>
                  )}
                  <div className="bg-slate-50 px-5 py-4 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">
                      {complaint.photo ? 'Attached evidence' : 'No evidence photo'}
                    </p>
                    {!isCitizen && (
                      <p className="mt-1 text-slate-600">Upload a resolution photo when the issue is fixed.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Resolution details card — shown when authority has resolved */}
            {(isResolved || isClosed) && (complaint.raw?.resolve_description || complaint.raw?.resolve_image) && (
              <div className="rounded-[2rem] p-6 shadow-sm space-y-4">
                <p className="text-xs uppercase tracking-[0.24em] text-emerald-600 font-bold">
                  Authority's Resolution
                </p>
                {complaint.raw?.resolve_description && (
                  <p className="text-sm leading-7 text-slate-700">{complaint.raw.resolve_description}</p>
                )}
                {complaint.raw?.resolve_image && (
                  <img
                    src={complaint.raw.resolve_image}
                    alt="Resolution evidence"
                    className="w-full rounded-2xl object-cover max-h-56 border border-emerald-100"
                  />
                )}
              </div>
            )}

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-slate-700">
                <div>
                  <p className="text-sm font-semibold">Status overview</p>
                  <p className="text-sm text-slate-500">Current status of this report.</p>
                </div>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Current status</p>
                  <p className="mt-3 font-semibold text-slate-900">
                    {STATUS_LABELS[rawStatus] || complaint.status}
                  </p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Filed on</p>
                  <p className="mt-3 font-semibold text-slate-900">{complaint.date}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Action Panel */}
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Action center</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">
                    {isCitizen ? 'Your Action' : 'Take action'}
                  </h2>
                </div>
              </div>

              {savedMessage && (
                <div className="mt-5 rounded-3xl bg-emerald-50 p-4 text-sm text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  {savedMessage}
                </div>
              )}

              {error && (
                <div className="mt-5 rounded-3xl bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* ── CITIZEN PANEL ── */}
              {isCitizen ? (
                <div className="mt-6 space-y-4">

                  {/* Resolved — citizen must review */}
                  {isResolved && (
                    <div className="space-y-5">
                      <div className="rounded-3xl border border-indigo-200 p-5">
                        <p className="text-xs uppercase tracking-[0.24em] text-indigo-600 font-semibold mb-2">
                          Authority has resolved this complaint
                        </p>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          Please review the resolution details on the left and confirm whether the issue has been addressed.
                        </p>
                      </div>

                      <div className="flex flex-col gap-3">
                        <button
                          type="button"
                          disabled={satisfactionSaving}
                          onClick={() => handleSatisfaction(true)}
                          className="w-full flex items-center justify-center gap-2 rounded-3xl bg-[#d5b153] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#d59e3c] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-emerald-200 cursor-pointer"
                        >
                          Satisfied — Close Complaint
                        </button>

                        <button
                          type="button"
                          disabled={satisfactionSaving}
                          onClick={() => handleSatisfaction(false)}
                          className="w-full flex items-center justify-center gap-2 rounded-3xl bg-orange-50 border border-orange-200 px-6 py-4 text-sm font-semibold text-orange-700 transition hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Not Satisfied — Re-initiate Complaint
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Closed — permanently locked */}
                  {isClosed && (
                    <div className="rounded-3xl border border-[#c5a85a] p-5 space-y-3">
                      <div className="flex items-center gap-2 text-emerald-700">
                        <Lock className="h-5 w-5 flex-shrink-0" />
                        <p className="font-semibold text-sm">Complaint Closed</p>
                      </div>
                      <p className="text-sm text-slate-600 leading-6">
                        You confirmed this complaint as resolved. It is now permanently closed.
                      </p>
                    </div>
                  )}

                  {/* All other statuses — no citizen action */}
                  {!isResolved && !isClosed && (
                    <>
                      <div className="rounded-3xl bg-slate-50 p-5">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Current status</p>
                        <p className="mt-3 font-semibold text-slate-900">
                          {STATUS_LABELS[rawStatus] || complaint.status}
                        </p>
                      </div>
                      <p className="text-sm leading-6 text-slate-600">
                        Status updates are handled by the authorities. You will be able to close or re-initiate this complaint once they mark it as resolved.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                /* ── AUTHORITY PANEL ── */
                <form onSubmit={handleSave} className="mt-6 space-y-6">
                  {/* Status */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-700">Update status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Estimated time */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-700">Estimated resolution time</label>
                    <input
                      type="text"
                      value={estimatedTime}
                      onChange={(e) => setEstimatedTime(e.target.value)}
                      placeholder="e.g. 3-5 business days"
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    />
                  </div>

                  {/* Resolution description */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-700">
                      Resolution description{status === 'resolved' ? ' *' : ' (optional)'}
                    </label>
                    <textarea
                      rows="4"
                      value={resolvedDescription}
                      onChange={(e) => setResolvedDescription(e.target.value)}
                      placeholder="Describe what was done to fix the issue"
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 resize-none"
                    />
                  </div>

                  {/* Resolution image */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-700">
                      Resolution photo {status === 'resolved' ? '(recommended)' : '(optional)'}
                    </label>
                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleResolvedPhotoChange}
                        className="w-full text-sm text-slate-500 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-slate-700"
                      />
                      {resolvedPhotoPreview && (
                        <div className="mt-4 relative">
                          <img
                            src={resolvedPhotoPreview}
                            alt="Resolved evidence"
                            className="h-40 w-full rounded-3xl object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => { setResolvedPhotoFile(null); setResolvedPhotoPreview(null); }}
                            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/80 text-white transition hover:bg-slate-950"
                          >
                            ×
                          </button>
                          <p className="text-xs text-slate-500 mt-2">{resolvedPhotoFile?.name}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-3xl bg-[#c5a85a] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#d5b153] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Saving...
                      </span>
                    ) : 'Save changes'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
