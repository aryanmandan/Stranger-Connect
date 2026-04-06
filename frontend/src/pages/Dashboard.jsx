import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { connectSocket, disconnectSocket } from '../services/socket';

function SpinningGlobe() {
  return (
    <div className="relative w-48 h-48 mx-auto">
      <div className="absolute inset-0 rounded-full bg-cyan-500/10 blur-2xl scale-150 animate-pulse" />
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full animate-spin-slow drop-shadow-2xl">
        <defs>
          <radialGradient id="dGlobe" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#0d2137" />
            <stop offset="100%" stopColor="#020d18" />
          </radialGradient>
          <clipPath id="dClip"><circle cx="100" cy="100" r="85" /></clipPath>
        </defs>
        <circle cx="100" cy="100" r="85" fill="url(#dGlobe)" stroke="#00f5ff" strokeWidth="0.5" strokeOpacity="0.5" />
        <g clipPath="url(#dClip)" stroke="#00f5ff" strokeWidth="0.4" fill="none" opacity="0.3">
          {[-60,-30,0,30,60].map(lat => {
            const y = 100 + (lat/90)*85;
            const rx = Math.cos((lat*Math.PI)/180)*85;
            return <ellipse key={lat} cx="100" cy={y} rx={rx} ry={rx*0.18} />;
          })}
          {[0,45,90,135].map(lng => (
            <ellipse key={lng} cx="100" cy="100" rx={85*Math.abs(Math.cos((lng*Math.PI)/180))+1} ry="85"
              transform={`rotate(${lng},100,100)`} />
          ))}
        </g>
        <g clipPath="url(#dClip)" fill="#00f5ff" fillOpacity="0.2">
          <ellipse cx="78" cy="85" rx="22" ry="16" />
          <ellipse cx="120" cy="78" rx="18" ry="13" />
          <ellipse cx="130" cy="115" rx="14" ry="10" />
          <ellipse cx="68" cy="118" rx="16" ry="11" />
        </g>
        <g clipPath="url(#dClip)" fill="#00f5ff">
          {[[76,83],[122,76],[131,117],[66,120],[100,60]].map(([cx,cy],i) => (
            <circle key={i} cx={cx} cy={cy} r="2.5" opacity="0.8" />
          ))}
        </g>
        <circle cx="100" cy="100" r="88" fill="none" stroke="#00f5ff" strokeWidth="0.3" opacity="0.2" />
      </svg>
    </div>
  );
}

const STATUS = {
  IDLE: 'idle',
  SEARCHING: 'searching',
};

const TIP_CARDS = [
  { icon: '🎭', title: 'Be yourself', text: 'Authenticity attracts better conversations than any filter.' },
  { icon: '⏭️', title: 'Skip anytime', text: 'Use Next if you want someone new — no pressure.' },
  { icon: '🔇', title: 'Mute when noisy', text: 'Cut background noise so your match hears you clearly.' },
  { icon: '🛡️', title: 'Stay safe', text: 'Never share passwords, addresses, or financial details.' },
];

