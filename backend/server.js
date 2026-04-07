require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/user', require('./routes/user'));
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB error:', err.message));

// ─── Matching Logic ───────────────────────────────────────────────────────────
// waitingUsers: Map<socketId, { socket, userId, gender, preference }>
const waitingUsers = new Map();
// activeRooms: Map<roomId, { users: [socketId, socketId] }>
const activeRooms = new Map();
// socketToRoom: Map<socketId, roomId>
const socketToRoom = new Map();
// WebRTC: both peers must signal ready before the offerer creates an offer (avoids lost SDP)
const rtcReadyByRoom = new Map();

// interactionHistory: Map<userId, Map<otherUserId, expireTimestamp>>
const interactionHistory = new Map();

// Cleanup old history every minute
setInterval(() => {
  const now = Date.now();
  for (const [uid, map] of interactionHistory.entries()) {
    for (const [otherUid, exp] of map.entries()) {
      if (exp < now) map.delete(otherUid);
    }
    if (map.size === 0) interactionHistory.delete(uid);
  }
}, 60 * 1000);

function recordInteraction(user1Id, user2Id) {
  if (!user1Id || !user2Id) return;
  const expires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  if (!interactionHistory.has(user1Id)) interactionHistory.set(user1Id, new Map());
  interactionHistory.get(user1Id).set(user2Id, expires);

  if (!interactionHistory.has(user2Id)) interactionHistory.set(user2Id, new Map());
  interactionHistory.get(user2Id).set(user1Id, expires);
}

// Let the server natively broadcast the connected count every 2 seconds
setInterval(() => {
  io.emit('onlineCount', io.engine.clientsCount);
}, 2000);

