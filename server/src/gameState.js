import { getChallenge } from './challenges/index.js';
import { assignRoles } from './roleAssigner.js';
import { NPC_POOL, NpcController } from './npcManager.js';

export class RoomManager {
  constructor() {
    /** @type {Map<string, GameState>} */
    this.rooms = new Map();
  }

  createRoom(roomId, hostPlayer, challengeId = 'auth', io = null) {
    const room = new GameState(roomId, hostPlayer, challengeId, io);
    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  findOpenRoom() {
    for (const room of this.rooms.values()) {
      if (room.phase === 'lobby' && room.players.filter(p => !p.isNpc).length < 4) {
        return room;
      }
    }
    return null;
  }

  removeRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.stopTimer();
      room.stopNpcEngine();
      this.rooms.delete(roomId);
    }
  }
}

export class GameState {
  constructor(roomId, hostPlayer, challengeId = 'auth', io = null) {
    this.roomId = roomId;
    this.hostId = hostPlayer.id;
    this.phase = 'lobby'; // 'lobby' | 'handoff' | 'work' | 'standup' | 'deadline' | 'end'
    this.timer = 480; // 8 minutes default
    this.initialDuration = 480;
    this.standupTimer = 45; // 45s for standup voting
    this.standupTriggered = false;
    this.challengeId = challengeId;
    this.io = io;
    
    // Auto-fill countdown: 15 seconds until intelligent NPCs fill empty slots
    this.autoFillCountdown = 15;

    // Players: { id, name, role, isAlive, isNpc, lastEdit: { file, ts }, socketId }
    this.players = [
      {
        id: hostPlayer.id,
        name: hostPlayer.name,
        role: 'engineer',
        isAlive: true,
        isNpc: false,
        lastEdit: null,
        socketId: hostPlayer.socketId || hostPlayer.id
      }
    ];

    // Load initial challenge codebase files
    const challenge = getChallenge(challengeId);
    this.challenge = challenge;
    this.codebase = {
      files: challenge.files.map(f => ({ ...f }))
    };

    /** @type {Array<{ testName: string, passed: boolean, output: string, ranBy: string }>} */
    this.testResults = [];

    // Votes: { [voterPlayerId]: targetPlayerId }
    this.votes = {};

    this.winner = null; // 'engineers' | 'saboteur' | null
    this.winReason = '';
    
    // Edit timeline for postmortem
    this.editTimeline = [];
    this.standupHistory = [];

    this._timerInterval = null;
    this._onStateChangeCallback = null;

    if (io) {
      this.npcController = new NpcController(this, io);
    }

    // Start 15s matchmaking auto-fill timer immediately upon lobby creation
    this._startLobbyTimer();
  }

  setIo(io) {
    this.io = io;
    if (!this.npcController && io) {
      this.npcController = new NpcController(this, io);
    }
  }

  onStateChange(cb) {
    this._onStateChangeCallback = cb;
  }

  _notifyChange() {
    if (this._onStateChangeCallback) {
      this._onStateChangeCallback(this);
    }
  }

  _startLobbyTimer() {
    this.stopTimer();
    this._timerInterval = setInterval(() => {
      this.tick();
    }, 1000);
  }

  addPlayer(player) {
    // If an NPC is currently in the room and we need room for a human, replace the NPC
    if (this.players.length >= 4 && this.players.some(p => p.isNpc)) {
      const npcIndex = this.players.findIndex(p => p.isNpc);
      if (npcIndex !== -1) {
        this.players.splice(npcIndex, 1);
      }
    }

    // Check if player already exists
    const existing = this.players.find(p => p.id === player.id || p.socketId === player.socketId);
    if (existing) {
      existing.name = player.name;
      existing.socketId = player.socketId;
      return existing;
    }

    const newPlayer = {
      id: player.id,
      name: player.name,
      role: 'engineer',
      isAlive: true,
      isNpc: false,
      lastEdit: null,
      socketId: player.socketId || player.id
    };
    this.players.push(newPlayer);
    this._notifyChange();
    return newPlayer;
  }

