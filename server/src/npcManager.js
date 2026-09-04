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

    // Always operate on the first non-readonly (editable) file
    const file = this.room.codebase.files.find(f => !f.readOnly) || this.room.codebase.files[0];
    if (!file) return;

    let content = file.content;
    let modified = false;
    let commitSummary = '';

    if (this.room.challengeId === 'auth') {
      if (isSaboteur) {
        // SABOTEUR NPC: actively inject regressions that INCREASE ERRORS
        if (content.includes('status: 200,') && !content.includes('status: 204,')) {
          // Sabotage Test 4 (the initially passing test!)
          content = content.replace('status: 200,', 'status: 204,');
          commitSummary = 'Optimized session response status payload';
          modified = true;
        } else if (content.includes('user.passwordHash === `hashed_${password}`')) {
          // Break password verification logic
          content = content.replace('user.passwordHash === `hashed_${password}`', 'user.passwordHash === `salt_${password}`');
          commitSummary = 'Updated password hashing salt prefix';
          modified = true;
        } else if (content.includes('currentTimestamp >= token.expiresAt')) {
          // Revert or break boundary check
          content = content.replace('currentTimestamp >= token.expiresAt', 'currentTimestamp > token.expiresAt + 60000');
          commitSummary = 'Extended token expiry grace window';
          modified = true;
        } else if (content.includes('status: 401')) {
          // Revert 401 back to 400
          content = content.replace(/status:\s*401/g, 'status: 400');
          commitSummary = 'Standardized client error response specification';
          modified = true;
        } else if (content.includes('user.permissions && user.permissions.includes')) {
          // Break safe null check for guests
          content = content.replace('user.permissions && user.permissions.includes(requiredPermission)', 'user.permissions.includes(requiredPermission)');
          commitSummary = 'Simplified permissions array lookup';
          modified = true;
        } else if (content.includes('hexHash.slice(0, 8)')) {
          // Truncate signature
          content = content.replace('hexHash.slice(0, 8)', 'hexHash.slice(0, 6)');
          commitSummary = 'Compact HMAC token signature format';
          modified = true;
        } else if (content.includes('return true;') && !content.includes('// REGRESSION')) {
          // Force active token rejection
          content = content.replace('return true;', '// REGRESSION\n  if (token.issuedAt > 0) return false;\n  return true;');
          commitSummary = 'Added heartbeat check to session validation';
          modified = true;
        }
      } else {
        // ENGINEER NPC: identify failing tests and apply targeted fixes
        if (content.includes('status: 204,')) {
          content = content.replace('status: 204,', 'status: 200,');
          commitSummary = 'Restored HTTP 200 OK for successful authentication';
          modified = true;
        } else if (content.includes('salt_${password}')) {
          content = content.replace('salt_${password}', 'hashed_${password}');
          commitSummary = 'Fixed password verification hash algorithm';
          modified = true;
        } else if (content.includes('currentTimestamp > token.expiresAt')) {
          content = content.replace(/currentTimestamp > token\.expiresAt(\s*\+\s*\d+)?/, 'currentTimestamp >= token.expiresAt');
          commitSummary = 'Fixed off-by-one boundary on token expiry';
          modified = true;
        } else if (content.includes('user.permissions.includes(') && !content.includes('user.permissions &&')) {
          content = content.replace('return user.permissions.includes(', 'return Boolean(user.permissions && user.permissions.includes(');
          commitSummary = 'Added safe null check for guest user permissions';
          modified = true;
        } else if (content.includes('return `SIG_${hexHash.slice(0, 7)}`') || content.includes('return `SIG_${hexHash.slice(0, 6)}`')) {
          content = content.replace(/return `SIG_\${hexHash\.slice\(0,\s*[67]\)}`/, 'return `SIG_${hexHash.slice(0, 8)}`');
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
        // SABOTEUR NPC: actively break tests in pipeline
        if (content.includes('Math.round(metrics.totalLatency / metrics.count)') && !content.includes('* 1.5')) {
          // Sabotage Test 5 (the initially passing test!)
          content = content.replace('metrics.totalLatency / metrics.count', 'metrics.totalLatency / (metrics.count * 1.5)');
          commitSummary = 'Applied weighted latency coefficient calculation';
          modified = true;
        } else if (content.includes('b.priority - a.priority')) {
          content = content.replace('b.priority - a.priority', 'a.priority - b.priority');
          commitSummary = 'Inverted alert priority comparator';
          modified = true;
        } else if (content.includes('}, {});')) {
          content = content.replace('}, {});', '}, []);');
          commitSummary = 'Switched metrics accumulator to array format';
          modified = true;
        } else if (content.includes('priority >= 8 && alert.errorCount >= 5')) {
          content = content.replace('priority >= 8 && alert.errorCount >= 5', 'alert.priority >= 12');
          commitSummary = 'Raised urgent alert escalation threshold';
          modified = true;
        }
      } else {
        if (content.includes('* 1.5')) {
          content = content.replace('metrics.totalLatency / (metrics.count * 1.5)', 'metrics.totalLatency / metrics.count');
          commitSummary = 'Restored standard mean response latency formula';
          modified = true;
        } else if (content.includes('(a, b) => a.priority > b.priority') || content.includes('a.priority - b.priority')) {
          content = content.replace(/\(a,\s*b\)\s*=>\s*(a\.priority > b\.priority|a\.priority - b\.priority)/, '(a, b) => b.priority - a.priority');
          commitSummary = 'Fixed priority sort comparator to return numeric difference';
          modified = true;
        } else if (content.includes('}, 0);') || content.includes('}, []);')) {
          content = content.replace(/},\s*(0|\[\])\);/, '}, {});');
          commitSummary = 'Initialized metrics accumulator to empty object {}';
          modified = true;
        } else if (content.includes('priority >= 8 || alert.errorCount >= 5') || content.includes('alert.priority >= 12')) {
          content = content.replace(/priority >= 8 \|\| alert\.errorCount >= 5|alert\.priority >= 12/, 'alert.priority >= 8 && alert.errorCount >= 5');
          commitSummary = 'Fixed urgent filter condition from OR to AND';
          modified = true;
        } else if (!content.includes('if (!metrics.count || metrics.count === 0)')) {
          content = content.replace(
            'return Math.round(metrics.totalLatency / metrics.count);',
            'if (!metrics.count || metrics.count === 0) return 0;\n  return Math.round(metrics.totalLatency / metrics.count);'
          );
          commitSummary = 'Guarded against division by zero in latency calculator';
          modified = true;
        }
      }
    }

    if (modified) {
      // Notify room of test execution start
      this.io.to(this.room.roomId).emit('test_run_started', { ranBy: 'Anonymous Teammate' });

      // Execute tests on the new code
      const { executeTests } = await import('./executor.js');
      const res = await executeTests({
        code: content,
        testCode: this.room.challenge.testCode,
        ranBy: 'Anonymous Teammate'
      });

      // Update room codebase and broadcast updated code and test results together
      this.room.updateFileContent(file.name, content, actor.id);

      this.io.to(this.room.roomId).emit('code_updated', {
        fileName: file.name,
        content
      });

      this.room.setTestResults(res.results, actor.id);

      // Broadcast full game state so all clients see updated test results & error counts
      const publicState = this.room.getPublicState();
      this.io.to(this.room.roomId).emit('game_state_sync', publicState);
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
