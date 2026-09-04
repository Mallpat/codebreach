/**
 * NPC MANAGER & AUTONOMOUS AGENT ENGINE
 * Simulates intelligent developer teammates and saboteurs in CodeBreach.
 * No mock data: operates on real code diffs, real AST/string patterns, real test execution, and real socket events.
 */

export const NPC_POOL = [
  {
    id: 'npc-sarah',
    name: 'Sarah (Infra Eng)',
    title: 'Senior Infrastructure Engineer',
    avatar: 'SR',
    color: 'emerald',
    personality: 'methodical'
  },
  {
    id: 'npc-marcus',
    name: 'Marcus (SecOps)',
    title: 'Security Operations Specialist',
    avatar: 'MC',
    color: 'indigo',
    personality: 'suspicious'
  },
  {
    id: 'npc-elena',
    name: 'Elena (Runtime)',
    title: 'Core Systems & Runtime Dev',
    avatar: 'EL',
    color: 'cyan',
    personality: 'fast-coder'
  },
  {
    id: 'npc-david',
    name: 'David (Staff Dev)',
    title: 'Staff Reliability Architect',
    avatar: 'DV',
    color: 'purple',
    personality: 'cautious'
  }
];

export class NpcController {
  constructor(room, io) {
    this.room = room;
    this.io = io;
    this._actionInterval = null;
  }

  start() {
    this.stop();
    // Schedule periodic autonomous NPC actions every 12-22 seconds
    this._actionInterval = setInterval(() => {
      this.tick();
    }, 14000);
  }

  stop() {
    if (this._actionInterval) {
      clearInterval(this._actionInterval);
      this._actionInterval = null;
    }
  }

  tick() {
    if (!this.room) return;
    const phase = this.room.phase;

    if (phase === 'work' || phase === 'deadline') {
      this.performWorkAction();
    } else if (phase === 'standup') {
      this.performStandupAction();
    }
  }