  autoFillNpcs() {
    if (this.phase !== 'lobby') return;
    const targetSize = 4;
    const needed = targetSize - this.players.length;
    if (needed <= 0) return;

    for (const npc of NPC_POOL) {
      if (this.players.length >= targetSize) break;
      if (!this.players.some(p => p.id === npc.id)) {
        this.players.push({
          id: npc.id,
          name: npc.name,
          personality: npc.personality,
          role: 'engineer',
          isAlive: true,
          isNpc: true,
          lastEdit: null,
          socketId: null
        });
      }
    }
    this._notifyChange();
  }

  addNpcManual() {
    if (this.phase !== 'lobby') return false;
    if (this.players.length >= 5) return false;

    const available = NPC_POOL.filter(npc => !this.players.some(p => p.id === npc.id));
    if (available.length === 0) return false;

    const npc = available[0];
    this.players.push({
      id: npc.id,
      name: npc.name,
      personality: npc.personality,
      role: 'engineer',
      isAlive: true,
      isNpc: true,
      lastEdit: null,
      socketId: null
    });
    this._notifyChange();
    return true;
  }

  removePlayer(socketId) {
    const idx = this.players.findIndex(p => p.socketId === socketId || p.id === socketId);
    if (idx !== -1) {
      const removed = this.players.splice(idx, 1)[0];
      // If host left, elect next human or player
      if (this.players.length > 0 && this.hostId === removed.id) {
        const human = this.players.find(p => !p.isNpc) || this.players[0];
        this.hostId = human.id;
      }
      this._notifyChange();
      return removed;
    }
    return null;
  }

  setChallenge(challengeId) {
    if (this.phase !== 'lobby') return;
    this.challengeId = challengeId;
    this.challenge = getChallenge(challengeId);
    this.codebase = {
      files: this.challenge.files.map(f => ({ ...f }))
    };
    this._notifyChange();
  }

  startGame(durationSeconds = 480) {
    if (this.phase !== 'lobby') return;

    // Ensure at least 3-4 players for social deduction mechanics
    if (this.players.length < 3) {
      this.autoFillNpcs();
    }

    // Assign roles secretly (1 Saboteur, remainder Engineers)
    this.players = assignRoles(this.players);
    this.initialDuration = durationSeconds;
    this.timer = durationSeconds;
    this.testResults = [];
    this.votes = {};
    this.winner = null;
    this.winReason = '';
    this.editTimeline = [];
    this.standupTriggered = false;

    // Reset codebase to fresh initial challenge
    this.challenge = getChallenge(this.challengeId);
    this.codebase = {
      files: this.challenge.files.map(f => ({ ...f }))
    };

    // Phase 2: The Handoff (briefing beat) for 5 seconds, then into Work Session
    this.phase = 'handoff';
    this.timer = 5;
    this._notifyChange();

    this.stopTimer();
    this._timerInterval = setInterval(() => {
      this.tick();
    }, 1000);
  }

