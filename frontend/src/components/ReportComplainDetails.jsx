import React, { useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Camera, Navigation, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getStoredUser, handleApiError, submitComplaint } from '../lib/api';
import { useNavigate } from 'react-router-dom';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DEFAULT_CENTER = [19.428, 72.827];

const WARDS = [
  { id: 1, name: 'Ward 1', coordinates: [19.48618, 72.86282] },
  { id: 2, name: 'Ward 2', coordinates: [19.47177, 72.78948] },
  { id: 3, name: 'Ward 3', coordinates: [19.46545, 72.81495] },
  { id: 4, name: 'Ward 4', coordinates: [19.45840, 72.81818] },
  { id: 5, name: 'Ward 5', coordinates: [19.44826, 72.80621] },
  { id: 6, name: 'Ward 6', coordinates: [19.44271, 72.82833] },
  { id: 7, name: 'Ward 7', coordinates: [19.45035, 72.82782] },
  { id: 8, name: 'Ward 8', coordinates: [19.43832, 72.84538] },
  { id: 9, name: 'Ward 9', coordinates: [19.42864, 72.82376] },
  { id: 10, name: 'Ward 10', coordinates: [19.43966, 72.81776] },
  { id: 11, name: 'Ward 11', coordinates: [19.43138, 72.80492] },
  { id: 12, name: 'Ward 12', coordinates: [19.45001, 72.77567] },
  { id: 13, name: 'Ward 13', coordinates: [19.41527, 72.78456] },
  { id: 14, name: 'Ward 14', coordinates: [19.40718, 72.81023] },
  { id: 15, name: 'Ward 15', coordinates: [19.41448, 72.82293] },
  { id: 16, name: 'Ward 16', coordinates: [19.42414, 72.82138] },
  { id: 17, name: 'Ward 17', coordinates: [19.42018, 72.82686] },
  { id: 18, name: 'Ward 18', coordinates: [19.42063, 72.84194] },
  { id: 19, name: 'Ward 19', coordinates: [19.43762, 72.89138] },
  { id: 20, name: 'Ward 20', coordinates: [19.39851, 72.86631] },
  { id: 21, name: 'Ward 21', coordinates: [19.40877, 72.84093] },
  { id: 22, name: 'Ward 22', coordinates: [19.39566, 72.83382] },
  { id: 23, name: 'Ward 23', coordinates: [19.39193, 72.81841] },
  { id: 24, name: 'Ward 24', coordinates: [19.38137, 72.81067] },
  { id: 25, name: 'Ward 25', coordinates: [19.37238, 72.78553] },
  { id: 26, name: 'Ward 26', coordinates: [19.37464, 72.83722] },
  { id: 27, name: 'Ward 27', coordinates: [19.37278, 72.90632] },
  { id: 28, name: 'Ward 28', coordinates: [19.35305, 72.82931] },
  { id: 29, name: 'Ward 29', coordinates: [19.33605, 72.80448] },
];

const ISSUE_TYPES = [
  { value: 'pothole', label: 'Pothole / Road Damage' },
  { value: 'streetlight', label: 'Streetlight Not Working' },
  { value: 'garbage', label: 'Garbage / Waste Issue' },
  { value: 'water', label: 'Water Supply / Leak' },
  { value: 'drainage', label: 'Drainage / Sewage' },
  { value: 'tree', label: 'Fallen Tree / Branch' },
  { value: 'encroachment', label: 'Encroachment' },
  { value: 'noise', label: 'Noise Complaint' },
  { value: 'other', label: 'Other' },
];

const LocationMarker = ({ position, setPosition }) => {
  const map = useMapEvents({
    click(e) { setPosition(e.latlng); },
  });
  React.useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100);
  }, [map]);
  return position ? <Marker position={position} /> : null;
};

