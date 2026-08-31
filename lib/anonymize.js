// lib/anonymize.js
// SwasthyaSathi · Data Anonymization Layer
//
// Strips/masks PII from patient records before sending to AI services.
// This is a defense-in-depth measure — even if the AI prompt leaks,
// patient names and IDs won't be exposed.
//
// What is stripped:
//   - name     → replaced with "Patient" (PII)
//   - id       → replaced with a short hash (database identifier)
//   - created_by → removed entirely
//   - created_at, updated_at → kept (temporal context is useful)
//
// What is kept:
//   - age, gender, symptoms, diagnosis, vitals → medical context
//   - village → epidemiological context (not PII per se, needed for
//     questions like "how many fever cases in Rampur this week?")

/**
 * Generate a short deterministic hash from a UUID.
 * Not cryptographic — just for reference in AI responses.
 * @param {string} uuid
 * @returns {string} e.g. "P-3a7f"
 */
function shortHash(uuid) {
  if (!uuid) return 'P-0000';
  // Take chars from different positions in the UUID for better distribution
  const chars = uuid.replace(/-/g, '');
  const hash = chars.slice(0, 4);
  return `P-${hash}`;
}

/**
 * Anonymize a single patient record for AI processing.
 *
 * @param {Object} patient - Raw patient record from database
 * @returns {Object} Anonymized copy safe for AI consumption
 *
 * @example
 *   anonymizePatient({
 *     id: '550e8400-e29b-41d4-a716-446655440000',
 *     name: 'Meena Devi',
 *     age: 34,
 *     gender: 'Female',
 *     village: 'Rampur',
 *     symptoms: 'Fever, Headache',
 *     diagnosis: 'Viral Fever',
 *     ...
 *   })
 *   // Returns:
 *   // {
 *   //   ref: 'P-550e',
 *   //   age: 34,
 *   //   gender: 'Female',
 *   //   village: 'Rampur',
 *   //   symptoms: 'Fever, Headache',
 *   //   diagnosis: 'Viral Fever',
 *   //   ...
 *   // }
 */
export function anonymizePatient(patient) {
  if (!patient) return null;

  const {
    id,
    name,          // Stripped — PII
    created_by,    // Stripped — internal reference
    // Keep everything else
    ...safeFields
  } = patient;

  return {
    ref: shortHash(id),  // Short reference for AI to cite
    ...safeFields,
  };
}

/**
 * Anonymize an array of patient records.
 *
 * @param {Object[]} patients - Array of raw patient records
 * @returns {Object[]} Array of anonymized records
 */
export function anonymizePatients(patients) {
  if (!Array.isArray(patients)) return [];
  return patients.map(anonymizePatient).filter(Boolean);
}

/**
 * Create a text summary of anonymized patients for use in AI prompts.
 * Formats the data as a compact, readable string.
 *
 * @param {Object[]} anonPatients - Output from anonymizePatients()
 * @returns {string} Formatted text for embedding in prompts
 */
export function formatPatientsForPrompt(anonPatients) {
  if (!anonPatients || anonPatients.length === 0) {
    return 'No patient records available.';
  }

  return anonPatients.map(p => {
    const parts = [
      `[${p.ref}]`,
      `Age: ${p.age || '?'}`,
      `Gender: ${p.gender || '?'}`,
      `Village: ${p.village || '?'}`,
    ];

    if (p.symptoms) parts.push(`Symptoms: ${p.symptoms}`);
    if (p.diagnosis) parts.push(`Diagnosis: ${p.diagnosis}`);
    if (p.weight) parts.push(`Weight: ${p.weight}kg`);
    if (p.temp) parts.push(`Temp: ${p.temp}°F`);
    if (p.bp) parts.push(`BP: ${p.bp}`);
    if (p.spo2) parts.push(`SpO2: ${p.spo2}%`);
    if (p.duration) parts.push(`Duration: ${p.duration} ${p.duration_unit || 'days'}`);
    if (p.created_at) {
      const d = new Date(p.created_at);
      parts.push(`Date: ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`);
    }

    return parts.join(' | ');
  }).join('\n');
}
