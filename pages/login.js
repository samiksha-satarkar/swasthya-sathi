// pages/login.js
// SwasthyaSathi · Phone OTP Login Page
// Step 1: Enter phone number → sends OTP via Supabase
// Step 2: Enter OTP code   → verifies and creates session
// Redirects to /dashboard on success

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../lib/authGuard';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useUser();

  const [step, setStep]           = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone]         = useState('');
  const [otp, setOtp]             = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [countdown, setCountdown] = useState(0);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // ── STEP 1: Send OTP ──
  async function handleSendOTP(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Basic phone validation (Indian numbers)
    const cleaned = phone.replace(/[\s\-()]/g, '');
    if (!/^\+?\d{10,15}$/.test(cleaned)) {
      setError('Please enter a valid phone number (e.g. +91 98765 43210)');
      return;
    }

    // Ensure +91 prefix if not present
    const fullPhone = cleaned.startsWith('+') ? cleaned : `+91${cleaned}`;

    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithOtp({
      phone: fullPhone,
    });
    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    setPhone(fullPhone);
    setStep('otp');
    setCountdown(60);
    setSuccess('OTP भेजा गया! / OTP sent to ' + fullPhone);
  }

  // ── STEP 2: Verify OTP ──
  async function handleVerifyOTP(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Please enter the 6-digit OTP code');
      return;
    }

    setLoading(true);
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      phone: phone,
      token: otp.trim(),
      type: 'sms',
    });
    setLoading(false);

    if (verifyError) {
      setError(verifyError.message);
      return;
    }

    // Success! The onAuthStateChange listener in useUser() will pick this up
    setSuccess('सत्यापित! / Verified! Redirecting...');
    router.replace('/dashboard');
  }

  // ── Resend OTP ──
  async function handleResend() {
    setError('');
    setCountdown(60);
    const { error: resendError } = await supabase.auth.signInWithOtp({
      phone: phone,
    });
    if (resendError) {
      setError(resendError.message);
    } else {
      setSuccess('OTP फिर से भेजा गया / OTP resent!');
    }
  }

  // Show nothing while checking auth state
  if (authLoading) return null;
  if (user) return null; // Will redirect

  return (
    <>
      <Head>
        <title>SwasthyaSathi · Login</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'DM Sans', sans-serif;
          background: linear-gradient(135deg, #0a4d2e 0%, #0d3d20 40%, #1a5c38 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .login-container {
          width: 100%;
          max-width: 420px;
          animation: fadeSlideIn 0.5s ease;
        }

        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ─── LOGO ─── */
        .login-logo {
          text-align: center;
          margin-bottom: 2rem;
        }
        .login-logo .icon {
          font-size: 3rem;
          margin-bottom: 0.5rem;
        }
        .login-logo .title {
          font-family: 'Sora', sans-serif;
          font-size: 1.8rem;
          font-weight: 800;
          color: #2ecc71;
          letter-spacing: -0.02em;
        }
        .login-logo .subtitle {
          color: rgba(255,255,255,0.5);
          font-size: 0.85rem;
          margin-top: 0.3rem;
        }

        /* ─── CARD ─── */
        .login-card {
          background: white;
          border-radius: 24px;
          padding: 2rem 2rem 1.8rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }

        .login-card h2 {
          font-family: 'Sora', sans-serif;
          font-weight: 700;
          font-size: 1.15rem;
          color: #0d1f14;
          margin-bottom: 0.4rem;
        }
        .login-card .hint {
          font-size: 0.82rem;
          color: #5a7366;
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }

        /* ─── FORM ─── */
        .field-group {
          margin-bottom: 1.2rem;
        }
        .field-group label {
          display: block;
          font-size: 0.72rem;
          font-weight: 700;
          color: #5a7366;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 0.4rem;
        }

        .phone-input-row {
          display: flex;
          gap: 0.5rem;
        }
        .phone-prefix {
          width: 72px;
          flex-shrink: 0;
          padding: 0.75rem 0.6rem;
          border: 1.5px solid #c8e6d4;
          border-radius: 12px;
          font-size: 0.92rem;
          font-family: 'DM Sans', sans-serif;
          background: #f0faf4;
          color: #0d1f14;
          text-align: center;
          font-weight: 600;
          outline: none;
        }
        .phone-input-row input {
          flex: 1;
        }

        input[type="text"],
        input[type="tel"],
        input[type="number"] {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1.5px solid #c8e6d4;
          border-radius: 12px;
          font-size: 0.92rem;
          font-family: 'DM Sans', sans-serif;
          background: #f0faf4;
          color: #0d1f14;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
        }
        input:focus {
          border-color: #1a7a4a;
          background: white;
        }

        /* OTP input styling */
        .otp-input {
          letter-spacing: 0.5em;
          text-align: center;
          font-size: 1.5rem;
          font-weight: 700;
          font-family: 'Sora', sans-serif;
        }

        /* ─── BUTTONS ─── */
        .btn-primary {
          width: 100%;
          padding: 0.85rem;
          border-radius: 14px;
          background: #1a7a4a;
          color: white;
          border: none;
          font-weight: 700;
          font-size: 0.95rem;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .btn-primary:hover:not(:disabled) {
          background: #0a4d2e;
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(26,122,74,0.3);
        }
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-link {
          background: none;
          border: none;
          color: #1a7a4a;
          font-weight: 600;
          font-size: 0.82rem;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          padding: 0;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .btn-link:hover {
          color: #0a4d2e;
        }
        .btn-link:disabled {
          color: #aaa;
          cursor: not-allowed;
          text-decoration: none;
        }

        .btn-back {
          background: none;
          border: 1.5px solid #c8e6d4;
          color: #5a7366;
          font-weight: 600;
          font-size: 0.85rem;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          padding: 0.65rem 1.2rem;
          border-radius: 12px;
          transition: all 0.2s;
        }
        .btn-back:hover {
          border-color: #1a7a4a;
          color: #1a7a4a;
        }

        /* ─── MESSAGES ─── */
        .msg-error {
          background: #FCEBEB;
          color: #791F1F;
          border-radius: 10px;
          padding: 0.6rem 0.9rem;
          font-size: 0.82rem;
          margin-bottom: 1rem;
          line-height: 1.5;
        }
        .msg-success {
          background: #d4f5e2;
          color: #0a4d2e;
          border-radius: 10px;
          padding: 0.6rem 0.9rem;
          font-size: 0.82rem;
          margin-bottom: 1rem;
          line-height: 1.5;
        }

        /* ─── STEP INDICATOR ─── */
        .steps {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-bottom: 1.5rem;
        }
        .step-dot {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.72rem;
          font-weight: 700;
          border: 2px solid #c8e6d4;
          color: #5a7366;
          transition: all 0.3s;
        }
        .step-dot.active {
          background: #1a7a4a;
          border-color: #1a7a4a;
          color: white;
        }
        .step-dot.done {
          background: #2ecc71;
          border-color: #2ecc71;
          color: white;
        }
        .step-line {
          flex: 1;
          height: 2px;
          background: #c8e6d4;
          transition: background 0.3s;
        }
        .step-line.done {
          background: #2ecc71;
        }

        /* ─── MISC ─── */
        .resend-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 1rem;
          font-size: 0.8rem;
          color: #5a7366;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .footer-text {
          text-align: center;
          margin-top: 1.5rem;
          font-size: 0.75rem;
          color: rgba(255,255,255,0.4);
          line-height: 1.6;
        }
      `}</style>

      <div className="login-container">
        {/* Logo */}
        <div className="login-logo">
          <div className="icon">🌿</div>
          <div className="title">SwasthyaSathi</div>
          <div className="subtitle">ASHA Worker Health Platform</div>
        </div>

        {/* Login Card */}
        <div className="login-card">
          {/* Step indicator */}
          <div className="steps">
            <div className={`step-dot ${step === 'phone' ? 'active' : 'done'}`}>
              {step === 'otp' ? '✓' : '1'}
            </div>
            <div className={`step-line ${step === 'otp' ? 'done' : ''}`} />
            <div className={`step-dot ${step === 'otp' ? 'active' : ''}`}>2</div>
          </div>

          {/* ── STEP 1: Phone Number ── */}
          {step === 'phone' && (
            <>
              <h2>📱 फ़ोन नंबर दर्ज करें</h2>
              <p className="hint">
                अपना फ़ोन नंबर दर्ज करें। हम आपको एक OTP भेजेंगे।
                <br />
                Enter your phone number. We'll send you an OTP.
              </p>

              {error && <div className="msg-error">⚠️ {error}</div>}
              {success && <div className="msg-success">✅ {success}</div>}

              <form onSubmit={handleSendOTP}>
                <div className="field-group">
                  <label>Phone Number / फ़ोन नंबर</label>
                  <div className="phone-input-row">
                    <div className="phone-prefix">+91</div>
                    <input
                      type="tel"
                      id="phone-input"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="98765 43210"
                      maxLength={15}
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  id="send-otp-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <><span className="spinner" /> OTP भेज रहे हैं...</>
                  ) : (
                    '📩 OTP भेजें / Send OTP'
                  )}
                </button>
              </form>
            </>
          )}

          {/* ── STEP 2: OTP Verification ── */}
          {step === 'otp' && (
            <>
              <h2>🔐 OTP दर्ज करें</h2>
              <p className="hint">
                {phone} पर भेजा गया 6-अंकों का कोड दर्ज करें।
                <br />
                Enter the 6-digit code sent to {phone}.
              </p>

              {error && <div className="msg-error">⚠️ {error}</div>}
              {success && <div className="msg-success">✅ {success}</div>}

              <form onSubmit={handleVerifyOTP}>
                <div className="field-group">
                  <label>OTP Code</label>
                  <input
                    type="text"
                    id="otp-input"
                    className="otp-input"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="● ● ● ● ● ●"
                    maxLength={6}
                    autoFocus
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  id="verify-otp-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <><span className="spinner" /> सत्यापित कर रहे हैं...</>
                  ) : (
                    '✅ सत्यापित करें / Verify'
                  )}
                </button>
              </form>

              <div className="resend-row">
                <button
                  className="btn-back"
                  onClick={() => { setStep('phone'); setOtp(''); setError(''); setSuccess(''); }}
                >
                  ← नंबर बदलें
                </button>
                <button
                  className="btn-link"
                  onClick={handleResend}
                  disabled={countdown > 0}
                >
                  {countdown > 0 ? `Resend in ${countdown}s` : '🔄 OTP फिर भेजें'}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="footer-text">
          SwasthyaSathi · ASHA Health Worker Platform
          <br />
          Your data is encrypted and secure 🔒
        </div>
      </div>
    </>
  );
}
