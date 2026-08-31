// pages/api/patients.js
// SwasthyaSathi · Patients API Route (GET + POST + PATCH + DELETE)
//
// Every action that touches a patient record MUST insert an audit_log
// row. If the audit insert fails, the whole request fails — we do NOT
// return success without a matching audit entry.
//
// RLS enforcement: We create a Supabase client with the caller's
// access token so Postgres RLS (village-based) filters automatically.

import { createClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client authenticated as the requesting user.
 * RLS policies will scope data to the user's assigned villages.
 */
function getAuthClient(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { client: null, error: 'Missing or invalid Authorization header' };
  }
  const token = authHeader.replace('Bearer ', '');
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  return { client, token, error: null };
}

/**
 * Insert an audit_log row. Returns { error } — caller MUST check this
 * and fail the request if error is non-null.
 */
async function insertAudit(client, { workerId, patientId, action, detail }) {
  const { error } = await client
    .from('audit_log')
    .insert([{
      worker_id:  workerId,
      patient_id: patientId || null,
      action,
      detail: detail || null,
    }]);
  return { error };
}

export default async function handler(req, res) {
  // ── AUTH ──
  const { client, error: authErr } = getAuthClient(req);
  if (authErr) {
    return res.status(401).json({ error: authErr });
  }

  const { data: { user }, error: userErr } = await client.auth.getUser();
  if (userErr || !user) {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }

  // ══════════════════════════════════════════════════════════
  // GET — Fetch patients (RLS scopes to worker's active villages)
  // ══════════════════════════════════════════════════════════
  if (req.method === 'GET') {
    const { village, limit = 50 } = req.query;

    let query = client
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (village) {
      query = query.ilike('village', `%${village}%`);
    }

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Audit: log the view action
    // For bulk fetches we log a single "view" with the count, not one per row.
    const { error: auditErr } = await insertAudit(client, {
      workerId:  user.id,
      patientId: null,
      action:    'view',
      detail:    { type: 'list', count: data?.length || 0, village: village || null },
    });
    if (auditErr) {
      console.error('[patients:GET] Audit insert failed:', auditErr.message);
      return res.status(500).json({ error: 'Failed to write audit log. Request aborted.' });
    }

    return res.status(200).json(data);
  }

  // ══════════════════════════════════════════════════════════
  // POST — Create a new patient
  // ══════════════════════════════════════════════════════════
  if (req.method === 'POST') {
    const { name, age, gender, symptoms, diagnosis, village,
            weight, temp, bp, spo2, duration, duration_unit } = req.body;

    if (!name || !age || !gender || !village) {
      return res.status(400).json({ error: 'Missing required fields: name, age, gender, village' });
    }

    const row = {
      name,
      age: Number(age),
      gender,
      symptoms: symptoms || null,
      diagnosis: diagnosis || null,
      village,
      weight: weight ? Number(weight) : null,
      temp: temp ? Number(temp) : null,
      bp: bp || null,
      spo2: spo2 ? Number(spo2) : null,
      duration: duration || null,
      duration_unit: duration_unit || 'days',
      created_by: user.id,
    };

    // Insert patient (RLS will verify village is in worker's active assignments)
    const { data, error } = await client
      .from('patients')
      .insert([row])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Audit: MUST succeed or we fail the whole request
    const { error: auditErr } = await insertAudit(client, {
      workerId:  user.id,
      patientId: data.id,
      action:    'create',
      detail:    { village: data.village },
    });
    if (auditErr) {
      // Patient was created but audit failed — this is a problem.
      // We can't un-create the patient from here (no transaction wrapper
      // available via PostgREST), so log loudly and return error so the
      // caller knows something went wrong.
      console.error('[patients:POST] CRITICAL: Patient created but audit insert failed:', auditErr.message);
      return res.status(500).json({ error: 'Patient saved but audit log failed. Contact administrator.' });
    }

    // TODO: Notify the original worker when someone else edits their patient.
    // This is an open policy question — do not implement notification behavior
    // without explicit design decisions on: who gets notified, via what channel,
    // and what happens if the notification fails.

    return res.status(201).json(data);
  }

  // ══════════════════════════════════════════════════════════
  // PATCH — Update a patient record
  // ══════════════════════════════════════════════════════════
  if (req.method === 'PATCH') {
    const { id, ...updates } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Missing patient id' });
    }

    // Remove fields that should not be directly updated
    delete updates.created_by;
    delete updates.created_at;
    delete updates.id;

    const { data, error } = await client
      .from('patients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Audit
    const { error: auditErr } = await insertAudit(client, {
      workerId:  user.id,
      patientId: id,
      action:    'update',
      detail:    { fields_changed: Object.keys(updates) },
    });
    if (auditErr) {
      console.error('[patients:PATCH] CRITICAL: Patient updated but audit insert failed:', auditErr.message);
      return res.status(500).json({ error: 'Patient updated but audit log failed. Contact administrator.' });
    }

    // TODO: Notify the original worker when someone else edits their patient.

    return res.status(200).json(data);
  }

  // ══════════════════════════════════════════════════════════
  // DELETE — Delete a patient record
  // ══════════════════════════════════════════════════════════
  if (req.method === 'DELETE') {
    const { id } = req.body || req.query;

    if (!id) {
      return res.status(400).json({ error: 'Missing patient id' });
    }

    const { error } = await client
      .from('patients')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Audit
    const { error: auditErr } = await insertAudit(client, {
      workerId:  user.id,
      patientId: id,
      action:    'delete',
    });
    if (auditErr) {
      console.error('[patients:DELETE] CRITICAL: Patient deleted but audit insert failed:', auditErr.message);
      return res.status(500).json({ error: 'Patient deleted but audit log failed. Contact administrator.' });
    }

    return res.status(200).json({ success: true });
  }

  // Method not allowed
  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}