  /**
   * Autonomous code editing & test execution by NPCs
   */
  async performWorkAction() {
    const livingNpcs = this.room.players.filter(p => p.isNpc && p.isAlive);
    if (livingNpcs.length === 0) return;

    // Pick 1 random living NPC to perform an action
    const actor = livingNpcs[Math.floor(Math.random() * livingNpcs.length)];
    const isSaboteur = actor.role === 'saboteur';

    const file = this.room.codebase.files[0];
    if (!file) return;

    let content = file.content;
    let modified = false;
    let commitSummary = '';

    if (this.room.challengeId === 'auth') {
      if (isSaboteur) {
        // SABOTEUR NPC: inject subtle regression
        if (content.includes('status: 401')) {
          content = content.replace('status: 401', 'status: 400');
          commitSummary = 'Refactored auth error payload specification';
          modified = true;
        } else if (content.includes('>= token.expiresAt')) {
          content = content.replace('>= token.expiresAt', '> token.expiresAt');
          commitSummary = 'Tweaked expiration boundary timestamp';
          modified = true;
        } else if (!content.includes('// REGRESSION: session cache leak')) {
          content = content.replace('return true;', 'if (Math.random() < 0.05) return false;\n  return true;');
          commitSummary = 'Added heartbeat check to session validation';
          modified = true;
        }
      } else {
        // ENGINEER NPC: identify failing tests and apply targeted fix
        if (content.includes('currentTimestamp > token.expiresAt')) {
          content = content.replace('currentTimestamp > token.expiresAt', 'currentTimestamp >= token.expiresAt');
          commitSummary = 'Fixed off-by-one boundary on token expiry';
          modified = true;
        } else if (content.includes('user.permissions.includes(') && !content.includes('user.permissions &&')) {
          content = content.replace('return user.permissions.includes(', 'return Boolean(user.permissions && user.permissions.includes(');
          commitSummary = 'Added safe null check for guest user permissions';
          modified = true;
        } else if (content.includes('return `SIG_${hexHash.slice(0, 7)}`')) {
          content = content.replace('return `SIG_${hexHash.slice(0, 7)}`', 'return `SIG_${hexHash.slice(0, 8)}`');
          commitSummary = 'Corrected HMAC signature hex padding length';
          modified = true;
        } else if (content.includes('status: 400,\n      error: \'Invalid username or password\'')) {
          content = content.replace('status: 400,\n      error: \'Invalid username or password\'', 'status: 401,\n      error: \'Invalid username or password\'');
          commitSummary = 'Updated invalid credentials to return 401 Unauthorized';
          modified = true;
        }
      }
    } else if (this.room.challengeId === 'pipeline') {
      if (isSaboteur) {
        if (content.includes('b.priority - a.priority')) {
          content = content.replace('b.priority - a.priority', 'a.priority > b.priority');
          commitSummary = 'Refactored alert priority comparator';
          modified = true;
        } else if (content.includes('return alerts.filter(alert => alert.priority >= 8 && alert.errorCount >= 5)')) {
          content = content.replace('&& alert.errorCount >= 5', '|| alert.errorCount >= 5');
          commitSummary = 'Broadened alert trigger thresholds';
          modified = true;
        }
      } else {
        if (content.includes('(a, b) => a.priority > b.priority')) {
          content = content.replace('(a, b) => a.priority > b.priority', '(a, b) => b.priority - a.priority');
          commitSummary = 'Fixed priority sort comparator to return numeric difference';
          modified = true;
        } else if (content.includes('}, 0);')) {
          content = content.replace('}, 0);', '}, {});');
          commitSummary = 'Initialized metrics accumulator to empty object {}';
          modified = true;
        } else if (content.includes('priority >= 8 || alert.errorCount >= 5')) {
          content = content.replace('priority >= 8 || alert.errorCount >= 5', 'priority >= 8 && alert.errorCount >= 5');
          commitSummary = 'Fixed urgent filter condition from OR to AND';
          modified = true;
        }
      }
    }

    if (modified) {
      this.room.updateFileContent(file.name, content, actor.id);

      // Broadcast live code change anonymously
      this.io.to(this.room.roomId).emit('code_updated', {
        fileName: file.name,
        content
      });

      // Optionally run tests after commit anonymously
      setTimeout(async () => {
        if (this.room.phase === 'work' || this.room.phase === 'deadline') {
          const { executeTests } = await import('./executor.js');
          const res = await executeTests({
            code: content,
            testCode: this.room.challenge.testCode,
            ranBy: 'Anonymous Teammate'
          });
          this.room.setTestResults(res.results, actor.id);
        }
      }, 2500);
    }
  }

  /**
   * Autonomous deliberation and voting by NPCs during Standup
   */
  performStandupAction() {
    const livingNpcs = this.room.players.filter(p => p.isNpc && p.isAlive);
    const livingPlayers = this.room.players.filter(p => p.isAlive);

    livingNpcs.forEach((npc, index) => {
      // Delay each NPC's vote slightly (5-18 seconds)
      setTimeout(() => {
        if (this.room.phase !== 'standup') return;
        if (this.room.votes[npc.id]) return; // already voted

        let targetId = 'skip';

        if (npc.role === 'saboteur') {
          // Saboteur NPC votes for an innocent human engineer to frame them!
          const humanEngineers = livingPlayers.filter(p => !p.isNpc && p.role === 'engineer');
          if (humanEngineers.length > 0) {
            targetId = humanEngineers[0].id;
          } else {
            targetId = 'skip';
          }
        } else {
          // Engineer NPC looks at recent edit history
          const lastEditor = this.room.editTimeline.slice(-1)[0];
          if (lastEditor && lastEditor.playerId !== npc.id && Math.random() < 0.65) {
            targetId = lastEditor.playerId;
          } else if (Math.random() < 0.4) {
            // Vote for random other player
            const candidates = livingPlayers.filter(p => p.id !== npc.id);
            if (candidates.length > 0) {
              targetId = candidates[Math.floor(Math.random() * candidates.length)].id;
            }
          }
        }

        this.room.castVote(npc.id, targetId);
      }, (index + 1) * 4500 + Math.random() * 3000);
    });
  }
}