const MapUpdater = ({ center }) => {
  const map = useMapEvents({});
  React.useEffect(() => {
    if (center) map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

const getNearestWard = (lat, lng) => {
  let best = WARDS[0];
  let bestDist = Infinity;
  for (const w of WARDS) {
    const dlat = w.coordinates[0] - lat;
    const dlng = w.coordinates[1] - lng;
    const dist = dlat * dlat + dlng * dlng;
    if (dist < bestDist) { bestDist = dist; best = w; }
  }
  return best.id;
};

const ReportComplainDetails = () => {
  const user = getStoredUser();
  const navigate = useNavigate();

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [formData, setFormData] = useState({
    prob_description: '',
    issue_type: '',
    selectedWard: '',
    position: null,
    mapCenter: DEFAULT_CENTER,
    isAutoDetecting: false,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef(null);

  const handleInputChange = useCallback((field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  }, []);

  const handleWardChange = useCallback((e) => {
    const wardId = parseInt(e.target.value, 10);
    if (isNaN(wardId)) {
      setFormData(prev => ({ ...prev, selectedWard: '' }));
      return;
    }
    const ward = WARDS.find(w => w.id === wardId);
    setFormData(prev => ({
      ...prev,
      selectedWard: wardId,
      ...(ward ? {
        mapCenter: ward.coordinates,
        position: { lat: ward.coordinates[0], lng: ward.coordinates[1] },
      } : {}),
    }));
  }, []);

  const autoDetectWard = useCallback(() => {
    setFormData(prev => ({ ...prev, isAutoDetecting: true }));

    const applyWard = (wardId, lat, lng) => {
      const ward = WARDS.find(w => w.id === wardId);
      setFormData(prev => ({
        ...prev,
        selectedWard: wardId,
        isAutoDetecting: false,
        ...(ward ? {
          mapCenter: ward.coordinates,
          position: { lat: lat ?? ward.coordinates[0], lng: lng ?? ward.coordinates[1] },
        } : {}),
      }));
    };

    const onSuccess = (pos) => {
      const { latitude, longitude } = pos.coords;
      const detected = getNearestWard(latitude, longitude);
      applyWard(detected, latitude, longitude);
    };

    const onError = () => {
      applyWard(WARDS[0].id, null, null);
      setError('Unable to auto-detect location. location out of radious.');
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, { timeout: 10000 });
    } else {
      onError();
    }
  }, []);

  const handlePhotoChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  }, []);

  const removePhoto = useCallback(() => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const validateForm = () => {
    if (!formData.prob_description.trim()) return 'Please describe the problem in detail.';
    if (!formData.issue_type) return 'Please select an issue type.';
    if (!formData.selectedWard) return 'Please select or auto-detect your ward.';
    if (!formData.position) return 'Please pin the location on the map.';
    if (!photoFile) return 'Please attach a photo of the issue (required).';
    return null;
  };

  const resetForm = () => {
    setFormData({
      prob_description: '',
      issue_type: '',
      selectedWard: '',
      position: null,
      mapCenter: DEFAULT_CENTER,
      isAutoDetecting: false,
    });
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateForm();
    if (validationError) { setError(validationError); return; }

    const coordsString = `${formData.position.lat.toFixed(6)},${formData.position.lng.toFixed(6)}`;

    const fields = {
      prob_description: formData.prob_description.trim(),
      ward: String(formData.selectedWard),
      location_coords: coordsString,
      issue_type: formData.issue_type,
    };

    try {
      setSubmitting(true);
      await submitComplaint(fields, photoFile);
      setSuccess('Your complaint has been submitted successfully!');
      resetForm();
      navigate('/');
    } catch (err) {
      setError(handleApiError(err, navigate));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">Report a Problem</h1>
          <p className="text-slate-600 text-sm md:text-base">
            Help improve Vasai-Virar by reporting civic issues in your ward
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-6 md:p-8 space-y-6">

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {success}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Issue Type *</label>
              <select
                value={formData.issue_type}
                onChange={handleInputChange('issue_type')}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 focus:outline-none transition-all text-slate-700 bg-white"
                required
              >
                <option value="">Select issue type</option>
                {ISSUE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Problem Description *</label>
              <textarea
                rows="4"
                value={formData.prob_description}
                onChange={handleInputChange('prob_description')}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 focus:outline-none transition-all text-slate-700 placeholder:text-slate-400 resize-none"
                placeholder="Please describe the problem in detail..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">Ward Number *</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <select
                    value={formData.selectedWard}
                    onChange={handleWardChange}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 focus:outline-none transition-all text-slate-700 bg-white"
                  >
                    <option value="">Select your ward</option>
                    {WARDS.map(w => (
                      <option key={w.id} value={w.id}>Ward {w.id}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={autoDetectWard}
                  disabled={formData.isAutoDetecting}
                  className="px-6 py-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 focus:ring-4 focus:ring-indigo-200 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
                >
                  {formData.isAutoDetecting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Detecting...
                    </>
                  ) : (
                    <>
                      <Navigation className="w-4 h-4" />
                      Auto-detect
                    </>
                  )}
                </button>
              </div>
              {formData.selectedWard && (
                <p className="text-sm text-emerald-600 mt-2 font-medium">
                  ✓ Ward {formData.selectedWard} selected
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Attach Photo <span className="text-red-500">*</span>
              </label>
              <div className="space-y-3">
                {!photoPreview ? (
                  <div className="border-2 border-dashed border-indigo-300 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoChange}
                      className="hidden"
                      id="photo-upload"
                    />
                    <label htmlFor="photo-upload" className="cursor-pointer flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                        <Camera className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-slate-700 font-medium">Take or upload photo</p>
                        <p className="text-slate-500 text-sm">Required — helps authorities assess the issue</p>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="relative">
                    <img src={photoPreview} alt="Captured" className="w-full h-48 object-cover rounded-xl border-2 border-emerald-200" />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute top-3 right-3 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <p className="text-sm text-emerald-600 mt-2 font-medium text-center">
                      ✓ {photoFile?.name}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-500" />
                Pin Location on Map *
              </label>
              <div className="rounded-2xl overflow-hidden border-2 border-slate-200 shadow-inner" style={{ height: '300px' }}>
                <MapContainer center={formData.mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                  <MapUpdater center={formData.mapCenter} />
                  <LocationMarker
                    position={formData.position}
                    setPosition={(pos) => setFormData(prev => ({ ...prev, position: pos }))}
                  />
                </MapContainer>
              </div>
              {formData.position ? (
                <p className="text-sm text-emerald-600 mt-3 font-medium text-center">
                  ✓ Location pinned: {formData.position.lat.toFixed(4)}, {formData.position.lng.toFixed(4)}
                </p>
              ) : (
                <p className="text-sm text-slate-500 mt-3 text-center">
                  Tap on the map to drop a pin at the problem location
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#d5b153] text-white font-semibold text-lg py-2 rounded-xl hover:bg-[#c5a85a] focus:ring-4 focus:ring-emerald-200 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 cursor-pointer"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : 'Submit Complaint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportComplainDetails;
