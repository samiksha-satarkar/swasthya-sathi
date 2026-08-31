// pages/index.js
// SwasthyaSathi · Landing page
// Redirects to /dashboard if logged in, or /login if not.

import { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useUser } from '../lib/authGuard';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useUser();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [user, loading, router]);

  return (
    <>
      <Head>
        <title>SwasthyaSathi</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a4d2e, #1a5c38)',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🌿</div>
          <div style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: '1.5rem',
            fontWeight: 800,
            color: '#2ecc71',
          }}>
            SwasthyaSathi
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            Loading...
          </div>
        </div>
      </div>
    </>
  );
}