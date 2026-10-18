import supabaseAdmin from '../config/supabaseAdmin.js';

async function createComplaint(citizenId, imageUrl, description, wardNo, coords, issueType) {
  const { data, error } = await supabaseAdmin
    .from('complaints')
    .insert({
      citizen_id: citizenId,
      image_link: imageUrl,
      prob_description: description,
      ward: parseInt(wardNo),
      location_coords: coords,
      issue_type: issueType, 
      status: 'pending'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getComplaintsByWard(wardNo) {
  const { data, error } = await supabaseAdmin
    .from('complaints')
    .select('*')
    .eq('ward', wardNo)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

async function getMyComplaints(citizenId) {
  const { data, error } = await supabaseAdmin
    .from('complaints')
    .select('*')
    .eq('citizen_id', citizenId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

async function getComplaintById(complaintId) {
  const { data, error } = await supabaseAdmin
    .from('complaints')
    .select('*')
    .eq('id', complaintId)
    .single();

  if (error) throw error;
  return data;
}

async function updateComplaintStatus(complaintId, status, estimatedTime) {
  const { data, error } = await supabaseAdmin
    .from('complaints')
    .update({ status, estimated_time: estimatedTime })
    .eq('id', complaintId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function resolveComplaint(complaintId, resolveDescription, resolveImageUrl) {
  const { data, error } = await supabaseAdmin
    .from('complaints')
    .update({
      status: 'resolved',
      resolve_description: resolveDescription,
      resolve_image: resolveImageUrl,
      resolved_at: new Date().toISOString()
    })
    .eq('id', complaintId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Called by the citizen after reviewing the authority's resolution.
 * satisfied=true  → status becomes 'closed' (permanently locked)
 * satisfied=false → status becomes 'pending' (complaint re-initiated)
 */
async function citizenSatisfaction(complaintId, satisfied) {
  const newStatus = satisfied ? 'closed' : 'pending';
  const { data, error } = await supabaseAdmin
    .from('complaints')
    .update({ status: newStatus })
    .eq('id', complaintId)
    .select()
    .single();

  if (error) throw error;
  return data;
}


async function getAllComplaints(wardFilter) {
  let query = supabaseAdmin
    .from('complaints')
    .select('*')
    .order('created_at', { ascending: false });

  if (wardFilter) {
    query = query.eq('ward', wardFilter);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export {
  createComplaint,
  getComplaintsByWard,
  getMyComplaints,
  getComplaintById,
  updateComplaintStatus,
  resolveComplaint,
  citizenSatisfaction,
  getAllComplaints
};