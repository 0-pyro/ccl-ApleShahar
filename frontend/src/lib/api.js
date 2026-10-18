const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
console.log('API Base URL:', API_BASE_URL);

const STORAGE_KEYS = {
  token: 'token',
  user: 'user',
};

export function getStoredToken() {
  return localStorage.getItem(STORAGE_KEYS.token);
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem(STORAGE_KEYS.token, token);
  } else {
    localStorage.removeItem(STORAGE_KEYS.token);
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.user);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.user);
  }
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.user);
}

export function getUserRole(user = getStoredUser()) {
  const raw = (
    user?.role ||
    user?.userRole ||
    user?.role_name ||
    user?.user_metadata?.role ||
    user?.user_metadata?.userRole ||
    user?.user_metadata?.role_name ||
    user?.raw_user_meta_data?.role ||
    user?.raw_user_meta_data?.userRole ||
    user?.app_metadata?.role ||
    user?.app_metadata?.userRole ||
    null
  );

  if (!raw) return 'citizen';
  const r = String(raw).toLowerCase();
  if (r.includes('authority') || r.includes('admin')) return 'authority';
  return 'citizen';
}

export function getUserWard(user = getStoredUser()) {
  return (
    user?.ward_no ||
    user?.user_metadata?.ward_no ||
    user?.ward ||
    null
  );
}

// ─── Error handling ──────────────────────────────────────────────────────────

/**
 * Call this in component catch blocks.
 * Handles 401 by clearing session and redirecting to login.
 * Returns a user-friendly message string.
 *
 * @param {Error} err - Error thrown by an api function
 * @param {function} navigate - react-router navigate (optional)
 */
export function handleApiError(err, navigate = null) {
  if (err?.status === 401) {
    clearSession();
    if (navigate) navigate('/login', { replace: true });
    return 'Your session has expired. Please sign in again.';
  }
  if (err?.status === 403) {
    return 'You are not authorized to perform this action.';
  }
  return err?.payload?.error || err?.payload?.message || err?.message || 'An unexpected error occurred.';
}

async function parseResponse(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function request(path, options = {}) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    const message = data?.error || data?.message || `Request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

/**
 * Multipart/form-data request.
 * Do NOT set Content-Type header — the browser sets it with the correct boundary.
 *
 * @param {string} path
 * @param {FormData} formData
 * @param {'POST'|'PATCH'|'PUT'} method
 */
async function requestFormData(path, formData, method = 'POST') {
  const token = getStoredToken();
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: formData,
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    const message = data?.error || data?.message || `Request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

export async function registerUser(payload) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function loginUser({ email, password }) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchMe() {
  return request('/api/auth/me');
}

/**
 * Submit a new complaint.
 * Backend expects multipart/form-data.
 *
 * @param {Object} fields - { prob_description, ward, location_coords, issue_type }
 * @param {File|null} imageFile - image file (required by backend)
 */
export async function submitComplaint(fields, imageFile) {
  const fd = new FormData();

  fd.append('prob_description', fields.prob_description || '');
  fd.append('ward', String(fields.ward || ''));
  fd.append('location_coords', fields.location_coords || '');
  fd.append('issue_type', fields.issue_type || '');

  fd.append('description', fields.prob_description || '');
  fd.append('coords', fields.location_coords || '');

  if (imageFile) {
    fd.append('image', imageFile);
  }

  return requestFormData('/api/complaints', fd, 'POST');
}

export async function getMyComplaints() {
  return request('/api/complaints/my');
}
export async function getAllComplaints() {
  return request('/api/complaints');
}

/** Get a single complaint by id */
export async function getComplaintById(id) {
  return request(`/api/complaints/${encodeURIComponent(id)}`);
}

/**
 * Get ward complaints (authority only).
 * Falls back to stored user's ward if wardNo not provided.
 */
export async function getWardComplaints(wardNo) {
  const ward = wardNo || getUserWard();
  if (!ward) {
    throw new Error('Ward number is missing for authority account.');
  }
  return request(`/api/complaints/ward/${encodeURIComponent(ward)}`);
}

/**
 * Update complaint status (authority only).
 *
 * @param {string|number} complaintId
 * @param {string} status - 'pending'|'in_progress'|'resolved'|'rejected'
 * @param {string} [estimatedTime] - optional estimated resolution time
 */
export async function updateComplaintStatus(complaintId, status, estimatedTime) {
  const body = { status };
  if (estimatedTime !== undefined && estimatedTime !== null && estimatedTime !== '') {
    body.estimated_time = estimatedTime;
  }
  return request(`/api/complaints/${encodeURIComponent(complaintId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/**
 * Resolve a complaint (authority only).
 * Backend expects multipart/form-data.
 *
 * @param {string|number} complaintId
 * @param {string} resolveDescription
 * @param {File|null} imageFile
 */
export async function resolveComplaint(complaintId, resolveDescription, imageFile) {
  const fd = new FormData();
  fd.append('resolve_description', resolveDescription || '');
  if (imageFile) {
    fd.append('image', imageFile);
  }
  return requestFormData(`/api/complaints/${encodeURIComponent(complaintId)}/resolve`, fd, 'PATCH');
}

/**
 * Citizen confirms or rejects an authority's resolution.
 * satisfied=true  → complaint becomes 'resolved' (locked)
 * satisfied=false → complaint becomes 'reopened'
 *
 * @param {string|number} complaintId
 * @param {boolean} satisfied
 */
export async function submitComplaintSatisfaction(complaintId, satisfied) {
  return request(`/api/complaints/${encodeURIComponent(complaintId)}/satisfaction`, {
    method: 'PATCH',
    body: JSON.stringify({ satisfied }),
  });
}


// ─── Facility Request API ────────────────────────────────────────────────────

/**
 * Submit a new facility request (citizen only).
 * Backend expects multipart/form-data.
 *
 * @param {Object} fields - { facility_type, request_reason, ward_no, coords }
 * @param {File|null} imageFile - required by backend
 */
export async function submitFacilityRequest(fields, imageFile) {
  const fd = new FormData();
  fd.append('facility_type', fields.facility_type || '');
  fd.append('request_reason', fields.request_reason || '');
  fd.append('ward_no', String(fields.ward_no || ''));
  fd.append('coords', fields.coords || '');

  if (imageFile) {
    fd.append('image', imageFile);
  }

  return requestFormData('/api/facility', fd, 'POST');
}

/** Get logged-in citizen's facility requests */
export async function getMyFacilityRequests() {
  return request('/api/facility/my');
}

/** Get all public facility requests */
export async function getAllFacilityRequests() {
  return request('/api/facility');
}

/** Get a single facility request by id */
export async function getFacilityRequestById(id) {
  return request(`/api/facility/${encodeURIComponent(id)}`);
}

/**
 * Get ward facility requests (authority only).
 */
export async function getWardFacilityRequests(wardNo) {
  const ward = wardNo || getUserWard();
  if (!ward) {
    throw new Error('Ward number is missing for authority account.');
  }
  return request(`/api/facility/ward/${encodeURIComponent(ward)}`);
}

/**
 * Update facility request status (authority only).
 *
 * @param {string|number} requestId
 * @param {'pending'|'approved'|'rejected'} status
 * @param {string} [rejectReason]
 */
export async function updateFacilityStatus(requestId, status, rejectReason) {
  const body = { status };
  if (rejectReason !== undefined && rejectReason !== null && rejectReason !== '') {
    body.reject_reason = rejectReason;
  }
  return request(`/api/facility/${encodeURIComponent(requestId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
