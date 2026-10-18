import supabaseAdmin from '../config/supabaseAdmin.js';

async function createFacilityRequest(citizenId, facilityType, reason, wardNo, imageUrl, coords) {
  const { data, error } = await supabaseAdmin
    .from('facility_requests')
    .insert({
      citizen_id: citizenId,
      facility_type: facilityType,
      request_reason: reason,
      ward: parseInt(wardNo),
      image_link: imageUrl,
      location_coords: coords,
      status: 'pending'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getAllFacilityRequests(wardFilter) {
  let query = supabaseAdmin
    .from('facility_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (wardFilter) {
    query = query.eq('ward', parseInt(wardFilter));
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function getMyFacilityRequests(citizenId) {
  const { data, error } = await supabaseAdmin
    .from('facility_requests')
    .select('*')
    .eq('citizen_id', citizenId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

async function getFacilityRequestById(requestId) {
  const { data, error } = await supabaseAdmin
    .from('facility_requests')
    .select('*')
    .eq('request_id', requestId)
    .single();

  if (error) throw error;
  return data;
}

async function getFacilityRequestsByWard(wardNo) {
  const { data, error } = await supabaseAdmin
    .from('facility_requests')
    .select('*')
    .eq('ward', parseInt(wardNo))
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

async function updateFacilityStatus(requestId, status, rejectReason) {
  const updateData = { status };

  if (status === 'rejected' && rejectReason) {
    updateData.reject_reason = rejectReason;
  }

  const { data, error } = await supabaseAdmin
    .from('facility_requests')
    .update(updateData)
    .eq('request_id', requestId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export {
  createFacilityRequest,
  getAllFacilityRequests,
  getMyFacilityRequests,
  getFacilityRequestById,
  getFacilityRequestsByWard,
  updateFacilityStatus
};