import { getChallenge } from './challenges/index.js';
import { assignRoles } from './roleAssigner.js';

export class RoomManager {
  constructor() {
    /** @type {Map<string, GameState>} */
    this.rooms = new Map();
  }

  createRoom(roomId, hostPlayer, challengeId = 'auth') {
    const room = new GameState(roomId, hostPlayer, challengeId);
    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  removeRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.stopTimer();
      this.rooms.delete(roomId);
    }
  }
}

export class GameState {
  constructor(roomId, hostPlayer, challengeId = 'auth') {
    this.roomId = roomId;
    this.hostId = hostPlayer.id;
    this.phase = 'lobby'; // 'lobby' | 'handoff' | 'work' | 'standup' | 'deadline' | 'end'
    this.timer = 480; // 8 minutes default
    this.initialDuration = 480;
    this.standupTimer = 45; // 45s for standup voting
    this.standupTriggered = false;
    this.challengeId = challengeId;
    
    // Players: { id, name, role, isAlive, lastEdit: { file, ts }, socketId }
    this.players = [
      {
        id: hostPlayer.id,
        name: hostPlayer.name,
        role: 'engineer',
        isAlive: true,
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
  }

  onStateChange(cb) {
    this._onStateChangeCallback = cb;
  }

  _notifyChange() {
    if (this._onStateChangeCallback) {
      this._onStateChangeCallback(this);
    }
  }

  addPlayer(player) {
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
      lastEdit: null,
      socketId: player.socketId || player.id
    };
    this.players.push(newPlayer);
    this._notifyChange();
    return newPlayer;
  }

  removePlayer(socketId) {
    const idx = this.players.findIndex(p => p.socketId === socketId || p.id === socketId);
    if (idx !== -1) {
      const removed = this.players.splice(idx, 1)[0];
      // If host left, elect next player
      if (this.players.length > 0 && this.hostId === removed.id) {
        this.hostId = this.players[0].id;
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

    // Assign roles
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

    // Phase 2: The Handoff (briefing beat) for 6 seconds, then into Work Session
    this.phase = 'handoff';
    this.timer = 6;
    this._notifyChange();

    this.stopTimer();
    this._timerInterval = setInterval(() => {
      this.tick();
    }, 1000);
  }

  tick() {
    if (this.timer > 0) {
      this.timer -= 1;
    }

    // Phase transitions
    if (this.phase === 'handoff' && this.timer <= 0) {
      // Transition to Work Session
      this.phase = 'work';
      this.timer = this.initialDuration;
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
        this.endGame('saboteur', 'Time expired! Production failed to pass tests before the shift ended.');
        return;
      }
    }

    if (this.phase === 'deadline') {
      if (this.timer <= 0) {
        this.endGame('saboteur', 'Deadline reached! Critical tests remain broken.');
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
    this.timer = 45; // 45 seconds to discuss & vote
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

    // If all living players have voted, resolve immediately
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
        this.endGame('engineers', `The Saboteur (${eliminatedPlayer.name}) was discovered and voted out!`);
        return;
      } else {
        // Innocent engineer was eliminated!
        // Check if any engineers remain alive
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
    const ranByName = ranByPlayer ? ranByPlayer.name : 'Unknown';

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
    this._notifyChange();
  }

  resetToLobby() {
    this.stopTimer();
    this.phase = 'lobby';
    this.timer = this.initialDuration;
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
  }

  stopTimer() {
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
  }

  /**
   * Serializes game state for broadcast to clients.
   * Keeps roles hidden unless game is in 'end' phase.
   * Each player receives their own role via private message.
   */
  getPublicState() {
    return {
      roomId: this.roomId,
      hostId: this.hostId,
      phase: this.phase,
      timer: this.timer,
      challengeId: this.challengeId,
      challengeTitle: this.challenge?.title || '',
      incidentReport: this.challenge?.incidentReport || '',
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        // Role is only revealed during postmortem end screen!
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
      // Full edit timeline with roles revealed in postmortem
      editTimeline: this.phase === 'end' 
        ? this.editTimeline 
        : this.editTimeline.map(e => ({ ...e, playerRole: undefined }))
    };
  }
}
