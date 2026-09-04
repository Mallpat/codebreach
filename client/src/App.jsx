import React, { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import { Navbar } from './components/Navbar';
import { LobbyScreen } from './components/LobbyScreen';
import { EditorScreen } from './components/EditorScreen';
import { VotingPanel } from './components/VotingPanel';
import { PostmortemScreen } from './components/PostmortemScreen';
import { RoleRevealModal } from './components/RoleRevealModal';
import { HandoffScreen } from './components/HandoffScreen';
import { 
  Shield, 
  Bug, 
  Terminal, 
  ArrowRight, 
  Sparkles, 
  Users, 
  Code2, 
  Radio,
  Flame,
  Zap
} from 'lucide-react';
import { sound } from './utils/audio';

export default function App() {
  const {
    connected,
    gameState,
    myRole,
    myId,
    myName,
    isTesting,
    testNotification,
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
  } = useSocket();

  // Landing form state
  const [nameInput, setNameInput] = useState(localStorage.getItem('codebreach_name') || '');
  const [roomInput, setRoomInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleQuickMatch = async (e) => {
    e?.preventDefault();
    if (!nameInput.trim()) {
      setErrorMessage('Please enter your developer callsign / name');
      return;
    }
    setErrorMessage('');
    setIsMatching(true);
    const res = await quickMatch({ name: nameInput.trim() });
    setIsMatching(false);
    if (!res.success) {
      setErrorMessage(res.error || 'Matchmaking failed');
    }
  };

  // Role reveal modal auto-triggers when role is first assigned
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [hasSeenRoleModalForRound, setHasSeenRoleModalForRound] = useState(false);

  // Check URL query parameters for direct room join link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setRoomInput(roomParam.toUpperCase());
    }
  }, []);

  // Show role modal when game starts and role is received
  useEffect(() => {
    if (gameState?.phase !== 'lobby' && myRole && !hasSeenRoleModalForRound) {
      setShowRoleModal(true);
      setHasSeenRoleModalForRound(true);
      sound.playRoleReveal();
    } else if (gameState?.phase === 'lobby') {
      setHasSeenRoleModalForRound(false);
    }
  }, [gameState?.phase, myRole, hasSeenRoleModalForRound]);

  const handleCreateRoom = async (e) => {
    e?.preventDefault();
    if (!nameInput.trim()) {
      setErrorMessage('Please enter your developer callsign / name');
      return;
    }
    setErrorMessage('');
    setIsCreating(true);
    const res = await createRoom({ name: nameInput.trim() });
    setIsCreating(false);
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to create room');
    }
  };

  const handleJoinRoom = async (e) => {
    e?.preventDefault();
    if (!nameInput.trim() || !roomInput.trim()) {
      setErrorMessage('Please enter both your name and room code');
      return;
    }
    setErrorMessage('');
    setIsJoining(true);
    const res = await joinRoom({
      name: nameInput.trim(),
      roomId: roomInput.trim().toUpperCase()
    });
    setIsJoining(false);
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to join room');
    }
  };

  // If connected to a room, render active game screen
  if (gameState) {
    const isHost = gameState.hostId === myId;

    return (
      <div className="min-h-screen flex flex-col bg-[#07080e] text-slate-100 relative overflow-x-hidden">
        {/* Ambient Background Energy Orbs for Glassmorphism */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-rose-600/12 blur-3xl animate-float-ambient" />
          <div className="absolute top-1/2 -right-32 w-96 h-96 rounded-full bg-cyan-500/12 blur-3xl animate-pulse-glow" />
          <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-indigo-600/12 blur-3xl" />
        </div>

        <div className="relative z-10 flex-1 flex flex-col">
          <Navbar 
            gameState={gameState} 
            myRole={myRole} 
            myPlayerName={myName} 
          />

          {/* Global Test Notification Banner */}
          {testNotification && (
            <div className="glass-panel border-b border-cyan-500/40 px-4 py-2 text-center text-xs font-mono text-cyan-300 flex items-center justify-center gap-2 animate-pulse glow-cyan">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <span>{testNotification}</span>
            </div>
          )}

        <main className="flex-1 flex flex-col">
          {/* Phase 1: Lobby Screen */}
          {gameState.phase === 'lobby' && (
            <LobbyScreen
              roomId={gameState.roomId}
              players={gameState.players}
              onJoin={(name, code) => joinRoom({ name, roomId: code })}
              onStart={(duration) => startGame(duration)}
              myId={myId}
              isHost={isHost}
              challengeId={gameState.challengeId}
              onSelectChallenge={selectChallenge}
              autoFillCountdown={gameState.autoFillCountdown}
              onAddNpc={addNpc}
            />
          )}

          {/* Phase 2: The Handoff Screen */}
          {gameState.phase === 'handoff' && (
            <HandoffScreen
              incidentReport={gameState.incidentReport}
              timer={gameState.timer}
              challengeTitle={gameState.challengeTitle}
              onSkip={() => startGame(gameState.timer)}
            />
          )}

          {/* Phase 3 & 5: Work Session & Deadline Screen */}
          {(gameState.phase === 'work' || gameState.phase === 'deadline') && (
            <EditorScreen
              codebase={gameState.codebase}
              testResults={gameState.testResults}
              timer={gameState.timer}
              myRole={myRole}
              onRunTests={runTests}
              onCodeChange={sendCodeChange}
              onCallStandup={callStandup}
              players={gameState.players}
              myId={myId}
              phase={gameState.phase}
              isTesting={isTesting}
            />
          )}

          {/* Phase 4: The Standup Voting Overlay */}
          {gameState.phase === 'standup' && (
            <>
              {/* Keep editor in background */}
              <EditorScreen
                codebase={gameState.codebase}
                testResults={gameState.testResults}
                timer={gameState.timer}
                myRole={myRole}
                onRunTests={runTests}
                onCodeChange={sendCodeChange}
                onCallStandup={callStandup}
                players={gameState.players}
                myId={myId}
                phase={gameState.phase}
                isTesting={isTesting}
              />
              <VotingPanel
                players={gameState.players}
                votes={gameState.votes}
                myId={myId}
                onVote={castVote}
                timer={gameState.timer}
                standupReason={gameState.standupReason}
              />
            </>
          )}

          {/* Phase 6: Postmortem Screen */}
          {gameState.phase === 'end' && (
            <PostmortemScreen
              players={gameState.players}
              winner={gameState.winner}
              winReason={gameState.winReason}
              editTimeline={gameState.editTimeline}
              standupHistory={gameState.standupHistory}
              onPlayAgain={resetToLobby}
            />
          )}
        </main>

        {/* Role Reveal Modal (Anatomy beat 1: Onboarding) */}
        {showRoleModal && (
          <RoleRevealModal
            role={myRole}
            onClose={() => setShowRoleModal(false)}
          />
        )}
        </div>
      </div>
    );
  }

  // Not in a room yet: Render High-Aesthetic Landing Page
  return (
    <div className="min-h-screen bg-[#07080d] text-slate-100 flex flex-col justify-between selection:bg-rose-500/30 selection:text-rose-200 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[30rem] h-[30rem] rounded-full bg-rose-600/20 blur-3xl animate-float-ambient" />
        <div className="absolute top-1/3 -right-40 w-[30rem] h-[30rem] rounded-full bg-indigo-600/20 blur-3xl animate-pulse-glow" />
        <div className="absolute -bottom-40 left-1/3 w-[30rem] h-[30rem] rounded-full bg-cyan-600/20 blur-3xl animate-float-ambient" />
      </div>

      {/* Landing Header */}
      <header className="relative z-10 px-6 py-6 max-w-7xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-rose-500/30">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-heading font-black text-xl tracking-wider text-white">CODE<span className="text-rose-500">BREACH</span></span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 ml-2">v1.0</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span>{connected ? 'Cluster Gateway Online' : 'Connecting to Gateway...'}</span>
        </div>
      </header>

      {/* Main Landing Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left: Narrative & Pitch (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono glow-rose">
              <Terminal className="w-3.5 h-3.5" />
              <span>THE REAL-TIME MULTIPLAYER SOCIAL DEDUCTION GAME</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black font-heading tracking-tight text-white leading-[1.1]">
              Among Us, but the sabotage is <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-pink-400 to-indigo-400">real code</span>.
            </h1>

            <p className="text-base sm:text-lg text-slate-300 font-light leading-relaxed max-w-xl">
              Your team just inherited a collapsed startup codebase. Everyone sees the same broken repository and failing test suite.
              Fix the bugs to save production — before the secret <strong className="text-rose-400 font-semibold">Saboteur</strong> on your team finishes the job.
            </p>

            {/* Feature Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 font-mono text-xs">
              <div className="p-3.5 rounded-xl glass-card-interactive flex items-center gap-2.5">
                <Code2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Real Monaco IDE</span>
              </div>
              <div className="p-3.5 rounded-xl glass-card-interactive flex items-center gap-2.5">
                <Flame className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Live Test Suite</span>
              </div>
              <div className="p-3.5 rounded-xl glass-card-interactive flex items-center gap-2.5">
                <Users className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Standup Voting</span>
              </div>
            </div>
          </div>

          {/* Right: Join / Create Gateway Portal (5 cols) */}
          <div className="lg:col-span-5">
            <div className="glass-panel-glow rounded-3xl p-8 border-cyan-500/40 shadow-2xl relative">
              <h2 className="font-heading font-black text-2xl text-white mb-2">
                Developer Terminal
              </h2>
              <p className="text-xs text-slate-400 font-mono mb-6">
                Enter your engineering callsign to initiate or join an incident shift.
              </p>

              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs font-mono">
                  {errorMessage}
                </div>
              )}

              <div className="space-y-4">
                {/* Callsign Input */}
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-300 mb-1.5">
                    Engineer Name / Callsign
                  </label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="e.g. Alex (Staff Engineer)"
                    maxLength={24}
                    className="w-full px-4 py-3 rounded-xl glass-input font-mono text-sm text-white focus:outline-none transition-colors"
                  />
                </div>

                {/* Quick Match Action */}
                <button
                  onClick={handleQuickMatch}
                  disabled={isMatching}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-heading font-black text-sm tracking-wider uppercase shadow-xl hover:shadow-cyan-500/25 transition-all cursor-pointer flex items-center justify-center gap-2.5 group"
                >
                  <Zap className="w-4 h-4 text-amber-300 fill-amber-300 group-hover:scale-125 transition-transform" />
                  <span>{isMatching ? 'FINDING SQUAD...' : '⚡ QUICK MATCH (15s Auto-Fill)'}</span>
                </button>

                {/* Create Room Action */}
                <button
                  onClick={handleCreateRoom}
                  disabled={isCreating}
                  className="w-full py-3 rounded-xl bg-slate-900/90 hover:bg-slate-850 text-slate-200 hover:text-white border border-slate-700 hover:border-slate-600 font-heading font-bold text-xs tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-2 group"
                >
                  <Sparkles className="w-3.5 h-3.5 text-rose-400 group-hover:rotate-12 transition-transform" />
                  <span>{isCreating ? 'CREATING ROOM...' : 'CREATE PRIVATE INCIDENT ROOM'}</span>
                </button>

                {/* Divider */}
                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-mono">
                    <span className="bg-[#0f1420] px-3 text-slate-500">OR ENTER ROOM CODE</span>
                  </div>
                </div>

                {/* Join Room Action */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={roomInput}
                      onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                      placeholder="ROOM CODE"
                      maxLength={6}
                      className="flex-1 px-4 py-3 rounded-xl glass-input font-mono uppercase tracking-widest text-sm text-white focus:outline-none transition-colors"
                    />
                    <button
                      onClick={handleJoinRoom}
                      disabled={isJoining}
                      className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono font-bold text-xs border border-slate-600 hover:border-slate-500 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>JOIN</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Landing Footer */}
      <footer className="relative z-10 px-6 py-6 max-w-7xl mx-auto w-full text-center text-xs font-mono text-slate-500 border-t border-slate-900">
        CodeBreach • Collaborative Debugging Social Deduction • Project Nimbus Incident Takeover
      </footer>
    </div>
  );
}
