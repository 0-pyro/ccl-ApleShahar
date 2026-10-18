import { query } from '../config/db.js';
import { sendComplaintAlert, sendResolutionAlert } from './notificationService.js';

export async function createComplaint(citizenId, imageUrl, description, wardNo, coords, issueType) {
  const sql = `
    INSERT INTO complaints (
      citizen_id,
      image_link,
      prob_description,
      ward,
      location_coords,
      issue_type,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'pending')
    RETURNING *;
  `;

  const { rows } = await query(sql, [
    citizenId,
    imageUrl,
    description,
    parseInt(wardNo, 10),
    coords ? (typeof coords === 'object' ? JSON.stringify(coords) : String(coords)) : null,
    issueType,
  ]);

  const newComplaint = rows[0];

  // Asynchronously publish alert via AWS SNS (does not block response)
  sendComplaintAlert(newComplaint).catch((err) =>
    console.warn('SNS alert failed:', err.message)
  );

  return newComplaint;
}

export async function getAllComplaints(wardFilter) {
  let sql = 'SELECT * FROM complaints';
  const params = [];

  if (wardFilter) {
    sql += ' WHERE ward = $1';
    params.push(parseInt(wardFilter, 10));
  }

  sql += ' ORDER BY created_at DESC;';
  const { rows } = await query(sql, params);
  return rows;
}

export async function getComplaintsByWard(wardNo) {
  const sql = 'SELECT * FROM complaints WHERE ward = $1 ORDER BY created_at DESC;';
  const { rows } = await query(sql, [parseInt(wardNo, 10)]);
  return rows;
}

export async function getMyComplaints(citizenId) {
  const sql = 'SELECT * FROM complaints WHERE citizen_id = $1 ORDER BY created_at DESC;';
  const { rows } = await query(sql, [citizenId]);
  return rows;
}

export async function getComplaintById(complaintId) {
  const sql = 'SELECT * FROM complaints WHERE id = $1;';
  const { rows } = await query(sql, [complaintId]);
  return rows[0] || null;
}

export async function updateComplaintStatus(complaintId, status, estimatedTime) {
  const sql = `
    UPDATE complaints
    SET status = $1, estimated_time = $2, updated_at = NOW()
    WHERE id = $3
    RETURNING *;
  `;
  const { rows } = await query(sql, [status, estimatedTime || null, complaintId]);
  return rows[0];
}

export async function resolveComplaint(complaintId, resolveDescription, resolveImageUrl) {
  const sql = `
    UPDATE complaints
    SET 
      status = 'resolved',
      resolve_description = $1,
      resolve_image = $2,
      resolved_at = NOW(),
      updated_at = NOW()
    WHERE id = $3
    RETURNING *;
  `;
  const { rows } = await query(sql, [
    resolveDescription || '',
    resolveImageUrl || null,
    complaintId,
  ]);

  const resolved = rows[0];

  // Asynchronously dispatch resolution alert
  if (resolved) {
    sendResolutionAlert(resolved).catch((err) =>
      console.warn('SNS resolution alert failed:', err.message)
    );
  }

  return resolved;
}

/**
 * Called by the citizen after reviewing the authority's resolution.
 * satisfied=true  → status becomes 'closed' (permanently locked)
 * satisfied=false → status becomes 'pending' (complaint re-initiated)
 */
export async function citizenSatisfaction(complaintId, satisfied) {
  const newStatus = satisfied ? 'closed' : 'pending';
  const sql = `
    UPDATE complaints
    SET status = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *;
  `;
  const { rows } = await query(sql, [newStatus, complaintId]);
  return rows[0];
}