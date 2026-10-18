import { query } from '../config/db.js';

export async function createFacilityRequest(citizenId, facilityType, reason, wardNo, imageUrl, coords) {
  const sql = `
    INSERT INTO facility_requests (
      citizen_id,
      facility_type,
      request_reason,
      ward,
      image_link,
      location_coords,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'pending')
    RETURNING *;
  `;

  const { rows } = await query(sql, [
    citizenId,
    facilityType,
    reason,
    parseInt(wardNo, 10),
    imageUrl,
    coords ? (typeof coords === 'object' ? JSON.stringify(coords) : String(coords)) : null,
  ]);

  return rows[0];
}

export async function getAllFacilityRequests(wardFilter) {
  let sql = 'SELECT * FROM facility_requests';
  const params = [];

  if (wardFilter) {
    sql += ' WHERE ward = $1';
    params.push(parseInt(wardFilter, 10));
  }

  sql += ' ORDER BY created_at DESC;';
  const { rows } = await query(sql, params);
  return rows;
}

export async function getMyFacilityRequests(citizenId) {
  const sql = 'SELECT * FROM facility_requests WHERE citizen_id = $1 ORDER BY created_at DESC;';
  const { rows } = await query(sql, [citizenId]);
  return rows;
}

export async function getFacilityRequestById(requestId) {
  const sql = 'SELECT * FROM facility_requests WHERE id = $1;';
  const { rows } = await query(sql, [requestId]);
  return rows[0] || null;
}

export async function getFacilityRequestsByWard(wardNo) {
  const sql = 'SELECT * FROM facility_requests WHERE ward = $1 ORDER BY created_at DESC;';
  const { rows } = await query(sql, [parseInt(wardNo, 10)]);
  return rows;
}

export async function updateFacilityStatus(requestId, status, rejectReason) {
  const sql = `
    UPDATE facility_requests
    SET status = $1, reject_reason = $2
    WHERE id = $3
    RETURNING *;
  `;

  const { rows } = await query(sql, [status, rejectReason || null, requestId]);
  return rows[0];
}