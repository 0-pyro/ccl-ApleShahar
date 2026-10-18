import { uploadImageToSupabase } from '../services/uploadService.js';
import {
  createFacilityRequest,
  getAllFacilityRequests,
  getMyFacilityRequests,
  getFacilityRequestById,
  getFacilityRequestsByWard,
  updateFacilityStatus
} from '../services/facilityService.js';

export async function submitFacilityRequest(req, res) {
  try {
    const { facility_type, request_reason, ward_no, coords } = req.body;
    const citizenId = req.user.id;

    // Image is compulsory
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Image is required' });
    }

    let locationCoords = null;
    if (coords) {
      const [lat, lng] = coords.split(',').map(parseFloat);
      locationCoords = { lat, lng };
    }

    const imageUrl = await uploadImageToSupabase(
      req.file.buffer,
      req.file.mimetype,
      'facility_requests'
    );

    const request = await createFacilityRequest(
      citizenId,
      facility_type,
      request_reason,
      ward_no,
      imageUrl,
      locationCoords
    );

    res.status(201).json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getAllFacilityRequestsHandler(req, res) {
  try {
    const { ward } = req.query;
    const requests = await getAllFacilityRequests(ward);
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getMyFacilityRequestsHandler(req, res) {
  try {
    const citizenId = req.user.id;
    const requests = await getMyFacilityRequests(citizenId);
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getFacilityRequestByIdHandler(req, res) {
  try {
    const { id } = req.params;
    const request = await getFacilityRequestById(id);
    res.json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getWardFacilityRequestsHandler(req, res) {
  try {
    const { ward_no } = req.params;
    const requests = await getFacilityRequestsByWard(ward_no);
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function updateFacilityStatusHandler(req, res) {
  try {
    const { id } = req.params;
    const { status, reject_reason } = req.body;

    const allowed = ['pending', 'approved', 'rejected'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid status. Must be one of: ${allowed.join(', ')}` 
      });
    }

    const request = await updateFacilityStatus(id, status, reject_reason);
    res.json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}