import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PlusCircle, AlertCircle, Camera, X, CheckCircle2 } from 'lucide-react';
import {
  getStoredUser,
  getUserRole,
  getUserWard,
  getMyFacilityRequests,
  getWardFacilityRequests,
  submitFacilityRequest,
  updateFacilityStatus,
  handleApiError,
} from '../../lib/api';
import { useNavigate } from 'react-router-dom';


const FACILITY_TYPES = [
  { value: 'street_light', label: 'Street Light' },
  { value: 'garbage_bin', label: 'Garbage Bin' },
  { value: 'park', label: 'Public Park' },
  { value: 'bench', label: 'Public Bench' },
  { value: 'playground', label: 'Playground' },
  { value: 'water_tap', label: 'Water Tap / Standpost' },
  { value: 'road', label: 'Road / Footpath' },
  { value: 'toilet', label: 'Public Toilet' },
  { value: 'other', label: 'Other' },
];

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-600 border-amber-100',
  approved: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  rejected: 'bg-rose-50 text-rose-600 border-rose-100',
};

const STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};
const toUiRequest = (item) => ({
  id: String(item?.request_id || item?.id || item?._id || 'N/A'),
  facilityType: item?.facility_type || 'other',
  typeLabel:
    FACILITY_TYPES.find((t) => t.value === item?.facility_type)?.label ||
    item?.facility_type ||
    'Facility',
  reason: item?.request_reason || item?.reason || '',
  ward: item?.ward_no || item?.ward || '-',
  status: item?.status || 'pending',
  statusLabel: STATUS_LABELS[item?.status] || item?.status || 'Pending',
  rejectReason: item?.reject_reason || '',
  photo: item?.image_link || item?.photo || null,
  date: item?.created_at ? new Date(item.created_at).toLocaleDateString() : '-',
  raw: item,
});


