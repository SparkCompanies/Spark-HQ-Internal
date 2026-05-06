import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { supabase, signInWithMicrosoft, signOut, ensureProfile } from './lib/supabase';
import { installStorageShim } from './lib/storageShim';
import App from './App.jsx';

installStorageShim();

function Root() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const boot = document.getElementById('boot-loader');
    if (boot) boot.style.display = 'none';

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session) ensureProfile(session);
    }).catch(err => {
      console.error('[Auth] session error:', err);
      setAuthError(err.message);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) ensureProfile(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <CenteredCard><Spinner /><div style={muted}>Loading session…</div></CenteredCard>;
  }

  if (!session) {
    return <SignInScreen error={authError} onSignIn={async () => {
      try {
        setAuthError(null);
        await signInWithMicrosoft();
      } catch (e) {
        setAuthError(e.message || String(e));
      }
    }} />;
  }

  return (
    <>
      <SignedInPill session={session} onSignOut={async () => {
        await signOut();
        setSession(null);
      }} />
      <App />
    </>
  );
}

const Spinner = () => (
  <div style={{
    width: 32, height: 32,
    border: '3px solid #f0e8c8',
    borderTopColor: '#C9A84C',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    marginBottom: 12
  }} />
);

const CenteredCard = ({ children }) => (
  <div style={{
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#f7f7f5', flexDirection: 'column', gap: 8
  }}>{children}</div>
);

const muted = { color: '#94a3b8', fontSize: 13 };

const SignInScreen = ({ onSignIn, error }) => (
  <CenteredCard>
    <div style={{
      background: '#fff', border: '1px solid #eee', borderRadius: 14,
      padding: 36, width: 400, textAlign: 'center',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    }}>
      <div style={{
        width: 60, height: 60, borderRadius: 12, background: '#1a1a2e',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px'
      }}>
        <span style={{ color: '#F5C518', fontSize: 28, fontWeight: 800 }}>S</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e', marginBottom: 6 }}>Spark HQ</div>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 28 }}>
        Internal training, intranet, and team directory
      </div>
      <button onClick={onSignIn} style={{
        width: '100%', padding: '14px 18px', background: '#1a1a2e',
        color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer',
        fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: 10
      }}>
        <svg width="18" height="18" viewBox="0 0 23 23" fill="none">
          <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
          <rect x="12" y="1" width="10" height="10" fill="#7FBA00"/>
          <rect x="1" y="12" width="10" height="10" fill="#00A4EF"/>
          <rect x="12" y="12" width="10" height="10" fill="#FFB900"/>
        </svg>
        Sign in with Microsoft
      </button>
      {error && (
        <div style={{
          marginTop: 16, padding: '10px 12px', background: '#fef2f2',
          border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, color: '#991b1b'
        }}>{error}</div>
      )}
      <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 24 }}>
        Use your @sparkcompanies.com or @sparktalentinc.com account.
      </div>
    </div>
  </CenteredCard>
);

const SignedInPill = ({ session, onSignOut }) => {
  const name = session.user.user_metadata?.full_name || session.user.email;
  return (
    <div style={{
      position: 'fixed', top: 16, right: 16, zIndex: 50,
      background: '#fff', border: '1px solid #eee', borderRadius: 10,
      padding: '6px 8px 6px 14px', display: 'flex', alignItems: 'center', gap: 10,
      fontSize: 11, color: '#64748b', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    }}>
      <span style={{ fontWeight: 600, color: '#1a1a2e' }}>{name}</span>
      <button onClick={onSignOut} style={{
        background: 'transparent', border: 'none', color: '#94a3b8',
        cursor: 'pointer', fontSize: 11, padding: '4px 8px', borderRadius: 6
      }}>Sign out</button>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
