# 🛡️ CodeBreach — Trust No Commit

> *"Among Us, but the sabotage is real code, and the task is actually debugging it."*

**CodeBreach** is a full-stack multiplayer social-deduction game built around real collaborative debugging. Players are dropped into a shared, intentionally broken codebase and must work together to fix it before a timer runs out — except one player among them is secretly a **Saboteur**, quietly working to keep the code broken instead of fixing it.

---

## 📖 The Story: Project Nimbus Incident

Your team has just inherited a live production codebase from a startup that collapsed overnight. Nobody knows why the company failed — was it just bad engineering, or did someone sabotage the code on purpose before they left? You have one shift to find out: fix the system, ship working code, and root out the saboteur before they finish the job.

The twist: one of your own teammates in the room is the saboteur, planted by the story and unknown to the group — sitting in the same lobby, appearing to help debug while quietly making things worse.

---

## 🎭 The Two Roles

| Role | Count | Objectives | Win Conditions |
| :--- | :--- | :--- | :--- |
| 🛡️ **Engineer** | Majority (e.g. 3-4) | Race to fix bugs, pass all tests in the suite, review teammate edits. | **Wins if:** All tests pass **OR** the Saboteur is voted out during Standup. |
| 🪲 **Saboteur** | Minority (1 player) | Secretly keep the code broken, introduce subtle regressions, misdirect discussion. | **Wins if:** Shift timer expires with tests failing, and they were never caught. |

---

## ⏱️ Anatomy of a Round (The 6 Narrative Beats)

1. **Onboarding (~30s):** Players join a room via a 6-character code, enter a name, and are secretly assigned their confidential personnel role via a private dossier modal.
2. **The Handoff (Game Start):** The team receives the Sev-1 incident report, loading the shared repository and failing verification test suite.
3. **The Work Session (Main Timer):** Anyone can edit the shared codebase in real-time via Monaco Editor and run the test suite at any time. Engineers narrate their reasoning out loud, which the Saboteur uses as cover.
4. **The Standup (Mid-Game Vote):** An emergency pause for discussion. Players review recent commits, accuse suspects, and vote out who looks most suspicious. The accused player's true role is revealed!
5. **The Deadline (Final Stretch):** The countdown timer enters critical mode (< 90s), with flashing alarms as tests get closer to (or further from) passing.
6. **The Postmortem (End Screen):** Reveals every player's true role, an audit timeline of who modified what and when, and declares the winner with victory celebration!

---

## 🏗️ System Architecture & Data Model

### Architecture
```
┌─────────────────────────┐       WebSocket       ┌─────────────────────────┐        REST       ┌─────────────────────────┐
│   Client (React + Vite) │ ◄───────────────────► │  Server (Node + Express)│ ◄───────────────► │     Code Execution      │
│                         │                       │                         │                   │                         │
│ • Lobby / Room UI       │                       │ • Room / Lobby Manager  │                   │ • Sandboxed Node.js VM  │
│ • Monaco Code Editor    │                       │ • Role Assignment Logic │                   │   (Zero setup, instant) │
│ • Role Reveal Screen    │                       │ • Timer + Vote Tally    │                   │ • Piston / Judge0 API   │
│ • Voting UI (Standup)   │                       │ • Win-Condition Checker │                   │   (Configurable)        │
│ • Postmortem Screen     │                       │ • In-Memory Game State  │                   │ • Jest Assertion Runner │
│ • Web Audio Synthesizer │                       │ • Socket.io Server      │                   │                         │
└─────────────────────────┘                       └─────────────────────────┘                   └─────────────────────────┘
                                                              │
                                                              ▼
                                                  ┌─────────────────────────┐
                                                  │ Bundled Incident Repo   │
                                                  │ • auth.js + tests.js    │
                                                  │ • pipeline.js + tests.js│
                                                  └─────────────────────────┘
```

### Data Model & Props Map
- **`Player`**: `{ id, name, role: "engineer" | "saboteur", isAlive, lastEdit: { file, ts } }`
- **`GameState`**: `{ roomId, phase: "lobby"|"handoff"|"work"|"standup"|"deadline"|"end", timer, players[], codebase: { files[] }, testResults[], votes{}, winner }`
- **`TestResult`**: `{ testName, passed, output, ranBy }`

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation

```bash
# 1. Clone repository and navigate to root
cd C:\Users\MALLHAR\.gemini\antigravity-ide\scratch\codebreach

# 2. Install dependencies
cd server && npm install
cd ../client && npm install
```

### Running Locally

```bash
# Start backend server (Port 3001)
cd server
npm run dev

# In a separate terminal, start frontend client (Port 5173)
cd client
npm run dev
```

Open **`http://localhost:5173`** in two or more browser windows (or tabs) to play multiplayer!

---

## 🧪 Built-In Incident Scenarios

1. **Project Nimbus — Session & Auth Gateway (`auth.js` / `auth.test.js`)**
   - *Bug 1:* Off-by-one token expiration condition (`>` vs `>=`).
   - *Bug 2:* Erroneous HTTP 400 response on failed credentials instead of 401 Unauthorized.
   - *Bug 3:* Unhandled `null` permissions on guest accounts throwing `TypeError`.
   - *Bug 4:* Signature hash generator truncating hex output by 1 char.

2. **Project Nimbus — Real-Time Telemetry Pipeline (`pipeline.js` / `pipeline.test.js`)**
   - *Bug 1:* Priority comparator returning boolean instead of numeric difference `(b - a)`.
   - *Bug 2:* Reduce initial accumulator starting at `0` instead of `{}`.
   - *Bug 3:* Critical alert filter condition using `||` instead of `&&`.
   - *Bug 4:* Empty telemetry batch triggering division by zero `NaN`.

---

## 🏆 Why CodeBreach Wins
- **It's a genuine game, not another dashboard:** Stands out instantly against typical CRUD apps.
- **Narrative-justified mechanics:** Monaco Editor, Jest test runner, standup voting, and commit timeline all naturally map to software engineering rituals.
- **Demo-ready:** Anyone can pick it up in 10 seconds; live audience can participate by joining the room code.
