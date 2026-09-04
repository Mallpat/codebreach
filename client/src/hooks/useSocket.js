import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { sound } from '../utils/audio';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || (
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://codebreach.onrender.com'
);

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [myId, setMyId] = useState(null);
  const [myName, setMyName] = useState(localStorage.getItem('codebreach_name') || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testNotification, setTestNotification] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected to server, ID:', socket.id);
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected from server');
      setConnected(false);
    });

    socket.on('game_state_sync', (state) => {
      setGameState(state);
    });

    socket.on('code_updated', ({ fileName, content }) => {
      setGameState(prev => {
        if (!prev || !prev.codebase) return prev;
        const updatedFiles = prev.codebase.files.map(f =>
          f.name === fileName ? { ...f, content } : f
        );
        return {
          ...prev,
          codebase: {
            ...prev.codebase,
            files: updatedFiles
          }
        };
      });
    });

    socket.on('private_role', (data) => {
      setMyRole(data.role);
      if (data.playerId) setMyId(data.playerId);
    });

    socket.on('test_run_started', () => {
      setIsTesting(true);
      setTestNotification('Verification test suite executing...');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Update testing state when testResults update
  useEffect(() => {
    if (gameState?.testResults) {
      setIsTesting(false);
      setTestNotification(null);
    }
  }, [gameState?.testResults]);

  const createRoom = useCallback(({ name, challengeId = 'auth', durationSeconds = 480 }) => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve({ success: false, error: 'Socket not ready' });
      localStorage.setItem('codebreach_name', name);
      setMyName(name);

      socketRef.current.emit('create_room', { name, challengeId, durationSeconds }, (res) => {
        if (res.success) {
          setMyId(res.player.id);
          sound.playClick();
        }
        resolve(res);
      });
    });
  }, []);

  const joinRoom = useCallback(({ roomId, name }) => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve({ success: false, error: 'Socket not ready' });
      localStorage.setItem('codebreach_name', name);
      setMyName(name);

      socketRef.current.emit('join_room', { roomId, name }, (res) => {
        if (res.success) {
          setMyId(res.player.id);
          sound.playClick();
        }
        resolve(res);
      });
    });
  }, []);

  const selectChallenge = useCallback((challengeId) => {
    if (socketRef.current && gameState?.roomId) {
      socketRef.current.emit('select_challenge', { roomId: gameState.roomId, challengeId });
      sound.playClick();
    }
  }, [gameState?.roomId]);

  const startGame = useCallback((durationSeconds = 480) => {
    if (socketRef.current && gameState?.roomId) {
      socketRef.current.emit('start_game', { roomId: gameState.roomId, durationSeconds });
      sound.playRoleReveal();
    }
  }, [gameState?.roomId]);

  const sendCodeChange = useCallback((fileName, content) => {
    if (socketRef.current && gameState?.roomId) {
      socketRef.current.emit('code_change', { roomId: gameState.roomId, fileName, content });
    }
  }, [gameState?.roomId]);

  const runTests = useCallback(() => {
    if (socketRef.current && gameState?.roomId) {
      setIsTesting(true);
      sound.playClick();
      socketRef.current.emit('run_tests', { roomId: gameState.roomId }, (res) => {
        setIsTesting(false);
        if (res?.success) {
          const allPassed = res.results?.allPassed;
          if (allPassed) {
            sound.playTestPass();
          } else {
            sound.playTestFail();
          }
        }
      });
    }
  }, [gameState?.roomId]);

  const callStandup = useCallback((reason) => {
    if (socketRef.current && gameState?.roomId) {
      sound.playAlarm();
      socketRef.current.emit('call_standup', { roomId: gameState.roomId, reason });
    }
  }, [gameState?.roomId]);

  const castVote = useCallback((targetId) => {
    if (socketRef.current && gameState?.roomId) {
      sound.playClick();
      socketRef.current.emit('cast_vote', { roomId: gameState.roomId, targetId });
    }
  }, [gameState?.roomId]);

  const quickMatch = useCallback(({ name, challengeId = 'auth' }) => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve({ success: false, error: 'Socket not ready' });
      localStorage.setItem('codebreach_name', name);
      setMyName(name);

      socketRef.current.emit('quick_match', { name, challengeId }, (res) => {
        if (res.success) {
          setMyId(res.player.id);
          sound.playClick();
        }
        resolve(res);
      });
    });
  }, []);

  const addNpc = useCallback(() => {
    if (socketRef.current && gameState?.roomId) {
      sound.playClick();
      socketRef.current.emit('add_npc', { roomId: gameState.roomId });
    }
  }, [gameState?.roomId]);

  const resetToLobby = useCallback(() => {
    if (socketRef.current && gameState?.roomId) {
      sound.playClick();
      socketRef.current.emit('reset_to_lobby', { roomId: gameState.roomId });
    }
  }, [gameState?.roomId]);

  return {
    connected,
    gameState,
    myRole,
    myId,
    myName,
    isTesting,
    testNotification,
    socket: socketRef.current,
    createRoom,
    joinRoom,
    quickMatch,
    addNpc,
    selectChallenge,
    startGame,
    sendCodeChange,
    runTests,
    callStandup,
    castVote,
    resetToLobby
  };
}
