# Stranger Connect

**Stranger Connect** is a modern, real-time random video chat application inspired by Omegle/OmeTV but built with a polished interface, seamless matching algorithm, and enhanced user controls. 

It allows users to log in securely, set their matchmaking preferences, take a quick profile snapshot, and instantly drop into peer-to-peer video calls with strangers.

---

## 🌟 Key Features

- **Real-Time WebRTC Video & Audio:** Peer-to-peer high-quality video and low-latency audio transmission managed securely by a background signaling server.
- **Smart Matchmaking Queue:** Enter the queue and get matched with strangers based on preferences like gender. 
- **Instant Two-Way "Skip":** If a match isn't the right fit, clicking "Next" drops the call and instantly auto-requeues *both* users into the matchmaking lobby without needing to click searching ever again.
- **Profile Camera Integration:** Choose to upload a profile picture from your files, or fire up the in-browser webcam capability to take a live snapshot using an interactive hidden Canvas.
- **Synchronized Text Chat & Emojis:** Chat alongside video. Features an embedded custom Emoji keyboard with organized categories.
- **Safe Authentication:** Zero-password user management handled robustly through Google Firebase Auth.
- **Responsive Dark/Light Mode UI:** Glassmorphism UI heavily customized with Tailwind CSS ensuring the app looks gorgeous on any device size.

---

## 🛠️ Technology Stack

### Frontend
* **Core:** React 18 (Bootstrapped with Vite)
* **Styling:** Tailwind CSS + custom base CSS for animations and Glassmorphic effects
* **Routing:** React Router v6
* **Authentication:** Firebase Auth
* **Real-Time Communication:** WebRTC API native to the browser
* **Signaling:** Socket.io-client

### Backend
* **Core:** Node.js with Express.js
* **Database:** MongoDB & Mongoose (Storing profiles, gender, and matchmaking info)
* **WebSockets / Signaling Server:** Socket.io 

---

## 🚀 Getting Started

### Prerequisites
Make sure you have Node.js and MongoDB installed or have a MongoDB URI ready (MongoDB Atlas). You will also need a Firebase project.

### 1. Clone the Application
```bash
git clone https://github.com/aryanmandan/stranger-connect.git
```

### 2. Backend Setup
Navigate to the `backend` directory, install dependencies, and start the node server.
```bash
cd backend
npm install
```
**Environment variables:**
Create a `.env` inside `/backend` with the following:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
```
Start the server:
```bash
npm run dev
```

### 3. Frontend Setup
Navigate to the `frontend` directory, install dependencies, and start the Vite development server.
```bash
cd frontend
npm install
```
**Environment variables:**
Create a `.env` inside `/frontend` with your Firebase config and the URL to your background socket:
```env
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender
VITE_FIREBASE_APP_ID=your_app_id
VITE_SOCKET_URL=http://localhost:5000
```
Start the development server:
```bash
npm run dev
```

*(Note to test on external devices, type `npm run dev -- --host` and ensure the `SOCKET_URL` uses your local IP address)*

### 4. Build for Production
To build the static files for production (e.g., rendering on Vercel):
```bash
npm run build
```
The Frontend also includes a `vercel.json` rewrite file ensuring `react-router-dom` successfully functions cleanly in a Single Page App deployment.

---

## 🤝 Contributing
Feel free to open a Pull Request if you'd like to help refine the matchmaking algorithms or introduce STUN/TURN servers for hardcore network traversals!
