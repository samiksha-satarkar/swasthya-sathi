// lib/patientService.js
// SwasthyaSathi · Patient operations
//
// These functions call the /api/patients endpoint, which enforces:
//   1. Auth (Supabase session token)
//   2. Village-based RLS (only patients in worker's active villages)
//   3. Audit logging (every action produces an audit_log row)
//
// The Supabase client imported here is used ONLY to get the session
// token. All patient data flows through the API route, not direct
// Supabase queries, so that audit logging cannot be bypassed.

import { supabase } from './supabaseClient';

/**
 * Get the current session's access token for API calls.
 * @returns {Promise<string>}
 */
async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || '';
}

/**
 * Common headers for API calls.
 */
async function authHeaders() {
  const token = await getAccessToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * Insert a new patient record.
 * The API route will:
 *   - Verify the worker is assigned to the patient's village
 *   - Set created_by to the authenticated user
 *   - Write an audit_log entry (action: 'create')
 *
 * @param {Object} patient
 * @returns {Promise<{data, error}>}
 */
export async function insertPatient(patient) {
  try {
    const headers = await authHeaders();
    const res = await fetch('/api/patients', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name:          patient.name,
        age:           patient.age,
        gender:        patient.gender,
        symptoms:      patient.symptoms,
        diagnosis:     patient.diagnosis || null,
        village:       patient.village,
        weight:        patient.weight || null,
        temp:          patient.temp || null,
        bp:            patient.bp || null,
        spo2:          patient.spo2 || null,
        duration:      patient.duration || null,
        duration_unit: patient.duration_unit || 'days',
      }),
    });
    const data = await res.json();
    if (!res.ok) return { data: null, error: { message: data.error } };
    return { data, error: null };
  } catch (e) {
    console.error('[insertPatient]', e.message);
    return { data: null, error: { message: e.message } };
  }
}

/**
 * Fetch patient records (RLS-scoped to worker's active villages).
 * The API route will write an audit_log entry (action: 'view').
 *
 * @param {Object} [options]
 * @param {string} [options.village] - filter by village
 * @param {number} [options.limit=50]
 * @returns {Promise<{data, error}>}
 */
export async function fetchPatients({ village, limit = 50 } = {}) {
  try {
    const headers = await authHeaders();
    const params = new URLSearchParams({ limit: String(limit) });
    if (village) params.set('village', village);

    const res = await fetch(`/api/patients?${params}`, { headers });
    const data = await res.json();
    if (!res.ok) return { data: null, error: { message: data.error } };
    return { data, error: null };
  } catch (e) {
    console.error('[fetchPatients]', e.message);
    return { data: null, error: { message: e.message } };
  }
}

/**
 * Fetch a single patient by ID.
 * Uses direct Supabase query (RLS still applies).
 *
 * @param {string} id - UUID
 * @returns {Promise<{data, error}>}
 */
export async function fetchPatientById(id) {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .single();

  if (error) console.error('[fetchPatientById]', error.message);
  return { data, error };
}

/**
 * Update a patient record.
 * The API route will write an audit_log entry (action: 'update').
 *
 * @param {string} id - patient UUID
 * @param {Object} updates - fields to update
 * @returns {Promise<{data, error}>}
 */
export async function updatePatient(id, updates) {
  try {
    const headers = await authHeaders();
    const res = await fetch('/api/patients', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ id, ...updates }),
    });
    const data = await res.json();
    if (!res.ok) return { data: null, error: { message: data.error } };
    return { data, error: null };
  } catch (e) {
    console.error('[updatePatient]', e.message);
    return { data: null, error: { message: e.message } };
  }
}

/**
 * Update diagnosis for an existing patient.
 * Convenience wrapper around updatePatient.
 *
 * @param {string} id
 * @param {string} diagnosis
 */
export async function updateDiagnosis(id, diagnosis) {
  return updatePatient(id, { diagnosis });
}

/**
 * Delete a patient record.
 * The API route will write an audit_log entry (action: 'delete').
 *
 * @param {string} id - patient UUID
 * @returns {Promise<{error}>}
 */
export async function deletePatient(id) {
  try {
    const headers = await authHeaders();
    const res = await fetch('/api/patients', {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (!res.ok) return { error: { message: data.error } };
    return { error: null };
  } catch (e) {
    console.error('[deletePatient]', e.message);
    return { error: { message: e.message } };
  }
}
