# GUVI HCL Internship: Submission & Video Walkthrough Guide

Use this guide to ensure your submission fulfills 100% of the evaluation criteria and ace the video walkthrough.

---

## 📋 Evaluation Checklist

- [x] **Does it actually work end-to-end?** Full flow runs: Create poll → Share link/QR → Audience votes → Results update live via WebSockets without refreshing.
- [x] **Real use of the stack?**
  - **Go (Gin)**: High-throughput API routing, Gorilla WebSocket manager, and input validation.
  - **Redis**: Atomic vote counter increments (`HINCRBY`), cached tallies, and Pub/Sub event bus.
  - **MongoDB**: Schema persistence, user credentials, and vote audit logs.
  - **React**: Modern reactive client with smooth progress animations, QR code generator, and presenter mode.
- [x] **Code quality & security**: Backend input validation, unique constraints, JWT sessions, anti-duplicate voting guards.
- [x] **UI/UX polish**: Premium glassmorphic dark theme, micro-animations, confetti celebrations, mobile-first design.
- [x] **Separation of concerns**: `/frontend` and `/backend` strictly separated.
- [x] **Deployability**: Ready for cloud deployment with `Dockerfile`, `render.yaml`, and `vercel.json`.

---

## 🎥 3–5 Minute Video Walkthrough Script

The task requires submitting an unlisted YouTube or public Google Drive video (3–5 minutes). Here is a high-scoring script outline you can follow:

### 1. Introduction (0:00 - 0:45)
> *"Hello! My name is [Your Name], and this is my submission for the GUVI HCL Developer Internship live polling task. Today I'll demonstrate PulsePoll, a real-time live polling platform built using React, Go with Gin, Redis, and MongoDB."*
> - Show the landing page and briefly explain the 4-step flow.

### 2. Live Demo of the Flow (0:45 - 2:00)
> - **Sign In / Create Account**: Demonstrate signing up and accessing the Creator Dashboard.
> - **Create a Poll**: Create a poll (e.g. *"What is the most critical factor for distributed systems?"* with 3 options).
> - **Show Side-by-Side Zero-Refresh Real-Time Update**:
>   - Open the **Live Results** page in one window (or presenter mode).
>   - Open the **Audience Voting link** in an incognito window or your mobile phone.
>   - Vote on the option in the audience window.
>   - **Highlight**: Point out how the live results bar and percentage update *immediately* on the presenter screen with zero page refresh, powered by Redis Pub/Sub and WebSockets.
> - **Show Features**: Highlight the QR code generator, live active viewer counter, and duplicate vote prevention.

### 3. The One Challenge That Gave the Most Trouble & How You Solved It (2:00 - 3:15)
*(This is directly asked in the evaluation criteria!)*
> *"The biggest technical challenge I faced was coordinating real-time concurrency with persistent integrity: specifically, keeping Redis in-memory counts synchronized with MongoDB persistent storage under concurrent voting bursts.*
>
> *If every vote required a round-trip write and read to MongoDB before updating the clients, database locks and latency would slow down the live feed. To solve this:*
> 1. *I used Redis as the real-time layer: when a vote comes in, the Go backend atomically increments the option in a Redis Hash using `HINCRBY`, which takes under a millisecond and eliminates race conditions.*
> 2. *The backend immediately publishes a live delta event to a Redis Pub/Sub channel (`poll:{id}:live`).*
> 3. *The Go WebSocket hub subscribes to this channel and fans out the update to all connected audience clients.*
> 4. *In the background, the vote audit record is asynchronously saved to MongoDB for audit trails and duplicate vote checks.*
>
> *This decoupled architecture guarantees zero lag for audience viewers while preserving data consistency."*

### 4. The AI Question (3:15 - 4:15)
*(This is also directly asked in the evaluation criteria!)*
> *"Did I use any AI tools while building this?*
>
> *Yes, I leveraged AI as a pair programmer during development. Specifically:*
> - *How it helped: It helped scaffold repetitive boilerplate for Go struct definitions, Gin routing setup, and CSS glassmorphism styles, which allowed me to focus deeply on the system architecture, WebSocket concurrency, and Redis atomic operations.*
> - *Where it required human care: AI often defaults to simple REST polling or storing everything in a single database rather than utilizing Redis Pub/Sub correctly. I had to architect the exact Pub/Sub channel subscription model and ensure server-side validation and anti-duplicate logic were strictly enforced."*

### 5. Conclusion (4:15 - 4:45)
> *"Thank you for reviewing my project! The live deployed link and GitHub repository are included in the email. Looking forward to the technical interview rounds!"*

---

## ✉️ Submission Email Format

**To**: `devhiring@hclguvi.com`  
**Subject**: `Internship: Developer Task Submission - Live Polling Tool - [Your Name]`

**Body**:
```text
Dear GUVI HCL Hiring Team,

I have completed the Live Polling Tool internship task according to all specified requirements.

1. GitHub Repository: https://github.com/[your-username]/live-polling-app
2. Live Deployed Link: https://course-test-franchise-carry.trycloudflare.com
3. Walkthrough Video (3-5 min): [Paste YouTube unlisted or Google Drive link]

Key Stack Highlights:
- Frontend: React (Vite) with responsive glassmorphic UI, live animated gauges, and QR code sharing.
- Backend: Go (Gin) with strict server-side validation and Gorilla WebSocket hub.
- Realtime: Redis driving atomic increments (HINCRBY) and Pub/Sub event broadcasting.
- Database: MongoDB for durable user identity, poll schemas, and duplicate-vote audit logs.

Thank you, and I look forward to discussing the project further!

Best regards,
[Your Name]
[Your Phone Number]
[Your LinkedIn Profile]
```
