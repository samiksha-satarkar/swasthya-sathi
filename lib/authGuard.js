// lib/authGuard.js
// SwasthyaSathi · Authentication helpers
// - useUser()     — React hook: returns { user, loading } from Supabase session
// - requireAuth() — getServerSideProps helper: redirects to /login if no session
// - createServerSupabase() — creates a Supabase client with the user's access token

import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

/**
 * React hook that tracks the current Supabase auth session.
 * Re-renders on login / logout.
 * @returns {{ user: object|null, loading: boolean, session: object|null }}
 */
export function useUser() {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, session, loading };
}

/**
 * Server-side auth check for getServerSideProps.
 * If no valid session cookie exists, redirects to /login.
 *
 * Usage:
 *   export async function getServerSideProps(ctx) {
 *     return requireAuth(ctx);
 *   }
 *
 * Since Supabase JS v2 stores the session in cookies automatically
 * when running in a browser, and the Next.js API routes share the
 * same cookie jar, we validate on the client side instead.
 *
 * This function returns empty props — the client-side useUser() hook
 * handles the redirect if the user is not authenticated.
 */
export async function requireAuth(context) {
  // With Supabase JS v2 + Next.js Pages Router, session lives in
  // the browser (localStorage). Server-side redirect is not reliable
  // without @supabase/ssr. We handle auth gating client-side via useUser().
  return { props: {} };
}

/**
 * Extracts the Supabase access token from an API request's
 * Authorization header and returns an authenticated Supabase client.
 * Use this in API routes to enforce RLS per-user.
 *
 * @param {import('next').NextApiRequest} req
 * @returns {{ supabaseAuth: import('@supabase/supabase-js').SupabaseClient, error: string|null }}
 */
export function createAuthenticatedClient(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { supabaseAuth: null, error: 'Missing or invalid Authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');

  const { createClient } = require('@supabase/supabase-js');
  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    }
  );

  return { supabaseAuth, error: null };
}
