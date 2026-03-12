// pages/api/patients.js  (Next.js Pages Router)
// SwasthyaSathi · REST API for patient records

import { insertPatient, fetchPatients } from '../../lib/patientService';

export default async function handler(req, res) {
  // ── GET /api/patients?village=Rampur&limit=20 ────────────
  if (req.method === 'GET') {
    const { village, limit } = req.query;

    const { data, error } = await fetchPatients({
      village: village || undefined,
      limit:   limit ? parseInt(limit, 10) : 50,
    });

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({ success: true, count: data.length, patients: data });
  }

  // ── POST /api/patients ───────────────────────────────────
  if (req.method === 'POST') {
    const { name, age, gender, symptoms, diagnosis, village } = req.body;

    // Basic validation
    if (!name || !age || !gender || !village) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: name, age, gender, village',
      });
    }

    if (!['Male', 'Female', 'Other'].includes(gender)) {
      return res.status(400).json({
        success: false,
        error: 'gender must be Male, Female, or Other',
      });
    }

    const { data, error } = await insertPatient({
      name, age: Number(age), gender, symptoms, diagnosis, village,
    });

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(201).json({ success: true, patient: data });
  }

  // Method not allowed
  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).json({ success: false, error: `Method ${req.method} not allowed` });
}