  tick() {
    // 1. Lobby Matchmaking Phase: Count down 15s to auto-fill NPCs if online humans don't join
    if (this.phase === 'lobby') {
      if (this.autoFillCountdown > 0) {
        this.autoFillCountdown -= 1;
        this._notifyChange();
        if (this.autoFillCountdown <= 0) {
          this.autoFillNpcs();
        }
      }
      return;
    }

    // 2. Active Game Phases: Decrement game timer
    if (this.timer > 0) {
      this.timer -= 1;
    }

    // Phase transitions
    if (this.phase === 'handoff' && this.timer <= 0) {
      // Transition to Work Session
      this.phase = 'work';
      this.timer = this.initialDuration;
      // Start autonomous NPC developer/saboteur engine!
      if (this.npcController) {
        this.npcController.start();
      }
      this._notifyChange();
      return;
    }

    if (this.phase === 'work') {
      // Automatically trigger Standup at half-time if not triggered yet
      if (!this.standupTriggered && this.timer <= Math.floor(this.initialDuration / 2)) {
        this.callStandup('Scheduled Mid-Game Standup Meeting');
        return;
      }

      // Check if entering Deadline phase (last 90 seconds)
      if (this.timer <= 90 && this.phase === 'work') {
        this.phase = 'deadline';
        this._notifyChange();
      }

      // Timer expired in work session
      if (this.timer <= 0) {
        this.endGame('saboteur', 'Shift expired! Critical tests remained broken at deadline.');
        return;
      }
    }

    if (this.phase === 'deadline') {
      if (this.timer <= 0) {
        this.endGame('saboteur', 'Deadline reached! The Saboteur successfully prevented deployment.');
        return;
      }
    }

    if (this.phase === 'standup') {
      if (this.timer <= 0) {
        // Standup vote timeout - resolve votes
        this.resolveStandupVotes();
        return;
      }
    }

    this._notifyChange();
  }

  callStandup(reason = 'Emergency Standup Called') {
    if (this.phase !== 'work' && this.phase !== 'deadline') return;
    this.standupTriggered = true;
    this._prevPhase = this.phase;
    this._savedWorkTimer = this.timer;
    this.phase = 'standup';
    this.timer = 40; // 40 seconds to discuss & vote
    this.votes = {};
    this.standupReason = reason;
    this._notifyChange();
  }

  castVote(voterId, targetId) {
    if (this.phase !== 'standup') return;
    const voter = this.players.find(p => p.id === voterId);
    if (!voter || !voter.isAlive) return;

    this.votes[voterId] = targetId;
    this._notifyChange();

    // If all living players (humans + NPCs) have voted, resolve immediately
    const livingPlayers = this.players.filter(p => p.isAlive);
    const votesCount = Object.keys(this.votes).length;
    if (votesCount >= livingPlayers.length) {
      this.resolveStandupVotes();
    }
  }

  resolveStandupVotes() {
    if (this.phase !== 'standup') return;

    // Tally votes
    const tally = {};
    for (const targetId of Object.values(this.votes)) {
      if (targetId && targetId !== 'skip') {
        tally[targetId] = (tally[targetId] || 0) + 1;
      }
    }

    let highestVoteCount = 0;
    let accusedId = null;
    let isTie = false;

    for (const [targetId, count] of Object.entries(tally)) {
      if (count > highestVoteCount) {
        highestVoteCount = count;
        accusedId = targetId;
        isTie = false;
      } else if (count === highestVoteCount) {
        isTie = true;
      }
    }

    const livingPlayers = this.players.filter(p => p.isAlive);
    const requiredVotes = Math.floor(livingPlayers.length / 2) + 1; // Strict majority

    let eliminatedPlayer = null;
    if (accusedId && !isTie && highestVoteCount >= requiredVotes) {
      eliminatedPlayer = this.players.find(p => p.id === accusedId);
    }

    if (eliminatedPlayer) {
      eliminatedPlayer.isAlive = false;
      this.standupHistory.push({
        round: this.standupHistory.length + 1,
        accusedId: eliminatedPlayer.id,
        accusedName: eliminatedPlayer.name,
        role: eliminatedPlayer.role,
        eliminated: true
      });

      // If eliminated player was Saboteur -> Engineers Win!
      if (eliminatedPlayer.role === 'saboteur') {
        this.endGame('engineers', `The Saboteur (${eliminatedPlayer.name}) was unmasked and ejected in Standup!`);
        return;
      } else {
        // Innocent engineer was eliminated!
        const livingEngineers = this.players.filter(p => p.isAlive && p.role === 'engineer');
        if (livingEngineers.length === 0) {
          this.endGame('saboteur', `All engineers have been eliminated! The Saboteur won.`);
          return;
        }
      }
    } else {
      this.standupHistory.push({
        round: this.standupHistory.length + 1,
        accusedId: null,
        accusedName: 'No consensus / Skipped',
        role: null,
        eliminated: false
      });
    }

    // Resume to Work or Deadline phase
    this.phase = (this._savedWorkTimer <= 90) ? 'deadline' : 'work';
    this.timer = this._savedWorkTimer || 180;
    this.votes = {};
    this._notifyChange();
  }