function tryMatch(newUser) {
  for (const [sid, candidate] of waitingUsers.entries()) {
    if (sid === newUser.socket.id) continue;
    if (newUser.userId && candidate.userId && newUser.userId === candidate.userId) continue;

    // Check interaction history to prevent matching with recently skipped people
    let history = interactionHistory.get(newUser.userId);
    if (history && history.get(candidate.userId) > Date.now()) continue;

    history = interactionHistory.get(candidate.userId);
    if (history && history.get(newUser.userId) > Date.now()) continue;

    const aWantsB = newUser.preference.includes(candidate.gender) || newUser.preference.includes('any');
    const bWantsA = candidate.preference.includes(newUser.gender) || candidate.preference.includes('any');

    if (aWantsB && bWantsA) {
      // Record encounter so they don't match for next 10 mins
      recordInteraction(newUser.userId, candidate.userId);

      // Remove both from queue
      waitingUsers.delete(sid);
      waitingUsers.delete(newUser.socket.id);

      const roomId = `room_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const offererSid = newUser.socket.id;
      const expiresAt = Date.now() + 10000;
      const matchTimeoutId = setTimeout(() => {
        const r = activeRooms.get(roomId);
        if (!r || r.proceedEmitted) return;
        r.users.forEach((uid) => {
          io.sockets.sockets.get(uid)?.emit('matchTimeout');
        });
        cleanupRoom(null, roomId);
      }, 10000);

      activeRooms.set(roomId, {
        users: [newUser.socket.id, sid],
        offererSid,
        accepts: new Set(),
        proceedEmitted: false,
        expiresAt,
        matchTimeoutId,
        meta: {
          [newUser.socket.id]: { userId: newUser.userId, profile: newUser.profile || {} },
          [sid]: { userId: candidate.userId, profile: candidate.profile || {} },
        },
      });
      socketToRoom.set(newUser.socket.id, roomId);
      socketToRoom.set(sid, roomId);

      newUser.socket.join(roomId);
      candidate.socket.join(roomId);

      const peerForNew = candidate.profile || {};
      const peerForCand = newUser.profile || {};

      newUser.socket.emit('matched', {
        roomId,
        isOfferer: true,
        peerId: candidate.userId,
        peerProfile: peerForNew,
        expiresAt,
      });
      candidate.socket.emit('matched', {
        roomId,
        isOfferer: false,
        peerId: newUser.userId,
        peerProfile: peerForCand,
        expiresAt,
      });
      return true;
    }
  }
  return false;
}

// ─── Socket.IO Events ─────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Connected: ${socket.id}`);
  
  // Immeditately send the current count to the new socket specifically
  socket.emit('onlineCount', io.engine.clientsCount);

  socket.on('joinQueue', ({ userId, gender, preference, profile }) => {
    // Leave any existing room first
    const existingRoom = socketToRoom.get(socket.id);
    if (existingRoom) {
      socket.to(existingRoom).emit('userLeft');
      cleanupRoom(socket.id, existingRoom);
    }

    const userInfo = {
      socket,
      userId,
      gender: gender || 'other',
      preference: preference || ['male', 'female', 'other'],
      profile: profile && typeof profile === 'object' ? profile : {},
    };
    waitingUsers.set(socket.id, userInfo);

    const matched = tryMatch(userInfo);
    if (!matched) {
      socket.emit('waitingForMatch');
    }
  });

  socket.on('leaveQueue', () => {
    waitingUsers.delete(socket.id);
  });

  socket.on('nextUser', () => {
    const roomId = socketToRoom.get(socket.id);
    if (roomId) {
      socket.to(roomId).emit('userLeft');
      cleanupRoom(socket.id, roomId);
    }
    waitingUsers.delete(socket.id);
  });

  socket.on('acceptMatch', ({ roomId }) => {
    const room = activeRooms.get(roomId);
    if (!room || !room.accepts || room.proceedEmitted) return;
    if (room.accepts.has(socket.id)) return;

    room.accepts.add(socket.id);

    const otherSid = room.users.find((id) => id !== socket.id);
    if (otherSid) {
      io.sockets.sockets.get(otherSid)?.emit('peerMatchStatus', { roomId, kind: 'peerAccepted' });
    }

    if (room.accepts.size >= 2) {
      room.proceedEmitted = true;
      if (room.matchTimeoutId) {
        clearTimeout(room.matchTimeoutId);
        room.matchTimeoutId = null;
      }
      room.users.forEach((sid) => {
        const s = io.sockets.sockets.get(sid);
        if (!s) return;
        const isOfferer = sid === room.offererSid;
        const peerSid = room.users.find((x) => x !== sid);
        const peerMeta = peerSid ? room.meta[peerSid] : null;
        s.emit('matchProceed', {
          roomId,
          isOfferer,
          peerId: peerMeta?.userId,
          peerProfile: peerMeta?.profile || {},
        });
      });
      return;
    }

    socket.emit('matchWaiting', { roomId });
  });

  socket.on('declineMatch', ({ roomId }) => {
    const room = activeRooms.get(roomId);
    if (!room) return;
    const otherSid = room.users.find((id) => id !== socket.id);
    if (otherSid) {
      io.sockets.sockets.get(otherSid)?.emit('peerMatchStatus', { roomId, kind: 'peerDeclined' });
      io.sockets.sockets.get(otherSid)?.emit('matchDeclined');
    }
    cleanupRoom(socket.id, roomId);
    waitingUsers.delete(socket.id);
  });

  socket.on('sendMessage', ({ roomId, message, userId, id }) => {
    socket.to(roomId).emit('receiveMessage', {
      message,
      userId,
      timestamp: Date.now(),
      ...(id ? { id } : {}),
    });
  });

  // WebRTC signalling
  socket.on('offer', ({ roomId, offer }) => {
    socket.to(roomId).emit('offer', { offer });
  });

  socket.on('answer', ({ roomId, answer }) => {
    socket.to(roomId).emit('answer', { answer });
  });

  socket.on('iceCandidate', ({ roomId, candidate }) => {
    socket.to(roomId).emit('iceCandidate', { candidate });
  });

  socket.on('rtcReady', ({ roomId }) => {
    const room = activeRooms.get(roomId);
    if (!room) return;
    if (!rtcReadyByRoom.has(roomId)) rtcReadyByRoom.set(roomId, new Set());
    rtcReadyByRoom.get(roomId).add(socket.id);
    const ready = rtcReadyByRoom.get(roomId);
    if (ready.size >= 2 && room.offererSid) {
      io.to(room.offererSid).emit('createOffer');
      rtcReadyByRoom.delete(roomId);
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Disconnected: ${socket.id}`);
    waitingUsers.delete(socket.id);
    const roomId = socketToRoom.get(socket.id);
    if (roomId) {
      socket.to(roomId).emit('userDisconnected');
      cleanupRoom(socket.id, roomId);
    }
  });
});

function cleanupRoom(socketId, roomId) {
  const room = activeRooms.get(roomId);
  if (!room) return;
  if (room.matchTimeoutId) {
    clearTimeout(room.matchTimeoutId);
    room.matchTimeoutId = null;
  }
  rtcReadyByRoom.delete(roomId);
  room.users.forEach((sid) => {
    socketToRoom.delete(sid);
    const s = io.sockets.sockets.get(sid);
    if (s) s.leave(roomId);
  });
  activeRooms.delete(roomId);
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
