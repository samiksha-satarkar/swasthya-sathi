// lib/patientService.js
// SwasthyaSathi · Patient CRUD operations via Supabase

import { supabase } from './supabaseClient';

/**
 * Insert a new patient record.
 * @param {Object} patient
 * @param {string} patient.name
 * @param {number} patient.age
 * @param {'Male'|'Female'|'Other'} patient.gender
 * @param {string} patient.symptoms
 * @param {string} [patient.diagnosis]
 * @param {string} patient.village
 * @returns {Promise<{data, error}>}
 */
export async function insertPatient(patient) {
  const { data, error } = await supabase
    .from('patients')
    .insert([
      {
        name:      patient.name,
        age:       patient.age,
        gender:    patient.gender,
        symptoms:  patient.symptoms,
        diagnosis: patient.diagnosis || null,
        village:   patient.village,
      },
    ])
    .select()   // return the inserted row
    .single();

  if (error) console.error('[insertPatient]', error.message);
  return { data, error };
}

/**
 * Fetch all patient records, newest first.
 * @param {Object} [options]
 * @param {string} [options.village]   - filter by village
 * @param {number} [options.limit=50]  - max rows to return
 * @returns {Promise<{data, error}>}
 */
export async function fetchPatients({ village, limit = 50 } = {}) {
  let query = supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (village) {
    query = query.ilike('village', `%${village}%`);
  }

  const { data, error } = await query;
  if (error) console.error('[fetchPatients]', error.message);
  return { data, error };
}

/**
 * Fetch a single patient by ID.
 * @param {string} id - UUID
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
 * Update diagnosis for an existing patient.
 * @param {string} id
 * @param {string} diagnosis
 */
export async function updateDiagnosis(id, diagnosis) {
  const { data, error } = await supabase
    .from('patients')
    .update({ diagnosis })
    .eq('id', id)
    .select()
    .single();

  if (error) console.error('[updateDiagnosis]', error.message);
  return { data, error };
}
