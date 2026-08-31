// pages/api/diagnose.js
// SwasthyaSathi · Secured server-side proxy for Anthropic API
// - Auth: Validates Supabase session token
// - Input validation: Whitelists allowed fields, caps max_tokens
// - Rate limiting: Simple in-memory token-bucket (10 req/min per user)
// - Keeps ANTHROPIC_API_KEY out of the browser.

import { createClient } from '@supabase/supabase-js';

// ── RATE LIMITER (in-memory, resets on cold start) ──
const rateLimits = new Map(); // userId -> { tokens, lastRefill }
const MAX_TOKENS = 10;        // max requests
const REFILL_MS  = 60_000;    // per 60 seconds

function checkRateLimit(userId) {
  const now = Date.now();
  let bucket = rateLimits.get(userId);

  if (!bucket) {
    bucket = { tokens: MAX_TOKENS, lastRefill: now };
    rateLimits.set(userId, bucket);
  }

  // Refill tokens based on elapsed time
  const elapsed = now - bucket.lastRefill;
  if (elapsed > REFILL_MS) {
    bucket.tokens = MAX_TOKENS;
    bucket.lastRefill = now;
  }

  if (bucket.tokens <= 0) {
    return false; // rate limited
  }

  bucket.tokens -= 1;
  return true;
}

// ── ALLOWED MODELS ──
const ALLOWED_MODELS = [
  'claude-sonnet-4-20250514',
  'claude-3-5-sonnet-20241022',
  'claude-3-haiku-20240307',
];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── 1. AUTH CHECK ──
  // Verify the user has a valid Supabase session
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Authentication required. Please log in." });
  }

  const token = authHeader.replace('Bearer ', '');

  // Create a temporary Supabase client with the user's token to verify identity
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
    return res.status(401).json({ error: "Invalid or expired session. Please log in again." });
  }

  // ── 2. RATE LIMIT ──
  if (!checkRateLimit(user.id)) {
    return res.status(429).json({
      error: "Too many requests. Please wait a minute before trying again.",
    });
  }

  // ── 3. INPUT VALIDATION ──
  const { model, max_tokens, messages } = req.body;

  // Only allow known fields
  if (!model || !messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid request: 'model' and 'messages' are required." });
  }

  // Validate model
  if (!ALLOWED_MODELS.includes(model)) {
    return res.status(400).json({
      error: `Invalid model. Allowed: ${ALLOWED_MODELS.join(', ')}`,
    });
  }

  // Cap max_tokens to prevent expensive requests
  const safeMaxTokens = Math.min(Number(max_tokens) || 1000, 1500);

  // Limit messages array length (prevent prompt injection via huge context)
  if (messages.length > 5) {
    return res.status(400).json({ error: "Too many messages. Maximum 5 allowed." });
  }

  // Validate each message has role and content
  for (const msg of messages) {
    if (!msg.role || !msg.content) {
      return res.status(400).json({ error: "Each message must have 'role' and 'content'." });
    }
    if (!['user', 'assistant'].includes(msg.role)) {
      return res.status(400).json({ error: "Message role must be 'user' or 'assistant'." });
    }
  }

  // ── 4. PROXY TO ANTHROPIC ──
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured on the server." });
  }

  // Build a sanitized request body (only allowed fields)
  const sanitizedBody = {
    model,
    max_tokens: safeMaxTokens,
    messages,
  };

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey.trim(),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(sanitizedBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[diagnose] Anthropic API error:", data.error);
      return res.status(response.status).json({
        error: data.error?.message || "Anthropic API error",
        type: data.error?.type || "api_error",
      });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("[diagnose] Proxy error:", error.message);
    res.status(500).json({ error: "Failed to connect to AI service. Please try again." });
  }
}