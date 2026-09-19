# PulsePoll — Real-Time Live Polling Engine

A modern, high-performance, real-time live polling platform built for the **GUVI HCL Developer Task**.

Live demo flow: **Create poll → Share link/QR code → Audience votes → Real-time live results stream (zero page refresh)**.

---

## 🚀 Live Deployed Link & Public Demo
- **Official Live Link (Vercel)**: **[https://live-polling-app-khaki.vercel.app](https://live-polling-app-khaki.vercel.app)**
- **Public GitHub Repository**: **[https://github.com/ArunaD246/Live-Polling-App](https://github.com/ArunaD246/Live-Polling-App)**


---

## 🛠️ Required Tech Stack & Architecture

| Layer | Technology | Real Role in the Architecture |
| :--- | :--- | :--- |
| **Frontend** | **React (Vite)** | Modular UI with interactive voting, live animated gauges, QR code generator, presenter mode, and persistent WebSocket listeners. |
| **Backend** | **Go (Gin)** | High-throughput compiled web service, strict server-side validation, JWT authentication, and concurrent WebSocket hub. |
| **Database** | **MongoDB** | Durable storage for user accounts, poll configurations, option text, and immutable vote audit logs preventing duplicate voting. |
| **Realtime** | **Redis** | Drives sub-millisecond atomic vote increments (`HINCRBY`), caches live tallies (`HGETALL`), and powers instant event fanout via **Redis Pub/Sub** across all connected clients. |

### How Redis & MongoDB are Doing Meaningful Work
1. **Redis is NOT just for show**:
   - **Atomic counters**: Every vote executes `HINCRBY poll:{id}:votes {option_id} 1`. This eliminates race conditions and locking overhead under high concurrent voting.
   - **Pub/Sub Broker**: Once a vote is incremented, an event is published to `poll:{id}:live`. All server WebSocket goroutines subscribe to this channel and stream the update directly to all connected audience screens in single-digit milliseconds.
   - **Realtime snapshot**: Active audience viewer count is tracked dynamically across connected sockets.
2. **MongoDB handles persistence & integrity**:
   - Stores users with bcrypt password hashing and unique email indexes.
   - Stores full poll schemas, descriptions, and expiration timestamps.
   - Stores voter audit records (`poll_id`, `voter_fingerprint`, `created_at`) with compound unique constraints to enforce anti-fraud and duplicate voting prevention.

---

## 📁 Project Structure

```
.
├── backend/
│   ├── config/              # Environment config loader (Mongo, Redis, JWT, Port)
│   ├── database/            # MongoDB driver & Redis atomic/pubsub engine (+ fallback)
│   ├── handlers/            # Gin handlers (Auth, Polls, Voting, Gorilla WebSocket hub)
│   ├── middleware/          # JWT auth middleware, CORS handler, input sanitizer
│   ├── models/              # Go structs (User, Poll, Vote, LiveUpdate, Requests)
│   ├── Dockerfile           # Optimized multi-stage Docker build
│   ├── go.mod & go.sum      # Go dependencies
│   └── main.go              # Service entrypoint & routing
│
├── frontend/
│   ├── public/              # Static assets and favicon
│   ├── src/
│   │   ├── components/      # Navbar, ShareModal (QR code, 1-click copy, social shares)
│   │   ├── pages/           # Home, Auth, Dashboard, CreatePoll, PollVote, PollResults
│   │   ├── services/        # API client, WebSocket URL builder, voter fingerprinting
│   │   ├── App.jsx          # React Router & protected routes
│   │   ├── index.css        # Glassmorphic dark design system & micro-animations
│   │   └── main.jsx         # Vite root mount
│   ├── Dockerfile           # Production container build with Nginx
│   ├── nginx.conf           # SPA routing fallback
│   └── package.json         # React dependencies
│
├── render.yaml              # 1-click deploy blueprint for Render
├── SUBMISSION_GUIDE.md      # Video walkthrough script and interview QA
└── README.md                # Project documentation
```

---

## ✨ Key Features & Edge Case Handling

1. **Truly Real-Time (Zero Refresh)**:
   - When any voter submits a vote, all viewers on the Results screen see bars expand and counters tick up instantaneously without touching reload.
2. **Server-Side Validation**:
   - Questions must be 5–250 chars.
   - Options must have 2–10 valid unique entries.
   - Rejects votes on expired or manually closed polls.
   - Prevents selecting options outside the poll or multiple choices on single-choice polls.
3. **Anti-Duplicate Voting Protection**:
   - Combines device fingerprinting with server-side voter audit checks in MongoDB and browser localStorage tokens. Re-voting returns an HTTP 409 Conflict with friendly feedback.
4. **Presenter Mode (Projection View)**:
   - Fullscreen mode designed for classrooms, conferences, or auditoriums with large typography and clean focus on live bars.
5. **Interactive QR Code & 1-Click Sharing**:
   - Built-in QR Code generator allows in-person audiences to scan with their phone camera and vote in seconds.
   - Direct sharing to WhatsApp, Twitter/X, and Telegram.
6. **Live Viewer Tracker**:
   - Live pill badge displays currently active audience viewers connected via WebSockets.
7. **CSV Export**:
   - Creators can export real-time breakdown tallies and percentages as `.csv` from the dashboard.

---

## 🏃 Local Development Quickstart

### Prerequisites
- [Go 1.22+](https://go.dev/dl/)
- [Node.js 18+](https://nodejs.org/)

### 1. Run the Go Backend
```bash
cd backend
go run main.go
```
*Note: The backend includes an intelligent in-memory fallback engine. If local MongoDB or Redis aren't running, it operates seamlessly for local development while logging status. To connect real instances, simply set `MONGO_URI` and `REDIS_URL` in `backend/.env`!*

The backend will start at `http://localhost:8080`.

### 2. Run the React Frontend
Open a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🌐 Deployment to Live Link

### Option A: Free Cloud Services (Recommended)
1. **Database & Redis (Free Tiers)**:
   - **MongoDB**: Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas). Copy the `mongodb+srv://...` connection string.
   - **Redis**: Create a free database at [Upstash Redis](https://upstash.com). Copy the `rediss://...` connection string.
2. **Backend Deployment (Render Web Service)**:
   - Push this repo to GitHub.
   - Create a **New Web Service** on [Render](https://render.com) connected to your GitHub repo.
   - Root Directory: `backend`
   - Environment: `Docker` (or Go)
   - Environment variables:
     - `PORT`: `8080`
     - `JWT_SECRET`: Any 32-character random string
     - `MONGO_URI`: Your MongoDB Atlas connection string
     - `REDIS_URL`: Your Upstash Redis connection string
     - `CLIENT_URL`: Your deployed frontend URL
3. **Frontend Deployment (Vercel or Render Static Site)**:
   - Connect your GitHub repo to [Vercel](https://vercel.com).
   - Framework preset: `Vite`
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Environment variable:
     - `VITE_API_URL`: URL of your deployed Go backend (e.g. `https://pulsepoll-backend.onrender.com`)

---

## 🧪 API Endpoints

### Public Routes
- `GET /api/health` — Health check status of server, Redis, and Mongo.
- `GET /api/polls/:id` — Retrieve public poll data and Redis tallies.
- `POST /api/polls/:id/vote` — Cast vote (validates inputs, increments Redis hash, broadcasts to Pub/Sub).
- `GET /ws/polls/:id` — WebSocket streaming connection.

### Authenticated Routes (`Authorization: Bearer <token>`)
- `POST /api/auth/register` — User signup.
- `POST /api/auth/login` — User signin (returns JWT).
- `GET /api/auth/me` — Current profile.
- `POST /api/polls` — Create poll with options and settings.
- `GET /api/polls/my` — List all polls created by current user.
- `PATCH /api/polls/:id/status` — Close or re-open poll for voting.
- `DELETE /api/polls/:id` — Delete poll.