  updateFileContent(fileName, newContent, playerId) {
    if (this.phase !== 'work' && this.phase !== 'deadline') return;
    const player = this.players.find(p => p.id === playerId);
    if (!player || !player.isAlive) return;

    const file = this.codebase.files.find(f => f.name === fileName);
    if (!file || file.readOnly) return;

    const prevContent = file.content;
    file.content = newContent;

    const now = Date.now();
    player.lastEdit = {
      file: fileName,
      ts: now
    };

    // Log to edit timeline
    const lineDiff = (newContent.split('\n').length) - (prevContent.split('\n').length);
    const summary = lineDiff >= 0 
      ? `Modified ${fileName} (+${lineDiff} lines)`
      : `Modified ${fileName} (${lineDiff} lines)`;

    this.editTimeline.push({
      id: `edit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      playerId: player.id,
      playerName: player.name,
      playerRole: player.role,
      isNpc: Boolean(player.isNpc),
      file: fileName,
      timestamp: now,
      summary,
      snippet: newContent.slice(0, 140)
    });

    this._notifyChange();
  }

  setTestResults(results, ranByPlayerId) {
    this.testResults = results;
    const ranByPlayer = this.players.find(p => p.id === ranByPlayerId);
    const ranByName = ranByPlayer ? ranByPlayer.name : 'Teammate';

    // Check win condition: All tests pass
    if (results.length > 0 && results.every(r => r.passed)) {
      this.endGame('engineers', `All tests passed! The codebase was saved before the deadline by ${ranByName}!`);
      return;
    }

    this._notifyChange();
  }

  endGame(winner, reason) {
    this.phase = 'end';
    this.winner = winner;
    this.winReason = reason;
    this.stopTimer();
    this.stopNpcEngine();
    this._notifyChange();
  }

  stopNpcEngine() {
    if (this.npcController) {
      this.npcController.stop();
    }
  }

  resetToLobby() {
    this.stopTimer();
    this.stopNpcEngine();
    this.phase = 'lobby';
    this.timer = this.initialDuration;
    this.autoFillCountdown = 15;
    this.testResults = [];
    this.votes = {};
    this.winner = null;
    this.winReason = '';
    this.editTimeline = [];
    this.standupHistory = [];
    this.standupTriggered = false;
    
    // Reset all players to alive
    this.players.forEach(p => {
      p.isAlive = true;
      p.lastEdit = null;
    });

    const challenge = getChallenge(this.challengeId);
    this.challenge = challenge;
    this.codebase = {
      files: challenge.files.map(f => ({ ...f }))
    };

    this._notifyChange();
    this._startLobbyTimer();
  }

  stopTimer() {
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
  }

  getPublicState() {
    return {
      roomId: this.roomId,
      hostId: this.hostId,
      phase: this.phase,
      timer: this.timer,
      autoFillCountdown: this.autoFillCountdown,
      challengeId: this.challengeId,
      challengeTitle: this.challenge?.title || '',
      incidentReport: this.challenge?.incidentReport || '',
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        isNpc: Boolean(p.isNpc),
        personality: p.personality,
        role: this.phase === 'end' ? p.role : undefined,
        isAlive: p.isAlive,
        lastEdit: p.lastEdit
      })),
      codebase: this.codebase,
      testResults: this.testResults,
      votes: this.votes,
      standupReason: this.standupReason || '',
      standupHistory: this.standupHistory,
      winner: this.winner,
      winReason: this.winReason,
      editTimeline: this.phase === 'end' 
        ? this.editTimeline 
        : this.editTimeline.map(e => ({ ...e, playerRole: undefined }))
    };
  }
}
