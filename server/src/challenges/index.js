import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readFile(relPath) {
  return fs.readFileSync(path.join(__dirname, relPath), 'utf-8');
}

export const CHALLENGES = {
  auth: {
    id: 'auth',
    title: 'Project Nimbus — Session & Auth Gateway',
    difficulty: 'Medium',
    incidentReport: `## INCIDENT BRIEFING: #NIM-4091 (SEV-1 CRITICAL)
**Target System:** Nimbus Identity & Access Gateway (\`auth.js\`)
**Reported by:** SecOps & Incident Response Team

Our primary auth cluster collapsed after the previous engineering shift abandoned the project.
Automated compliance checks are failing across 4 key vectors:
1. Session expiration edge condition is allowing expired tokens to leak.
2. Bad authentication requests are returning erroneous HTTP 400 instead of 401 Unauthorized.
3. Guest visitors with unassigned permissions cause unhandled TypeError crashes.
4. Session signature generator produces truncated hashes that fail cryptographic verification.

**Your Objective:** Review the failing test suite, repair the auth logic, and deploy the fix before Nimbus loses certification. Watch your commits — someone on the team may be secretly preventing tests from passing!`,
    defaultFile: 'auth.js',
    testFile: 'auth.test.js',
    files: [
      {
        name: 'auth.js',
        content: readFile('./auth/auth.js'),
        initialContent: readFile('./auth/auth.js'),
        language: 'javascript'
      },
      {
        name: 'auth.test.js',
        content: readFile('./auth/auth.test.js'),
        initialContent: readFile('./auth/auth.test.js'),
        language: 'javascript',
        readOnly: true
      }
    ],
    testCode: readFile('./auth/auth.test.js')
  },

  pipeline: {
    id: 'pipeline',
    title: 'Project Nimbus — Real-Time Telemetry Pipeline',
    difficulty: 'Hard',
    incidentReport: `## INCIDENT BRIEFING: #NIM-5204 (SEV-1 CRITICAL)
**Target System:** Nimbus Ingestion Stream (\`pipeline.js\`)
**Reported by:** Platform Reliability Operations

Production telemetry processing is silently misordering urgent system failures.
On-call engineers are inundated with low-severity noise while Sev-1 alerts are dropped:
1. Alert priority sorting comparator returns inverted or erratic sort order.
2. Metrics aggregation crash during batch reduce accumulator initialization.
3. Filter condition for urgent escalations triggers false alarms on benign warnings.
4. Empty metric batches trigger division by zero producing NaN metrics.

**Your Objective:** Restore proper queue ordering, fix the metric aggregation pipeline, and pass all verification tests before the stream overflows.`,
    defaultFile: 'pipeline.js',
    testFile: 'pipeline.test.js',
    files: [
      {
        name: 'pipeline.js',
        content: readFile('./pipeline/pipeline.js'),
        initialContent: readFile('./pipeline/pipeline.js'),
        language: 'javascript'
      },
      {
        name: 'pipeline.test.js',
        content: readFile('./pipeline/pipeline.test.js'),
        initialContent: readFile('./pipeline/pipeline.test.js'),
        language: 'javascript',
        readOnly: true
      }
    ],
    testCode: readFile('./pipeline/pipeline.test.js')
  }
};

export function getChallenge(id = 'auth') {
  const challenge = CHALLENGES[id] || CHALLENGES.auth;
  // Return a fresh clone of files
  return {
    ...challenge,
    files: challenge.files.map(f => ({ ...f }))
  };
}
