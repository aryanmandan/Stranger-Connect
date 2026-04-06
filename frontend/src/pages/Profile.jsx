import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male', emoji: '👨' },
  { value: 'female', label: 'Female', emoji: '👩' },
  { value: 'other', label: 'Other', emoji: '🧑' },
];

const PREF_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export default function Profile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    age: '',
    gender: '',
    preference: ['male', 'female', 'other'],
    location: '',
    profilePic: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0); // 0=gender, 1=details, 2=prefs

  const [deviceCameraOpen, setDeviceCameraOpen] = useState(false);
  const videoRef = useRef(null);

  const startCamera = async () => {
    setError('');
    setDeviceCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setError('Camera access denied or not available.');
      setDeviceCameraOpen(false);
    }
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, -canvas.width, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setForm((f) => ({ ...f, profilePic: dataUrl }));
    closeCamera();
  };

  const closeCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
    }
    setDeviceCameraOpen(false);
  };

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    const saved = localStorage.getItem('sc_profile');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        setForm((f) => ({
          ...f,
          ...p,
          profilePic: p.profilePic || user.profilePic || '',
        }));
      } catch {
        /* ignore */
      }
    } else if (user.profilePic) {
      setForm((f) => ({ ...f, profilePic: user.profilePic }));
    }
  }, [user, navigate]);

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 600 * 1024) {
      setError('Please choose an image under 600KB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl === 'string' && dataUrl.length < 900000) {
        setForm((f) => ({ ...f, profilePic: dataUrl }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const togglePref = (val) => {
    setForm(f => ({
      ...f,
      preference: f.preference.includes(val)
        ? f.preference.filter(p => p !== val)
        : [...f.preference, val],
    }));
  };

  const handleSave = async () => {
    if (!form.gender) { setError('Please select your gender'); return; }
    if (!form.age || form.age < 13 || form.age > 100) { setError('Please enter a valid age (13–100)'); return; }
    if (form.preference.length === 0) { setError('Please select at least one preference'); return; }

    setSaving(true);
    setError('');

    const profilePic = form.profilePic || user.profilePic || '';
    const profileData = {
      uid: user.uid,
      name: user.name,
      email: user.email,
      profilePic,
      age: parseInt(form.age, 10),
      gender: form.gender,
      preference: form.preference,
      location: form.location || '',
    };

    try {
      await api.saveProfile(profileData);
    } catch (e) {
      console.warn('Could not save to backend:', e.message);
    }

    updateUser({ profilePic });
    const stored = { ...form, profilePic, age: parseInt(form.age, 10) };
    localStorage.setItem('sc_profile', JSON.stringify(stored));
    navigate('/dashboard');
    setSaving(false);
  };

  const steps = [
    { title: 'Who are you?', subtitle: 'Select your gender' },
    { title: 'About you', subtitle: 'A little more info' },
    { title: 'Preferences', subtitle: "Who'd you like to meet?" },
  ];

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center px-4">
      {/* Glow backdrop */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-cyan-400" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </div>
            <span className="font-display font-bold text-white">Stranger<span className="text-cyan-400">Connect</span></span>
          </div>
          <h1 className="font-display font-bold text-3xl text-white">Set up your profile</h1>
          <p className="text-gray-500 font-body mt-2">This helps us find better matches for you</p>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-gray-800">
              <div
                className="h-full bg-cyan-500 transition-all duration-500"
                style={{ width: i <= step ? '100%' : '0%' }}
              />
            </div>
          ))}
        </div>

        <div className="glass-dark p-8 shadow-xl shadow-black/30">
          <h2 className="font-display font-semibold text-xl text-white mb-1">{steps[step].title}</h2>
          <p className="text-gray-500 text-sm font-body mb-6">{steps[step].subtitle}</p>

          {/* Step 0: Gender */}
          {step === 0 && (
            <div className="grid grid-cols-3 gap-3">
              {GENDER_OPTIONS.map(g => (
                <button
                  key={g.value}
                  onClick={() => setForm(f => ({ ...f, gender: g.value }))}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200
                    ${form.gender === g.value
                      ? 'bg-cyan-500/15 border-cyan-500 text-white'
                      : 'bg-gray-800/40 border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}
                >
                  <span className="text-2xl">{g.emoji}</span>
                  <span className="text-sm font-body font-medium">{g.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Step 1: Details */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="label-text">Profile photo</label>
                <div className="flex items-center gap-4 mt-2">
                  <img
                    src={form.profilePic || user?.profilePic || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.uid}`}
                    alt=""
                    className="w-20 h-20 rounded-xl object-cover border border-gray-700 bg-gray-800"
                  />
                  <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <label className="flex-1 cursor-pointer bg-gray-800 text-center py-2 px-3 rounded-lg text-sm text-gray-300 border border-gray-600 hover:bg-gray-700 hover:text-white transition-colors">
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhoto}
                          className="hidden"
                        />
                      </label>
                      <button type="button" onClick={startCamera} className="flex-1 bg-cyan-500/10 text-center py-2 px-3 rounded-lg text-sm text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors flex items-center justify-center gap-2">
                        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/></svg>
                        Camera
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Shown to strangers before you connect. Max 600KB.</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="label-text">Your Age</label>
                <input
                  type="number"
                  min="13"
                  max="100"
                  placeholder="e.g. 22"
                  value={form.age}
                  onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-text">Location <span className="text-gray-600">(optional)</span></label>
                <input
                  type="text"
                  placeholder="e.g. New Delhi, India"
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  className="input-field"
                />
              </div>
            </div>
          )}

          {/* Step 2: Preferences */}
          {step === 2 && (
            <div>
              <p className="text-gray-400 text-sm font-body mb-4">Select all that apply</p>
              <div className="grid grid-cols-3 gap-3">
                {PREF_OPTIONS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => togglePref(p.value)}
                    className={`py-3 px-2 rounded-xl border transition-all duration-200 text-sm font-body font-medium
                      ${form.preference.includes(p.value)
                        ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300'
                        : 'bg-gray-800/40 border-gray-700 text-gray-400 hover:border-gray-500'
                      }`}
                  >
                    {form.preference.includes(p.value) ? '✓ ' : ''}{p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 text-rose-400 text-sm font-body flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 flex-shrink-0" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button onClick={() => { setStep(s => s - 1); setError(''); }} className="btn-secondary flex-1">
                ← Back
              </button>
            )}
            {step < 2 ? (
              <button
                onClick={() => {
                  if (step === 0 && !form.gender) { setError('Please select your gender'); return; }
                  if (step === 1 && (!form.age || form.age < 13)) { setError('Please enter a valid age'); return; }
                  setError(''); setStep(s => s + 1);
                }}
                className="btn-primary flex-1"
              >
                Continue →
              </button>
            ) : (
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
                    </svg>
                    Saving...
                  </span>
                ) : 'Start Connecting 🌍'}
              </button>
            )}
          </div>
        </div>

        {/* Device Camera Modal */}
        {deviceCameraOpen && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4">
            <div className="relative w-full max-w-sm rounded-2xl overflow-hidden bg-gray-900 shadow-2xl border border-gray-800">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full aspect-[3/4] object-cover scale-x-[-1]"
              />
              <div className="p-4 flex gap-3">
                <button type="button" onClick={closeCamera} className="flex-1 py-3 px-4 rounded-xl bg-gray-800 text-gray-300 font-body text-sm font-semibold hover:bg-gray-700 transition">Cancel</button>
                <button type="button" onClick={takeSnapshot} className="flex-1 py-3 px-4 rounded-xl bg-cyan-500 text-gray-950 font-body text-sm font-semibold hover:bg-cyan-400 transition flex items-center justify-center gap-2">
                  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="13" r="4"/><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/></svg>
                  Snap
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User badge */}
        <div className="mt-4 text-center text-gray-600 text-sm font-body">
          Signed in as <span className="text-gray-400">{user?.name}</span>
        </div>
      </div>
    </div>
  );
}
