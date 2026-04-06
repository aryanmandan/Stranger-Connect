import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { connectSocket, getSocket } from '../services/socket';

function Globe() {
  return (
    <div className="relative w-72 h-72 mx-auto animate-float">
      <div className="absolute inset-0 rounded-full bg-cyan-500/10 blur-3xl scale-150" />
      
      <svg viewBox="0 0 280 280" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-2xl">
        <defs>
          <radialGradient id="globeGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#0e2a3a" />
            <stop offset="60%" stopColor="#061b2e" />
            <stop offset="100%" stopColor="#020d18" />
          </radialGradient>
          <radialGradient id="shineGrad" cx="30%" cy="25%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <clipPath id="globeClip">
            <circle cx="140" cy="140" r="120" />
          </clipPath>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        
        <circle cx="140" cy="140" r="120" fill="url(#globeGrad)" stroke="#00f5ff" strokeWidth="0.5" strokeOpacity="0.4" />
        
        <g clipPath="url(#globeClip)" opacity="0.25">
          {[-80,-60,-40,-20,0,20,40,60,80].map(lat => {
            const y = 140 + (lat / 90) * 120;
            const r = Math.cos((lat * Math.PI) / 180) * 120;
            return <ellipse key={lat} cx="140" cy={y} rx={r} ry={r * 0.2} fill="none" stroke="#00f5ff" strokeWidth="0.5" />;
          })}
          {[0, 30, 60, 90, 120, 150].map(lng => (
            <ellipse key={lng} cx="140" cy="140" rx={120 * Math.abs(Math.cos((lng*Math.PI)/180))} ry="120"
              fill="none" stroke="#00f5ff" strokeWidth="0.5"
              transform={`rotate(${lng}, 140, 140)`} />
          ))}
        </g>

        <g clipPath="url(#globeClip)" opacity="0.5" fill="#00f5ff" fillOpacity="0.15">
          <ellipse cx="110" cy="120" rx="30" ry="22" />
          <ellipse cx="165" cy="110" rx="25" ry="18" />
          <ellipse cx="180" cy="155" rx="18" ry="14" />
          <ellipse cx="95" cy="160" rx="22" ry="16" />
        </g>

        {[
          {cx: 108, cy: 118}, {cx: 165, cy: 108}, {cx: 183, cy: 158},
          {cx: 94, cy: 162}, {cx: 148, cy: 172}, {cx: 125, cy: 95},
        ].map((dot, i) => (
          <g key={i} clipPath="url(#globeClip)">
            <circle cx={dot.cx} cy={dot.cy} r="3" fill="#00f5ff" filter="url(#glow)" opacity="0.9" />
            <circle cx={dot.cx} cy={dot.cy} r="6" fill="none" stroke="#00f5ff" strokeWidth="0.5" opacity="0.5">
              <animate attributeName="r" values="4;10;4" dur={`${2 + i * 0.5}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0;0.6" dur={`${2 + i * 0.5}s`} repeatCount="indefinite" />
            </circle>
          </g>
        ))}

        <g clipPath="url(#globeClip)" stroke="#00f5ff" strokeWidth="0.4" opacity="0.3">
          <line x1="108" y1="118" x2="165" y2="108"><animate attributeName="opacity" values="0;0.5;0" dur="3s" repeatCount="indefinite" /></line>
          <line x1="165" y1="108" x2="183" y2="158"><animate attributeName="opacity" values="0;0.5;0" dur="3.5s" repeatCount="indefinite" /></line>
          <line x1="94" y1="162" x2="148" y2="172"><animate attributeName="opacity" values="0;0.5;0" dur="4s" repeatCount="indefinite" /></line>
          <line x1="108" y1="118" x2="94" y2="162"><animate attributeName="opacity" values="0;0.5;0" dur="2.5s" repeatCount="indefinite" /></line>
        </g>

        <circle cx="140" cy="140" r="120" fill="url(#shineGrad)" />
        <circle cx="140" cy="140" r="124" fill="none" stroke="#00f5ff" strokeWidth="0.5" opacity="0.3" />
        <circle cx="140" cy="140" r="130" fill="none" stroke="#00f5ff" strokeWidth="0.3" opacity="0.15">
          <animate attributeName="r" values="128;134;128" dur="4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.2;0.05;0.2" dur="4s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}

function Particles() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 5,
    dur: 3 + Math.random() * 4,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full bg-cyan-400/20"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            animation: `float ${p.dur}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export default function Home() {
  const { user, signInWithGoogle, demoLogin, firebaseConfigured } = useAuth();
  const { toggle, isDark } = useTheme();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  useEffect(() => {
    connectSocket();
    const socket = getSocket();
    const onCount = (n) => {
      if (typeof n === 'number' && !Number.isNaN(n)) setOnlineCount(n);
    };
    socket.on('onlineCount', onCount);
    return () => socket.off('onlineCount', onCount);
  }, []);

  const handleGoogle = async () => {
    setAuthError('');
    setIsLoading(true);
    try {
      await signInWithGoogle();
      navigate('/profile');
    } catch (e) {
      setAuthError(e.message || 'Google sign-in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    if (!name.trim()) return;
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 400));
    demoLogin(name.trim());
    navigate('/profile');
    setIsLoading(false);
  };

  const stats = [
    { label: 'Active Users', value: '12.4K' },
    { label: 'Connections Today', value: '48K' },
    { label: 'Countries', value: '190+' },
  ];

  return (
    <div className="min-h-screen bg-mesh noise-overlay relative overflow-hidden">
      <Particles />

      <nav className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-cyan-400" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          </div>
          <span className="font-display font-bold text-lg text-slate-900 dark:text-white tracking-tight">
            Stranger<span className="text-cyan-400">Connect</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggle}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-9 h-9 rounded-lg bg-slate-200/80 dark:bg-gray-800/60 border border-slate-300 dark:border-gray-700 flex items-center justify-center hover:border-cyan-500/50 transition-colors"
          >
            {isDark ? (
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-yellow-400" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-slate-700" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
        </div>
      </nav>

      <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 text-center">
        <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-600 dark:text-cyan-400 text-sm font-body">
          <span className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400 status-dot" />
          <span>{onlineCount.toLocaleString()} people online now</span>
        </div>

        <h1 className="font-display font-extrabold text-5xl md:text-7xl text-slate-900 dark:text-white leading-none mb-4 tracking-tight">
          Meet the
          <span className="block neon-text">World</span>
        </h1>

        <p className="max-w-md text-slate-600 dark:text-gray-400 font-body text-lg mb-10 leading-relaxed">
          Real conversations with real strangers. Video chat, text, connect — skip whenever you want.
        </p>

        <Globe />

        <div className="mt-10 flex flex-col items-center gap-4 max-w-sm w-full">
          {firebaseConfigured ? (
            <>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-8 py-3.5 rounded-xl bg-white text-gray-900 font-body font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {isLoading ? 'Signing in…' : 'Continue with Google'}
              </button>
              <p className="text-gray-600 text-xs font-body">Secure sign-in with your Google account</p>
            </>
          ) : null}

          {!firebaseConfigured && (
            <p className="text-amber-400/90 text-sm font-body text-center px-4">
              Add <code className="text-amber-300">VITE_FIREBASE_*</code> keys in <code className="text-amber-300">frontend/.env</code> to enable Google sign-in.
            </p>
          )}

          {firebaseConfigured && (
            <div className="w-full flex items-center gap-3 text-gray-600 text-xs font-body">
              <span className="flex-1 h-px bg-gray-800" />
              or local demo
              <span className="flex-1 h-px bg-gray-800" />
            </div>
          )}

          {!showNameInput ? (
            <button
              type="button"
              onClick={() => setShowNameInput(true)}
              className="btn-primary text-base px-8 py-4 animate-pulse-glow"
            >
              {firebaseConfigured ? 'Use as Guest' : 'Get Started — It\'s Free'}
            </button>
          ) : (
            <div className="flex flex-col items-center gap-3 animate-fade-in w-full">
              <input
                autoFocus
                type="text"
                placeholder="What's your name?"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleDemoLogin()}
                className="input-field max-w-xs text-center text-lg"
                maxLength={30}
              />
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={!name.trim() || isLoading}
                className="btn-primary px-10 py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Entering…' : 'Enter as guest →'}
              </button>
            </div>
          )}

          {authError && (
            <p className="text-rose-400 text-sm font-body">{authError}</p>
          )}
        </div>

        <div className="mt-16 flex gap-8 md:gap-16 text-center">
          {stats.map(s => (
            <div key={s.label}>
              <div className="font-display font-bold text-2xl text-slate-900 dark:text-white">{s.value}</div>
              <div className="text-xs text-slate-500 dark:text-gray-500 font-body mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </main>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-100 dark:from-gray-950 to-transparent pointer-events-none" />
    </div>
  );
}