const NewRequestModal = ({ user, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    facility_type: '',
    request_reason: '',
    ward_no: getUserWard(user) || '',
    coords: '',
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field) => (e) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const autoDetectCoords = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setFormData((prev) => ({
          ...prev,
          coords: `${latitude.toFixed(6)},${longitude.toFixed(6)}`,
        }));
      },
      () => setError('Could not detect location. Please enter coordinates manually.')
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.facility_type) { setError('Please select a facility type.'); return; }
    if (!formData.request_reason.trim()) { setError('Please provide a reason.'); return; }
    if (!formData.ward_no) { setError('Please enter your ward number.'); return; }
    if (!photoFile) { setError('A photo is required (backend will reject requests without one).'); return; }

    try {
      setSubmitting(true);
      await submitFacilityRequest(formData, photoFile);
      onSuccess();
    } catch (err) {
      setError(handleApiError(err, navigate));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-8 pb-0 flex justify-between items-start">
          <div>
            <div className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-lg text-xs font-bold mb-2 inline-block">
              New Request
            </div>
            <h3 className="text-2xl font-black text-stone-800">Request a Facility</h3>
            <p className="text-sm text-stone-500 mt-1">Tell us what your community needs.</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center bg-stone-100 rounded-full text-stone-400 hover:bg-stone-200 hover:text-stone-600 transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">Facility Type *</label>
            <select
              value={formData.facility_type}
              onChange={handleChange('facility_type')}
              className="w-full px-4 py-3 border-2 border-stone-100 bg-stone-50 rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-100 focus:border-emerald-300 focus:outline-none transition-all text-stone-700"
              required
            >
              <option value="">Select type...</option>
              {FACILITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">Why is it needed? *</label>
            <textarea
              rows="3"
              value={formData.request_reason}
              onChange={handleChange('request_reason')}
              placeholder="e.g. There are no streetlights and it's dangerous at night..."
              className="w-full px-4 py-3 border-2 border-stone-100 bg-stone-50 rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-100 focus:border-emerald-300 focus:outline-none transition-all text-stone-700 placeholder:text-stone-300 resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">Ward Number *</label>
            <input
              type="text"
              value={formData.ward_no}
              onChange={handleChange('ward_no')}
              placeholder="e.g. 19"
              className="w-full px-4 py-3 border-2 border-stone-100 bg-stone-50 rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-100 focus:border-emerald-300 focus:outline-none transition-all text-stone-700"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">
              Location Coordinates
              <span className="text-xs font-normal text-stone-400 ml-2">(lat,lng — optional)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.coords}
                onChange={handleChange('coords')}
                placeholder="19.462857,72.762668"
                className="flex-1 px-4 py-3 border-2 border-stone-100 bg-stone-50 rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-100 focus:border-emerald-300 focus:outline-none transition-all text-stone-700 text-sm"
              />
              <button
                type="button"
                onClick={autoDetectCoords}
                className="px-4 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition font-semibold text-sm whitespace-nowrap"
              >
                Detect
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">
              Photo <span className="text-red-500">*</span>
              <span className="text-xs font-normal text-stone-400 ml-2">(required)</span>
            </label>
            {!photoPreview ? (
              <div className="border-2 border-dashed border-stone-200 rounded-2xl p-5 text-center hover:border-indigo-400 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                  className="hidden"
                  id="facility-photo"
                />
                <label htmlFor="facility-photo" className="cursor-pointer flex flex-col items-center gap-2">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <Camera className="w-5 h-5 text-indigo-600" />
                  </div>
                  <p className="text-stone-600 font-medium text-sm">Take or upload photo</p>
                  <p className="text-stone-400 text-xs">Shows the location / need</p>
                </label>
              </div>
            ) : (
              <div className="relative">
                <img src={photoPreview} alt="Preview" className="w-full h-40 object-cover rounded-2xl border-2 border-emerald-200" />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <p className="text-xs text-emerald-600 mt-2 font-medium">✓ {photoFile?.name}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-2xl transition-all text-sm cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 font-black bg-[#d5b153] text-white hover:bg-[#d59e3c] rounded-2xl transition-all shadow-lg shadow-[#d5b153] hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 text-sm flex items-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Submitting...
                </>
              ) : (
                <>
                  Submit Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


const ReviewModal = ({ request, onClose, onUpdate }) => {
  const navigate = useNavigate();
  const [rejectReason, setRejectReason] = useState(request?.rejectReason || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleAction = async (newStatus) => {
    if (newStatus === 'rejected' && !rejectReason.trim()) {
      setError('Please provide a reason for rejection.');
      return;
    }
    setError('');
    try {
      setSaving(true);
      await updateFacilityStatus(
        request.id,
        newStatus,
        newStatus === 'rejected' ? rejectReason : undefined
      );
      onUpdate(request.id, newStatus, rejectReason);
      onClose();
    } catch (err) {
      setError(handleApiError(err, navigate));
    } finally {
      setSaving(false);
    }
  };

  if (!request) return null;

  return (
    <div className="fixed inset-0 bg-stone-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="p-8 pb-4 flex justify-between items-center">
          <div className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-lg text-xs font-bold inline-block">
            Review Request
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-stone-100 rounded-full text-stone-400 hover:bg-stone-200 hover:text-stone-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-8 pb-8">
          <h3 className="text-2xl font-black text-stone-800 mb-1 capitalize">
            {request.typeLabel} — Ward {request.ward}
          </h3>
          <p className="text-xs text-stone-400 mb-4">ID: {request.id} • {request.date}</p>

          {request.photo && (
            <img
              src={request.photo}
              alt="Request photo"
              className="w-full h-40 object-cover rounded-2xl mb-4 border border-stone-100"
            />
          )}

          <p className="text-sm font-medium text-stone-500 mb-6 leading-relaxed bg-stone-50 p-4 rounded-2xl">
            {request.reason}
          </p>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-bold text-stone-600 mb-2 pl-2">
              Reason / Notes <span className="text-xs font-normal text-stone-400">(required for rejection)</span>
            </label>
            <textarea
              rows="3"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-5 py-4 border-2 border-stone-100 bg-stone-50 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-emerald-300 focus:outline-none transition-all placeholder:text-stone-300 font-medium"
              placeholder="e.g. Budget approved for Q3..."
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleAction('rejected')}
              className="w-full sm:w-auto px-4 py-3 font-bold bg-gray-100 hover:bg-gray-200 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              Reject
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleAction('approved')}
              className="w-full sm:w-auto px-6 font-black bg-[#c5a85a] text-white hover:bg-[#c4a85ad8] rounded-2xl transition-all shadow-lg shadow-[#c5a85a] hover:-translate-y-1 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
              Approve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ViewFacilityRequests = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const isAuthority = getUserRole(user) === 'authority';
  const wardNo = user?.ward_no || user?.user_metadata?.ward_no;

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = isAuthority
        ? await getWardFacilityRequests(wardNo)
        : await getMyFacilityRequests();

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.requests)
          ? data.requests
          : [];

      setRequests(list.map(toUiRequest));
    } catch (err) {
      setError(handleApiError(err, navigate));
    } finally {
      setLoading(false);
    }
  }, [isAuthority, wardNo, navigate]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleUpdate = useCallback((id, newStatus, rejectReason) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: newStatus, statusLabel: STATUS_LABELS[newStatus] || newStatus, rejectReason }
          : r
      )
    );
  }, []);

  const handleNewSuccess = useCallback(() => {
    setShowNewModal(false);
    setSuccessMessage('Facility request submitted! It will appear below shortly.');
    loadRequests();
    setTimeout(() => setSuccessMessage(''), 5000);
  }, [loadRequests]);

  return (
    <div className="animate-fade-in-right lg:px-32 px-4 lg:py-12 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-3xl font-black text-stone-800 tracking-tight">Facility Requests</h2>
            <p className="text-stone-500 font-medium text-sm mt-1">
              {isAuthority
                ? 'Review community dreams and help bring them to life.'
                : 'Track your facility requests or submit a new one.'}
            </p>
          </div>
        </div>

        {!isAuthority && (
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-[#d5b153] text-white font-bold text-sm rounded-2xl hover:bg-[#d59e3c] transition-all shadow-lg shadow-[#d5b153] hover:-translate-y-0.5 whitespace-nowrap cursor-pointer"
          >
            <PlusCircle className="w-5 h-5" /> New Request
          </button>
        )}
      </div>

      {successMessage && (
        <div className="mb-6 flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-4 text-sm text-emerald-700 font-semibold">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          {successMessage}
        </div>
      )}

      {error && !loading && (
        <div className="mb-6 flex items-center gap-2 rounded-2xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700 font-semibold">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16 text-stone-500 font-medium text-sm gap-2">
          <span className="w-5 h-5 border-2 border-stone-300 border-t-emerald-500 rounded-full animate-spin"></span>
          Loading requests...
        </div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-100 overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-[#faf9f6] border-b-2 border-stone-100 text-sm font-bold text-stone-400">
                  <th className="p-5">Facility Request</th>
                  <th className="p-5">Ward</th>
                  <th className="p-5">Date</th>
                  <th className="p-5">Status</th>
                  <th className="p-5"></th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b border-stone-50 last:border-0 hover:bg-stone-50/50 transition-colors">
                    <td className="p-5">
                      <p className="font-extrabold text-stone-800 text-base capitalize">{r.typeLabel}</p>
                      <p className="text-sm font-medium text-stone-400 mt-1 line-clamp-2">
                        {r.reason || 'No description provided.'}
                      </p>
                      <p className="text-xs text-stone-300 mt-1">ID: {r.id}</p>
                    </td>
                    <td className="p-5 text-sm font-semibold text-stone-700">Ward {r.ward}</td>
                    <td className="p-5 text-sm text-stone-500">{r.date}</td>
                    <td className="p-5">
                      <span
                        className={`px-4 py-1.5 text-xs font-bold rounded-full border ${STATUS_STYLES[r.status] || STATUS_STYLES.pending
                          }`}
                      >
                        {r.statusLabel}
                      </span>
                      {r.status === 'rejected' && r.rejectReason && (
                        <p className="text-xs text-stone-400 mt-1 max-w-[180px]">{r.rejectReason}</p>
                      )}
                    </td>
                    <td className="p-5 text-right">
                      {isAuthority ? (
                        <button
                          onClick={() => setSelectedRequest(r)}
                          className="bg-stone-100 text-stone-600 hover:bg-emerald-50 hover:text-emerald-600 font-bold text-sm px-4 py-2 rounded-xl transition-all"
                        >
                          Review
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-stone-400 capitalize">{r.statusLabel}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {requests.length === 0 && (
              <div className="p-12 text-center">
                <p className="text-stone-500 font-bold">No facility requests found.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {isAuthority && selectedRequest && (
        <ReviewModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onUpdate={handleUpdate}
        />
      )}

      {/* Citizen New Request Modal */}
      {!isAuthority && showNewModal && (
        <NewRequestModal
          user={user}
          onClose={() => setShowNewModal(false)}
          onSuccess={handleNewSuccess}
        />
      )}
    </div>
  );
};

export default ViewFacilityRequests;