function TipsCarousel() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % TIP_CARDS.length);
    }, 4500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="relative h-40 overflow-hidden rounded-2xl">
      {TIP_CARDS.map((card, i) => (
        <div
          key={card.title}
          className={`absolute inset-0 flex flex-col justify-center px-5 py-4 transition-all duration-500 ease-out ${
            i === idx ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 translate-x-4 z-0 pointer-events-none'
          }`}
        >
          <span className="text-3xl mb-2">{card.icon}</span>
          <h4 className="font-display font-semibold text-slate-900 dark:text-white text-sm mb-1">{card.title}</h4>
          <p className="text-xs text-slate-600 dark:text-gray-500 font-body leading-relaxed">{card.text}</p>
        </div>
      ))}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-20">
        {TIP_CARDS.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? 'w-6 bg-cyan-500' : 'w-1.5 bg-slate-300 dark:bg-gray-600'}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { toggle, isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const socketRef = useRef(null);
  const profileMenuRef = useRef(null);
  const [status, setStatus] = useState(STATUS.IDLE);
  const [onlineCount, setOnlineCount] = useState(0);
  const [dots, setDots] = useState('');
  const [matchModal, setMatchModal] = useState(null);
  const [matchPhase, setMatchPhase] = useState('prompt');
  const [peerSignal, setPeerSignal] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/'); return; }

    let cancelled = false;
    let socket = null;

    // These handlers are defined at this scope so cleanup can reference them
    let onMatched, onMatchWaiting, onPeerMatchStatus, onMatchTimeout, onMatchProceed, onMatchDeclined, onOnlineCount;

    const initDashboard = async () => {
      // First check local cache
      let profile = JSON.parse(localStorage.getItem('sc_profile') || '{}');

      // If no local profile, try fetching from DB (handles race with hydrateProfile)
      if (!profile.gender && user.uid) {
        try {
          const { api: apiService } = await import('../services/api');
          const data = await apiService.getMe(user.uid);
          if (data?.user) {
            const p = data.user;
            profile = {
              age: p.age,
              gender: p.gender,
              preference: p.preference,
              location: p.location || '',
              profilePic: p.profilePic || '',
            };
            localStorage.setItem('sc_profile', JSON.stringify(profile));
          }
        } catch {
          /* new user — no profile in DB */
        }
      }

      if (cancelled) return;
      if (!profile.gender) { navigate('/profile'); return; }

      socket = connectSocket();
      socketRef.current = socket;

      onMatched = (payload) => {
        setStatus(STATUS.IDLE);
        setMatchPhase('prompt');
        setPeerSignal(null);
        setMatchModal(payload);
      };

      onMatchWaiting = () => {
        setMatchPhase('waiting');
      };

      onPeerMatchStatus = ({ kind }) => {
        if (kind === 'peerAccepted') setPeerSignal('green');
        if (kind === 'peerDeclined') setPeerSignal('red');
      };

      onMatchTimeout = () => {
        setMatchModal(null);
        setMatchPhase('prompt');
        setPeerSignal(null);
        setStatus(STATUS.IDLE);
      };

      onMatchProceed = (data) => {
        setMatchModal(null);
        setMatchPhase('prompt');
        setPeerSignal(null);
        navigate(`/chat/${data.roomId}`, {
          state: {
            isOfferer: data.isOfferer,
            peerId: data.peerId,
            peerProfile: data.peerProfile || {},
          },
        });
      };

      onMatchDeclined = () => {
        window.setTimeout(() => {
          setMatchModal(null);
          setMatchPhase('prompt');
          setPeerSignal(null);
          setStatus(STATUS.SEARCHING);
          const profile = JSON.parse(localStorage.getItem('sc_profile') || '{}');
          if (socketRef.current) {
            socketRef.current.emit('joinQueue', {
              userId: user.uid,
              gender: profile.gender || 'other',
              preference: profile.preference || ['male', 'female', 'other'],
              profile: {
                name: user.name,
                age: profile.age,
                gender: profile.gender,
                location: profile.location || '',
                profilePic: user.profilePic || profile.profilePic || '',
              },
            });
          }
        }, 650);
      };

      onOnlineCount = (n) => {
        if (typeof n === 'number' && !Number.isNaN(n)) setOnlineCount(n);
      };

      socket.on('matched', onMatched);
      socket.on('matchWaiting', onMatchWaiting);
      socket.on('peerMatchStatus', onPeerMatchStatus);
      socket.on('matchTimeout', onMatchTimeout);
      socket.on('matchProceed', onMatchProceed);
      socket.on('matchDeclined', onMatchDeclined);
      socket.on('waitingForMatch', () => setStatus(STATUS.SEARCHING));
      socket.on('onlineCount', onOnlineCount);
    };

    initDashboard();

    return () => {
      cancelled = true;
      if (socket) {
        socket.off('matched', onMatched);
        socket.off('matchWaiting', onMatchWaiting);
        socket.off('peerMatchStatus', onPeerMatchStatus);
        socket.off('matchTimeout', onMatchTimeout);
        socket.off('matchProceed', onMatchProceed);
        socket.off('matchDeclined', onMatchDeclined);
        socket.off('waitingForMatch');
        socket.off('onlineCount', onOnlineCount);
      }
    };
  }, [user, navigate]);

  useEffect(() => {
    if (location.state?.autoSearch && status === STATUS.IDLE && socketRef.current) {
      setTimeout(() => {
        if (socketRef.current) handleFind();
      }, 50);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, status]);


  useEffect(() => {
    if (!matchModal?.expiresAt) return;
    const tick = () => {
      setSecondsLeft(Math.max(0, Math.ceil((matchModal.expiresAt - Date.now()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [matchModal]);

  useEffect(() => {
    const handler = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (status !== STATUS.SEARCHING) return;
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 500);
    return () => clearInterval(interval);
  }, [status]);

  const savedProfile = JSON.parse(localStorage.getItem('sc_profile') || '{}');
  const avatarSrc =
    user?.profilePic ||
    savedProfile.profilePic ||
    (user?.uid ? `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}` : '');

  const handleFind = () => {
    if (!socketRef.current) return;
    setStatus(STATUS.SEARCHING);
    const profile = JSON.parse(localStorage.getItem('sc_profile') || '{}');
    socketRef.current.emit('joinQueue', {
      userId: user.uid,
      gender: profile.gender || 'other',
      preference: profile.preference || ['male', 'female', 'other'],
      profile: {
        name: user.name,
        age: profile.age,
        gender: profile.gender,
        location: profile.location || '',
        profilePic: user.profilePic || profile.profilePic || '',
      },
    });
  };

  const handleCancel = () => {
    socketRef.current?.emit('leaveQueue');
    setStatus(STATUS.IDLE);
  };

  const handleAcceptMatch = () => {
    if (!matchModal?.roomId) return;
    socketRef.current?.emit('acceptMatch', { roomId: matchModal.roomId });
  };

  const handleDeclineMatch = () => {
    if (!matchModal?.roomId) return;
    socketRef.current?.emit('declineMatch', { roomId: matchModal.roomId });
    setMatchModal(null);
    setMatchPhase('prompt');
    setPeerSignal(null);
    handleFind();
  };

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate('/');
  };

  const genderEmoji = { male: '👨', female: '👩', other: '🧑' };
  const peer = matchModal?.peerProfile || {};

  return (
    <div className="min-h-screen bg-mesh flex flex-col relative">
      {matchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div
            className={`w-full max-w-md glass-dark p-8 rounded-2xl shadow-2xl transition-colors duration-300 border-2 ${
              peerSignal === 'green'
                ? 'border-emerald-500/80 ring-2 ring-emerald-500/30'
                : peerSignal === 'red'
                  ? 'border-rose-500/80 ring-2 ring-rose-500/30'
                  : 'border-cyan-500/20'
            }`}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white text-center">Match found</h2>
              {peerSignal === 'green' && (
                <span className="flex items-center gap-1 text-emerald-500 text-xs font-body font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Ready
                </span>
              )}
              {peerSignal === 'red' && (
                <span className="flex items-center gap-1 text-rose-400 text-xs font-body font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/40">
                  Declined
                </span>
              )}
            </div>
            <p className="text-slate-600 dark:text-gray-500 text-sm font-body text-center mb-1">
              {matchPhase === 'waiting'
                ? 'Waiting for the other person to accept or skip…'
                : 'Review before starting video'}
            </p>
            <p className="text-center text-amber-600 dark:text-amber-400/90 text-xs font-body mb-6 tabular-nums">
              Auto-skip in {secondsLeft}s
            </p>

            <div className="flex flex-col items-center gap-4 mb-8">
              {peer.profilePic ? (
                <img
                  src={peer.profilePic}
                  alt=""
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-cyan-500/40"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center text-4xl">
                  {genderEmoji[peer.gender] || '👤'}
                </div>
              )}
              <div className="text-center">
                <div className="font-display font-semibold text-slate-900 dark:text-white text-lg">{peer.name || 'Stranger'}</div>
                <div className="text-slate-600 dark:text-gray-400 text-sm font-body mt-1">
                  {[peer.age, peer.gender, peer.location].filter(Boolean).join(' · ') || 'No details'}
                </div>
              </div>
            </div>

            {matchPhase === 'waiting' ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="relative w-14 h-14">
                  <div className="absolute inset-0 rounded-full border-2 border-cyan-500/40 border-t-cyan-400 animate-spin" />
                </div>
                <p className="text-slate-600 dark:text-gray-400 text-sm font-body text-center">Hang tight — connecting as soon as they respond.</p>
              </div>
            ) : (
              <div className="flex gap-3">
                <button type="button" onClick={handleDeclineMatch} className="btn-secondary flex-1 py-3">
                  Skip
                </button>
                <button type="button" onClick={handleAcceptMatch} className="btn-primary flex-1 py-3">
                  Accept &amp; connect
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-gray-800/60">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-cyan-400" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          </div>
          <span className="font-display font-bold text-slate-900 dark:text-white">Stranger<span className="text-cyan-400">Connect</span></span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-green-400 text-xs font-body">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 status-dot" />
            <span className="tabular-nums">{onlineCount.toLocaleString()} online</span>
          </div>

          <button
            type="button"
            onClick={toggle}
            className="w-9 h-9 rounded-lg bg-slate-200/80 dark:bg-gray-800/60 border border-slate-300 dark:border-gray-700 flex items-center justify-center hover:border-cyan-500/50 transition-colors"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-yellow-400" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-slate-700" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>

          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((o) => !o)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-200/80 dark:bg-gray-800/60 border border-slate-300 dark:border-gray-700 hover:border-cyan-500/40 transition-colors max-w-[200px]"
            >
              <img src={avatarSrc} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
              <span className="text-sm text-slate-800 dark:text-gray-300 font-body truncate hidden sm:inline">{user?.name}</span>
              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 glass-dark p-4 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xl z-50 text-left">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-200 dark:border-gray-800">
                  <img src={avatarSrc} alt="" className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-gray-700" />
                  <div className="min-w-0">
                    <div className="font-body font-semibold text-slate-900 dark:text-white truncate">{user?.name}</div>
                    <div className="text-xs text-slate-500 dark:text-gray-500 truncate">{user?.email}</div>
                  </div>
                </div>
                <div className="space-y-2 text-sm font-body text-slate-700 dark:text-gray-300">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500 dark:text-gray-500">Age</span>
                    <span>{savedProfile.age ?? '—'}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500 dark:text-gray-500">Location</span>
                    <span className="text-right truncate">{savedProfile.location || '—'}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500 dark:text-gray-500">Gender</span>
                    <span>{genderEmoji[savedProfile.gender]} {savedProfile.gender || '—'}</span>
                  </div>
                  <div className="flex justify-between gap-2 items-start">
                    <span className="text-slate-500 dark:text-gray-500 flex-shrink-0">Looking for</span>
                    <span className="text-right">{(savedProfile.preference || []).join(', ') || '—'}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setProfileOpen(false); navigate('/profile'); }}
                  className="btn-secondary w-full mt-4 text-sm py-2"
                >
                  Edit Profile
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="w-9 h-9 rounded-lg bg-slate-200/80 dark:bg-gray-800/60 border border-slate-300 dark:border-gray-700 flex items-center justify-center hover:border-rose-500/50 hover:text-rose-500 dark:hover:text-rose-400 text-slate-500 transition-colors"
            title="Logout"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col lg:flex-row lg:items-stretch lg:justify-between gap-8 lg:gap-12 px-6 py-10 w-full max-w-7xl mx-auto">
        {/* Center: globe + CTA */}
        <div className="flex-1 flex flex-col items-center justify-center text-center min-w-0">
          <SpinningGlobe />

          <div className="mt-8">
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 dark:text-white mb-2">
              {status === STATUS.IDLE && 'Ready to Connect?'}
              {status === STATUS.SEARCHING && <span>Searching<span className="text-cyan-400">{dots}</span></span>}
            </h1>
            <p className="text-slate-600 dark:text-gray-500 font-body max-w-md mx-auto">
              {status === STATUS.IDLE && 'Click below to be matched with a random stranger'}
              {status === STATUS.SEARCHING && 'Looking for the perfect match for you...'}
            </p>
          </div>

          {status === STATUS.IDLE && (
            <button
              onClick={handleFind}
              className="btn-primary text-lg px-12 py-4 animate-pulse-glow mt-8"
            >
              🌍 Find Someone
            </button>
          )}

          {status === STATUS.SEARCHING && (
            <div className="flex flex-col items-center gap-4 mt-8">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border border-cyan-500/30 animate-ping" />
                <div className="absolute inset-2 rounded-full border border-cyan-500/40 animate-ping" style={{ animationDelay: '0.3s' }} />
                <div className="absolute inset-4 rounded-full border border-cyan-500/50 animate-ping" style={{ animationDelay: '0.6s' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-cyan-500 animate-pulse" />
                </div>
              </div>
              <button onClick={handleCancel} className="btn-danger px-8 py-2.5 text-sm">
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Right: quick tips only */}
        <aside className="w-full lg:w-80 flex-shrink-0 flex flex-col justify-center lg:max-w-sm lg:ml-auto">
          <div className="glass-dark p-4">
            <h3 className="font-display font-semibold text-slate-900 dark:text-white mb-3 text-sm px-1">Quick Tips</h3>
            <TipsCarousel />
          </div>
        </aside>
      </main>
    </div>
  );
}
