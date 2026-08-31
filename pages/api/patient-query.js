// pages/api/patient-query.js
// SwasthyaSathi · Read-Only AI Patient Query Assistant
//
// Lets ASHA workers ask questions about their assigned patients.
// The AI can ONLY summarize existing records — it must not generate
// medical advice, diagnoses, or invent information.
//
// Flow:
//   1. Authenticate the user via Supabase session token
//   2. Fetch all patients visible to this worker (RLS-scoped)
//   3. Anonymize the records (strip names, IDs)
//   4. Build a system prompt constraining the AI to summarization only
//   5. Send to Anthropic and return the response

import { createClient } from '@supabase/supabase-js';
import { anonymizePatients, formatPatientsForPrompt } from '../../lib/anonymize';

const SYSTEM_PROMPT = `You are a data summarization assistant for an ASHA (Accredited Social Health Activist) health worker in India.

STRICT RULES:
1. You have access ONLY to the patient records provided below. Answer questions using ONLY this data.
2. If the answer is not in the data, say: "This information is not available in the current records."
3. Do NOT generate medical advice, diagnoses, or treatment recommendations.
4. Do NOT invent information, statistics, or details not present in the records.
5. Do NOT make up patient names — refer to patients by their reference code (e.g. P-3a7f).
6. You may count, summarize, compare, and identify trends from the data.
7. Keep answers concise and practical for a frontline health worker.
8. You may respond in Hindi or English based on the question language.

EXAMPLES OF ALLOWED QUESTIONS:
- "How many patients have fever this week?"
- "List all patients from Rampur village"
- "Which patients need follow-up?"
- "Summarize today's new cases"

EXAMPLES OF QUESTIONS YOU MUST REFUSE:
- "What medicine should I give for fever?" → Refuse: "I can only summarize existing records, not provide medical advice."
- "What is the diagnosis for these symptoms?" → Refuse: same reason
- "Create a treatment plan" → Refuse: same reason`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── 1. AUTH CHECK ──
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const token = authHeader.replace('Bearer ', '');

  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    }
  );

  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }

  // ── 2. VALIDATE INPUT ──
  const { question } = req.body;
  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({ error: 'Please provide a question.' });
  }

  if (question.length > 500) {
    return res.status(400).json({ error: 'Question is too long. Please keep it under 500 characters.' });
  }

  // ── 3. FETCH PATIENT DATA (RLS-scoped to this worker's villages) ──
  const { data: patients, error: fetchError } = await supabaseAuth
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200); // Cap to prevent enormous prompts

  if (fetchError) {
    console.error('[patient-query] Fetch error:', fetchError.message);
    return res.status(500).json({ error: 'Failed to load patient data.' });
  }

  if (!patients || patients.length === 0) {
    return res.status(200).json({
      answer: 'No patient records are available in your assigned villages. Please add villages in Settings first.',
      sources: [],
      disclaimer: 'This summary is based on existing records only. It is not medical advice.',
      patientCount: 0,
    });
  }

  // ── 4. ANONYMIZE ──
  const anonPatients = anonymizePatients(patients);
  const patientContext = formatPatientsForPrompt(anonPatients);

  // ── 5. BUILD PROMPT & CALL ANTHROPIC ──
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'AI service is not configured on the server.' });
  }

  const fullPrompt = `${SYSTEM_PROMPT}

--- PATIENT RECORDS (${anonPatients.length} total) ---
${patientContext}
--- END OF RECORDS ---

Worker's question: ${question.trim()}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: fullPrompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[patient-query] Anthropic error:', data.error);
      return res.status(response.status).json({
        error: data.error?.message || 'AI service error',
      });
    }

    const answer = (data.content || []).map(b => b.text || '').join('');

    // Extract referenced patient IDs from the answer
    const refPattern = /P-[a-f0-9]{4}/gi;
    const sources = [...new Set((answer.match(refPattern) || []))];

    return res.status(200).json({
      answer,
      sources,
      disclaimer: 'This summary is based on existing records only. It is not medical advice.',
      patientCount: anonPatients.length,
    });
  } catch (error) {
    console.error('[patient-query] Error:', error.message);
    return res.status(500).json({ error: 'Failed to connect to AI service. Please try again.' });
  }
}
