import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { connectSocket, getSocket } from '../services/socket';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
};

const EMOJI_CATEGORIES = [
  { label: 'Smileys', emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥸','😎','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿'] },
  { label: 'Gestures', emojis: ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🙏','✍️','💪','🦾','🦵','🦶','👂','🫀','🫁','🧠','🦷','🦴','👀','👁️','👅','👃'] },
  { label: 'People', emojis: ['👶','🧒','👦','👧','🧑','👱','👨','🧔','👩','🧓','👴','👵','🙍','🙎','🙅','🙆','💁','🙋','🧏','🙇','🤦','🤷','👮','🕵️','💂','🥷','👷','🤴','👸','🧙','🧝','🧛','🧟','🧞','🧜','🧚','👼','🤶','🎅','🦸','🦹','🧑‍💻','👫','👬','👭','💑','👨‍👩‍👦','🗣️','👤'] },
  { label: 'Hearts & Love', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☯️','🕉️','🤝','💋','💌','💍','💎'] },
  { label: 'Animals', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🦋','🐛','🐌','🐞','🐜','🦟','🦗','🕷️','🦂','🐢','🐍','🦎','🐊','🐲','🦕','🐳','🐬','🦈','🐬','🐟','🐡','🦑','🦞','🦀','🐡'] },
  { label: 'Food', emojis: ['🍕','🍔','🍟','🌭','🍿','🧂','🥓','🥚','🍳','🧇','🥞','🧈','🍞','🥐','🥨','🧀','🥗','🥙','🧆','🌮','🌯','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🍤','🍙','🍚','🍘','🍥','🥮','🍢','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍩','🍪','🌰','🍑','🍒','🍓','🫐','🍇','🍉','🍊','🍋','🍌','🍍','🥭','🍎','🍏','🍐','🍷','🍸','🍹','🧉','🧃','🥛','☕','🧋','🧊'] },
  { label: 'Activities', emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🏓','🏸','🥊','🥋','🎽','🛹','🛷','⛸️','🥌','🏒','🏑','🏏','🪃','🏹','🎣','🤿','🥅','⛳','🪁','🏋️','🤸','🤺','🤼','🤾','🏌️','🏇','🧘','🎯','🎲','🎮','🕹️','🎳','🃏','🀄','🎴','🎭','🎨','🔮','🎰','🎪','🎤','🎧','🎷','🎸','🎹','🥁','🎬','🎥','🎞️','📺','📻','🎙️'] },
  { label: 'Travel', emojis: ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍️','🛵','🚲','🛴','🛺','🚨','🚔','🚍','🚘','🚖','🛞','🚡','🚠','🚟','🚃','🚋','🚝','🚄','🚅','🚈','🚂','🚆','🚇','🚊','🚉','✈️','🛩️','🛫','🛬','🛳️','⛴️','🚢','🛥️','⛵','🚤','🛶','🚁','🛸','🚀','🛰️','⛽','🚧','⚓'] },
  { label: 'Symbols', emojis: ['💯','🔥','✨','🎉','🎊','🎈','💥','❄️','🌟','⭐','🌙','☀️','🌈','🌊','💫','🌀','🎵','🎶','💤','💢','💦','💧','🌸','🌺','🌻','🌹','🍀','🌿','🍃','🌴','🌵','🌾','⚡','🌍','🌎','🌏','🗺️','🏔️','🌋','🏕️','🏖️','⏰','⌛','⏳','🔔','🔕','🔇','🔈','🔊','📢','📣','🔑','🗝️','🔐','🔒','🔓','🔎','🔍','💡','🔦','🕯️','💰','💳','📱','💻','⌨️','🖨️','🖥️','📷','📹','🎞️'] },
];

function stopMediaStream(stream) {
  stream?.getTracks().forEach((t) => {
    try {
      t.stop();
    } catch {
      /* ignore */
    }
  });
}

function ChatBubble({ msg, isOwn }) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} message-bubble`}>
      <div
        className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm font-body leading-relaxed
          ${isOwn
            ? 'bg-cyan-500 text-gray-950 rounded-br-sm'
            : 'bg-gray-800 text-gray-200 rounded-bl-sm border border-gray-700'
          }`}
      >
        {msg.message}
      </div>
    </div>
  );
}

export default function Chat() {
  const { roomId } = useParams();
  const { state } = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isOfferer = state?.isOfferer ?? false;
  const peerProfile = state?.peerProfile ?? {};

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const chatOpenRef = useRef(false);
  const [unread, setUnread] = useState(0);

  const [connState, setConnState] = useState('connecting');
  const connStateRef = useRef('connecting');
  const [emojiOpen, setEmojiOpen] = useState(false);

  const pcRef = useRef(null);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pendingIceRef = useRef([]);
  const msgDedupeRef = useRef(new Set());
  const emojiWrapRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    chatOpenRef.current = chatOpen;
  }, [chatOpen]);

  useEffect(() => {
    const close = (e) => {
      if (emojiWrapRef.current && !emojiWrapRef.current.contains(e.target)) setEmojiOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const flushIce = useCallback(async (pc) => {
    const q = pendingIceRef.current.splice(0);
    for (const c of q) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch {
        /* ignore */
      }
    }
  }, []);

  const leaveCall = useCallback(() => {
    try {
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    } catch {
      /* ignore */
    }
    stopMediaStream(localStreamRef.current);
    stopMediaStream(remoteStreamRef.current);
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    const pc = pcRef.current;
    if (pc) {
      pc.getSenders().forEach((sender) => {
        try {
          sender.track?.stop();
        } catch {
          /* ignore */
        }
      });
      pc.close();
    }
    pcRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
  }, []);

  const goDashboard = useCallback(() => {
    leaveCall();
    socketRef.current?.emit('nextUser');
    window.setTimeout(() => navigate('/dashboard', { state: { autoSearch: true } }), 0);
  }, [leaveCall, navigate]);

  const createPeerConnection = useCallback(
    (socket) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      pc.onicecandidate = ({ candidate }) => {
        if (candidate) socket.emit('iceCandidate', { roomId, candidate: candidate.toJSON() });
      };

      pc.ontrack = (ev) => {
        const rs = ev.streams[0] || (ev.track ? new MediaStream([ev.track]) : null);
        if (rs) {
          remoteStreamRef.current = rs;
          setRemoteStream(rs);
          connStateRef.current = 'connected';
          setConnState('connected');
        }
      };

      pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        if (s === 'connected') { connStateRef.current = 'connected'; setConnState('connected'); }
        if (s === 'disconnected' || s === 'failed' || s === 'closed') { connStateRef.current = 'disconnected'; setConnState('disconnected'); }
      };

      return pc;
    },
    [roomId]
  );

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    let isMounted = true;

    connectSocket();
    const socket = getSocket();
    socketRef.current = socket;

    let pc;
    let stream;

    const onReceiveMessage = (payload) => {
      const { message, userId, timestamp, id: mid } = payload;
      const dedupeKey = mid || `${timestamp}-${userId}-${message}`;
      if (msgDedupeRef.current.has(dedupeKey)) return;
      msgDedupeRef.current.add(dedupeKey);
      if (msgDedupeRef.current.size > 200) {
        msgDedupeRef.current.clear();
      }
      setMessages((prev) => [...prev, { message, userId, timestamp, isOwn: false, id: mid }]);
      if (!chatOpenRef.current) setUnread((u) => u + 1);
    };

    const onOffer = async ({ offer }) => {
      if (!pc || !isMounted) return;
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      await flushIce(pc);
      if (!isMounted) return;
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', { roomId, answer });
    };

    const onAnswer = async ({ answer }) => {
      if (!pc || !isMounted) return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      await flushIce(pc);
    };

    const onIceCandidate = async ({ candidate }) => {
      if (!pc || !candidate || !isMounted) return;
      if (!pc.remoteDescription) {
        pendingIceRef.current.push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        /* ignore */
      }
    };

    const onCreateOffer = async () => {
      if (!pc || !isOfferer || !isMounted) return;
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { roomId, offer });
      } catch {
        /* ignore */
      }
    };

    const init = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        } catch {
          stream = null;
        }
      }

      if (!isMounted) {
        stopMediaStream(stream);
        return;
      }

      if (stream) {
        setLocalStream(stream);
        localStreamRef.current = stream;
      }

      pc = createPeerConnection(socket);
      pcRef.current = pc;

      if (stream) {
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      }

      socket.on('offer', onOffer);
      socket.on('answer', onAnswer);
      socket.on('iceCandidate', onIceCandidate);
      socket.on('createOffer', onCreateOffer);
      socket.on('receiveMessage', onReceiveMessage);
      socket.on('userLeft', () => {
        setConnState('disconnected');
        window.setTimeout(() => {
          if (isMounted) goDashboard();
        }, 1500);
      });
      socket.on('userDisconnected', () => {
        setConnState('disconnected');
        window.setTimeout(() => {
          if (isMounted) goDashboard();
        }, 1500);
      });

      // Signal ready — small delay so both peers finish mounting before server triggers offer
      window.setTimeout(() => {
        if (isMounted) socket.emit('rtcReady', { roomId });
      }, 500);

      // Fallback: if still not connected after 5s and we're offerer, try creating offer anyway
      if (isOfferer) {
        window.setTimeout(async () => {
          if (!isMounted || connStateRef.current === 'connected') return;
          const currentPc = pcRef.current;
          if (!currentPc || currentPc.signalingState !== 'stable') return;
          try {
            const offer = await currentPc.createOffer();
            await currentPc.setLocalDescription(offer);
            socket.emit('offer', { roomId, offer });
          } catch { /* ignore */ }
        }, 5000);
      }
    };

    init();

    return () => {
      isMounted = false;
      // Remove specific listeners first
      socket.off('offer', onOffer);
      socket.off('answer', onAnswer);
      socket.off('iceCandidate', onIceCandidate);
      socket.off('createOffer', onCreateOffer);
      socket.off('receiveMessage', onReceiveMessage);
      socket.off('userLeft');
      socket.off('userDisconnected');
      try {
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      } catch {
        /* ignore */
      }
      stopMediaStream(stream);
      stopMediaStream(remoteStreamRef.current);
      remoteStreamRef.current = null;
      localStreamRef.current = null;
      if (pc) {
        pc.getSenders().forEach((s) => {
          try {
            s.track?.stop();
          } catch {
            /* ignore */
          }
        });
        pc.close();
      }
      pcRef.current = null;
      pendingIceRef.current = [];
    };
  }, [user, roomId, isOfferer, navigate, createPeerConnection, flushIce]);

  const toggleMic = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setMicOn((m) => !m);
  };

  const toggleCam = () => {
    localStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setCamOn((c) => !c);
  };

  const sendMessage = () => {
    const msg = input.trim();
    if (!msg || !socketRef.current || !user) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    socketRef.current.emit('sendMessage', {
      roomId,
      message: msg,
      userId: user.uid,
      id,
    });
    setMessages((prev) => [
      ...prev,
      { message: msg, userId: user.uid, timestamp: Date.now(), isOwn: true, id },
    ]);
    setInput('');
  };

  const connLabel = {
    connecting: { text: 'Connecting…', color: 'text-yellow-400', dot: 'bg-yellow-400' },
    connected: { text: 'Connected', color: 'text-green-400', dot: 'bg-green-400' },
    disconnected: { text: 'Disconnected', color: 'text-rose-400', dot: 'bg-rose-400' },
  }[connState];

  useEffect(() => {
    if (chatOpen) setUnread(0);
  }, [chatOpen]);

  useEffect(() => {
    const v = remoteVideoRef.current;
    if (!v || !remoteStream) return;
    v.srcObject = remoteStream;
    v.muted = false;
    const playAttempt = v.play();
    if (playAttempt && typeof playAttempt.catch === 'function') {
      playAttempt.catch(() => {});
    }
  }, [remoteStream]);

  useEffect(() => {
    const v = localVideoRef.current;
    if (!v || !localStream) return;
    v.srcObject = localStream;
    v.muted = true;
    const playAttempt = v.play();
    if (playAttempt && typeof playAttempt.catch === 'function') {
      playAttempt.catch(() => {});
    }
  }, [localStream, camOn]);

  const [activeCat, setActiveCat] = useState(0);

  const insertEmoji = (emoji) => {
    setInput((prev) => (prev + emoji).slice(0, 300));
    setEmojiOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden">
      {/* Remote video — full viewport */}
      <div className="absolute inset-0 z-[1] min-h-full min-w-full bg-gray-950">
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted={false}
            className="absolute inset-0 z-[1] h-full w-full object-cover bg-black"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-950">
            {connState === 'disconnected' ? (
              <>
                <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10 text-gray-600" stroke="currentColor" strokeWidth="1.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div className="text-center px-4">
                  <p className="text-rose-400 font-body font-medium">Stranger has disconnected</p>
                  <p className="text-gray-500 text-sm font-body mt-1">Find someone new?</p>
                </div>
                <button type="button" onClick={goDashboard} className="btn-primary px-8 py-2.5">
                  Find Next →
                </button>
              </>
            ) : (
              <>
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 rounded-full border border-cyan-500/30 animate-ping" />
                  <div
                    className="absolute inset-3 rounded-full border border-cyan-500/40 animate-ping"
                    style={{ animationDelay: '0.4s' }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full bg-cyan-500/50 animate-pulse" />
                  </div>
                </div>
                <p className="text-gray-500 font-body text-sm">Waiting for peer video…</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Top bar — over video */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 sm:px-4 py-3 bg-gradient-to-b from-black/75 via-black/40 to-transparent pointer-events-none">
        <div className="flex items-center gap-3 min-w-0 pointer-events-auto">
          <button
            type="button"
            onClick={goDashboard}
            className="w-9 h-9 rounded-lg bg-black/50 border border-white/10 flex items-center justify-center hover:bg-black/70 text-gray-200 flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <div className="min-w-0 flex items-center gap-2">
            {peerProfile.profilePic ? (
              <img
                src={peerProfile.profilePic}
                alt=""
                className="w-9 h-9 rounded-xl object-cover border border-white/10 flex-shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gray-800/80 border border-white/10 flex-shrink-0" />
            )}
            <div className="min-w-0">
              <span className="font-display font-bold text-white block truncate drop-shadow-md">
                Stranger<span className="text-cyan-400">Connect</span>
              </span>
              <span className="text-xs text-gray-300 font-body truncate block drop-shadow-md">
                {peerProfile.name || 'Stranger'}
                {peerProfile.age ? ` · ${peerProfile.age}` : ''}
                {peerProfile.location ? ` · ${peerProfile.location}` : ''}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 pointer-events-auto">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 border border-white/10 text-xs font-body ${connLabel.color}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${connLabel.dot} ${connState !== 'disconnected' ? 'status-dot' : ''}`}
            />
            {connLabel.text}
          </div>
          <button
            type="button"
            onClick={goDashboard}
            className="px-4 py-1.5 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-body font-semibold rounded-lg hover:bg-cyan-500/30 transition-colors"
          >
            ⏭ Next
          </button>
        </div>
      </div>

      {/* Local preview — in front of remote, bottom-right */}
      <div className="pointer-events-none absolute bottom-36 right-4 z-30 w-36 sm:w-44 aspect-video rounded-xl overflow-hidden border-2 border-white/25 shadow-2xl bg-gray-900 ring-1 ring-white/10">
        {localStream && camOn ? (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover scale-x-[-1] pointer-events-auto"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-gray-600" stroke="currentColor" strokeWidth="1.5">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          </div>
        )}
        <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/65 text-[10px] text-gray-300 font-body pointer-events-none">
          You
        </div>
      </div>

      {/* Stranger name label on video */}
      {remoteStream && (
        <div className="pointer-events-none absolute bottom-40 left-4 z-[25] px-2.5 py-1 rounded-lg bg-black/55 backdrop-blur-sm text-xs text-gray-200 font-body max-w-[70%] truncate">
          {peerProfile.name || 'Stranger'}
        </div>
      )}

      {/* Bottom controls — over video */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex justify-center px-4 pb-6 pt-12 bg-gradient-to-t from-black/90 via-black/55 to-transparent">
        <div className="flex items-center justify-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={toggleMic}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border flex items-center justify-center transition-all duration-200 backdrop-blur-sm
              ${micOn ? 'bg-black/50 border-white/15 text-gray-200 hover:bg-black/70' : 'bg-rose-500/25 border-rose-400/40 text-rose-300'}`}
            title={micOn ? 'Mute' : 'Unmute'}
          >
            {micOn ? (
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 sm:w-6 sm:h-6" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 sm:w-6 sm:h-6" stroke="currentColor" strokeWidth="2">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={toggleCam}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border flex items-center justify-center transition-all duration-200 backdrop-blur-sm
              ${camOn ? 'bg-black/50 border-white/15 text-gray-200 hover:bg-black/70' : 'bg-rose-500/25 border-rose-400/40 text-rose-300'}`}
            title={camOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {camOn ? (
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 sm:w-6 sm:h-6" stroke="currentColor" strokeWidth="2">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 sm:w-6 sm:h-6" stroke="currentColor" strokeWidth="2">
                <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setChatOpen((c) => !c);
              setUnread(0);
            }}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border flex items-center justify-center transition-all relative backdrop-blur-sm
              ${chatOpen ? 'bg-cyan-500/25 border-cyan-400/50 text-cyan-300' : 'bg-black/50 border-white/15 text-gray-200 hover:bg-black/70'}`}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 sm:w-6 sm:h-6" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 px-1 rounded-full bg-cyan-500 text-gray-950 text-[10px] flex items-center justify-center font-bold">
                {unread}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={goDashboard}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-rose-600 text-white flex items-center justify-center hover:bg-rose-500 active:scale-95 transition-all shadow-lg shadow-rose-600/40 border border-rose-400/30"
            title="End call"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 sm:w-8 sm:h-8" stroke="currentColor" strokeWidth="2">
              <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.43 9.88a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.34 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.32 8.9" />
              <line x1="23" y1="1" x2="1" y2="23" />
            </svg>
          </button>
        </div>
      </div>

      {/* Chat drawer — overlays full screen from right */}
      <div
        className={`fixed inset-y-0 right-0 z-40 flex w-[min(100%,20rem)] flex-col bg-gray-950/98 backdrop-blur-xl border-l border-gray-800 shadow-2xl transition-transform duration-300 ease-out ${
          chatOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
            <h3 className="font-display font-semibold text-white text-sm">Messages</h3>
            <button type="button" onClick={() => setChatOpen(false)} className="text-gray-500 hover:text-gray-300 transition-colors">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.length === 0 && (
              <div className="text-center text-gray-600 text-sm font-body mt-8">
                <div className="text-2xl mb-2">💬</div>
                Say hi to your stranger!
              </div>
            )}
            {messages.map((msg, i) => (
              <ChatBubble key={msg.id || `${msg.timestamp}-${i}`} msg={msg} isOwn={msg.isOwn} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-gray-800 flex-shrink-0">
            <div className="flex gap-2 items-end">
              <div className="relative flex-shrink-0" ref={emojiWrapRef}>
                <button
                  type="button"
                  onClick={() => { setEmojiOpen((o) => !o); setActiveCat(0); }}
                  className="w-9 h-9 rounded-xl bg-gray-800 border border-gray-700 text-lg flex items-center justify-center hover:border-cyan-500/50 transition-colors"
                  title="Emoji"
                >
                  😊
                </button>
                {emojiOpen && (
                  <div className="absolute bottom-full left-0 mb-2 z-50 w-80 rounded-xl bg-gray-900 border border-gray-700 shadow-2xl overflow-hidden" style={{maxHeight: '320px'}}>
                    {/* Category tabs */}
                    <div className="flex gap-1 p-2 border-b border-gray-800 overflow-x-auto scrollbar-thin">
                      {EMOJI_CATEGORIES.map((cat, i) => (
                        <button
                          key={cat.label}
                          type="button"
                          onClick={() => setActiveCat(i)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-body whitespace-nowrap transition-colors flex-shrink-0 ${
                            activeCat === i
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                    {/* Emoji grid */}
                    <div className="p-2 grid grid-cols-8 gap-0.5 overflow-y-auto" style={{maxHeight: '240px'}}>
                      {EMOJI_CATEGORIES[activeCat].emojis.map((em) => (
                        <button
                          key={em}
                          type="button"
                          className="w-9 h-9 text-xl hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors"
                          onClick={() => insertEmoji(em)}
                          title={em}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <input
                type="text"
                placeholder="Type a message…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1 min-w-0 px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-200 placeholder-gray-600 font-body focus:outline-none focus:border-cyan-500 transition-colors"
                maxLength={300}
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={!input.trim()}
                className="w-9 h-9 flex-shrink-0 rounded-xl bg-cyan-500 text-gray-950 flex items-center justify-center hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
      </div>
    </div>
  );
}
