import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { RoomManager } from './gameState.js';
import { executeTests } from './executor.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const roomManager = new RoomManager();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', activeRooms: roomManager.rooms.size });
});

// REST endpoint to inspect room status
app.get('/api/rooms/:roomId', (req, res) => {
  const room = roomManager.getRoom(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room.getPublicState());
});

// Helper function to broadcast state to room and send private roles
function broadcastRoomState(room) {
  const publicState = room.getPublicState();
  io.to(room.roomId).emit('game_state_sync', publicState);

  // Send private role to each connected player
  room.players.forEach(p => {
    if (p.socketId) {
      io.to(p.socketId).emit('private_role', {
        role: p.role,
        isAlive: p.isAlive,
        playerId: p.id
      });
    }
  });
}

io.on('connection', (socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);

  // Create a new room with 15s NPC auto-fill timer
  socket.on('create_room', ({ name, challengeId = 'auth', durationSeconds = 480 }, callback) => {
    try {
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const playerId = `usr-${socket.id.substring(0, 5)}`;
      
      const hostPlayer = {
        id: playerId,
        name: name || 'Lead Engineer',
        socketId: socket.id
      };

      const room = roomManager.createRoom(roomId, hostPlayer, challengeId, io);
      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.playerId = playerId;

      room.onStateChange(() => {
        broadcastRoomState(room);
      });

      console.log(`[Room Created] ${roomId} by ${hostPlayer.name}`);

      if (typeof callback === 'function') {
        callback({ success: true, roomId, player: hostPlayer });
      }

      broadcastRoomState(room);
    } catch (err) {
      console.error('[create_room error]', err);
      if (typeof callback === 'function') {
        callback({ success: false, error: err.message });
      }
    }
  });

  // Quick Match: Join existing open room or create a new public room
  socket.on('quick_match', ({ name, challengeId = 'auth' }, callback) => {
    try {
      let room = roomManager.findOpenRoom();
      const playerId = `usr-${socket.id.substring(0, 5)}`;

      if (room) {
        const player = {
          id: playerId,
          name: name || `Engineer ${room.players.length + 1}`,
          socketId: socket.id
        };
        room.addPlayer(player);
        socket.join(room.roomId);
        socket.data.roomId = room.roomId;
        socket.data.playerId = playerId;

        console.log(`[Quick Match Joined] ${player.name} joined ${room.roomId}`);
        if (typeof callback === 'function') {
          callback({ success: true, roomId: room.roomId, player });
        }
        broadcastRoomState(room);
      } else {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const hostPlayer = {
          id: playerId,
          name: name || 'Lead Engineer',
          socketId: socket.id
        };
        const newRoom = roomManager.createRoom(roomId, hostPlayer, challengeId, io);
        socket.join(roomId);
        socket.data.roomId = roomId;
        socket.data.playerId = playerId;

        newRoom.onStateChange(() => {
          broadcastRoomState(newRoom);
        });

        console.log(`[Quick Match Created] ${roomId} by ${hostPlayer.name}`);
        if (typeof callback === 'function') {
          callback({ success: true, roomId, player: hostPlayer });
        }
        broadcastRoomState(newRoom);
      }
    } catch (err) {
      console.error('[quick_match error]', err);
      if (typeof callback === 'function') {
        callback({ success: false, error: err.message });
      }
    }
  });

  // Join existing room
  socket.on('join_room', ({ roomId, name }, callback) => {
    try {
      const cleanRoomId = (roomId || '').trim().toUpperCase();
      const room = roomManager.getRoom(cleanRoomId);
      if (!room) {
        if (typeof callback === 'function') {
          return callback({ success: false, error: 'Room does not exist' });
        }
        return;
      }

      const playerId = `usr-${socket.id.substring(0, 5)}`;
      const player = {
        id: playerId,
        name: name || `Engineer ${room.players.length + 1}`,
        socketId: socket.id
      };

      room.addPlayer(player);
      socket.join(cleanRoomId);
      socket.data.roomId = cleanRoomId;
      socket.data.playerId = playerId;

      console.log(`[Player Joined] ${player.name} joined room ${cleanRoomId}`);

      if (typeof callback === 'function') {
        callback({ success: true, roomId: cleanRoomId, player });
      }

      broadcastRoomState(room);
    } catch (err) {
      console.error('[join_room error]', err);
      if (typeof callback === 'function') {
        callback({ success: false, error: err.message });
      }
    }
  });

  // Manually add NPC teammate to room
  socket.on('add_npc', ({ roomId }) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;
    room.addNpcManual();
    broadcastRoomState(room);
  });

  // Switch challenge
  socket.on('select_challenge', ({ roomId, challengeId }) => {
    const room = roomManager.getRoom(roomId);
    if (!room || room.hostId !== socket.data.playerId) return;
    room.setChallenge(challengeId);
    broadcastRoomState(room);
  });

  // Start game
  socket.on('start_game', ({ roomId, durationSeconds = 480 }) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;
    console.log(`[Game Starting] Room ${roomId} for ${room.players.length} players`);
    room.startGame(durationSeconds);
    broadcastRoomState(room);
  });

  // Collaborative code editing (100% anonymous & smooth)
  socket.on('code_change', ({ roomId, fileName, content }) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    room.updateFileContent(fileName, content, socket.data.playerId);
    
    // Broadcast live code update ONLY to all other room members, keeping edits anonymous
    socket.to(roomId).emit('code_updated', {
      fileName,
      content
    });
  });

  // Run test suite
  socket.on('run_tests', async ({ roomId, fileName, code }, callback) => {
    const room = roomManager.getRoom(roomId);
    if (!room) {
      if (typeof callback === 'function') callback({ success: false, error: 'Room not found' });
      return;
    }

    const playerId = socket.data.playerId;
    const player = room.players.find(p => p.id === playerId);
    const playerName = player ? player.name : 'A Teammate';

    console.log(`[Running Tests] Room ${roomId} triggered by ${playerName}`);

    // If code was provided with this test run, update the codebase and broadcast to the team
    const targetFileName = fileName ||
      (room.codebase.files.find(f => !f.readOnly)?.name) ||
      (room.codebase.files[0]?.name) ||
      'auth.js';

    let userCode = code;

    if (userCode !== undefined && userCode !== null && targetFileName) {
      room.updateFileContent(targetFileName, userCode, playerId);
      // Synchronize the newly tested code to all teammates in the room
      io.to(roomId).emit('code_updated', {
        fileName: targetFileName,
        content: userCode
      });
    } else {
      const primaryFile = room.codebase.files.find(f => f.name === targetFileName) ||
        room.codebase.files.find(f => !f.readOnly) ||
        room.codebase.files[0];
      userCode = primaryFile ? primaryFile.content : '';
    }

    const testCode = room.challenge.testCode;

    // Notify ALL room members: who is running tests, on which file
    io.to(roomId).emit('test_run_started', {
      ranBy: playerName,
      playerId,
      fileName: targetFileName,
      timestamp: Date.now()
    });

    // Broadcast the new code to all teammates immediately so they see the update
    if (userCode !== undefined && userCode !== null) {
      io.to(roomId).emit('code_committed', {
        fileName: targetFileName,
        content: userCode,
        committedBy: playerName,
        playerId,
        timestamp: Date.now()
      });
    }

    try {
      const execResult = await executeTests({
        code: userCode,
        testCode,
        ranBy: 'Anonymous Teammate'
      });

      room.setTestResults(execResult.results, playerId);
      broadcastRoomState(room);

      // Notify room of who ran tests and the outcome
      const passed = execResult.passedCount;
      const total = execResult.totalCount;
      io.to(roomId).emit('test_run_complete', {
        ranBy: playerName,
        playerId,
        fileName: targetFileName,
        passedCount: passed,
        totalCount: total,
        allPassed: execResult.allPassed,
        timestamp: Date.now()
      });

      if (typeof callback === 'function') {
        callback({ success: true, results: execResult });
      }
    } catch (err) {
      console.error('[run_tests error]', err);
      const errorResult = [
        {
          testName: 'Execution Suite Error',
          passed: false,
          output: err.message || 'Fatal execution error',
          ranBy: playerName
        }
      ];
      room.setTestResults(errorResult, playerId);
      broadcastRoomState(room);
      io.to(roomId).emit('test_run_complete', {
        ranBy: playerName,
        playerId,
        fileName: targetFileName,
        passedCount: 0,
        totalCount: 1,
        allPassed: false,
        timestamp: Date.now()
      });
      if (typeof callback === 'function') {
        callback({ success: false, error: err.message });
      }
    }
  });

  // Call Standup Meeting
  socket.on('call_standup', ({ roomId, reason }) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;
    const player = room.players.find(p => p.id === socket.data.playerId);
    const callerName = player ? player.name : 'Teammate';
    room.callStandup(reason || `Emergency Standup called by ${callerName}`);
    broadcastRoomState(room);
  });

  // Cast vote during standup
  socket.on('cast_vote', ({ roomId, targetId }) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;
    room.castVote(socket.data.playerId, targetId);
    broadcastRoomState(room);
  });

  // Reset back to lobby for next round
  socket.on('reset_to_lobby', ({ roomId }) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;
    room.resetToLobby();
    broadcastRoomState(room);
  });

  // Player disconnect
  socket.on('disconnect', () => {
    console.log(`[Socket Disconnected] ID: ${socket.id}`);
    const roomId = socket.data.roomId;
    if (roomId) {
      const room = roomManager.getRoom(roomId);
      if (room) {
        room.removePlayer(socket.id);
        if (room.players.filter(p => !p.isNpc).length === 0) {
          // If all humans left, clean up after 1 minute
          setTimeout(() => {
            const r = roomManager.getRoom(roomId);
            if (r && r.players.filter(p => !p.isNpc).length === 0) {
              roomManager.removeRoom(roomId);
              console.log(`[Room Cleaned Up] ${roomId}`);
            }
          }, 60000);
        } else {
          broadcastRoomState(room);
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(`  CODEBREACH GAME SERVER ACTIVE ON PORT ${PORT} `);
  console.log(`=============================================`);
});
