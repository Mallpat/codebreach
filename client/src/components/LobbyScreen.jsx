import React, { useState } from 'react';
import { Shield, Bug, Users, Play, Copy, Check, Terminal, Clock, Sparkles, AlertCircle, Bot, UserPlus, Zap } from 'lucide-react';
import { sound } from '../utils/audio';

export function LobbyScreen({
  roomId,
  players = [],
  onJoin,
  onStart,
  myId,
  isHost,
  challengeId = 'auth',
  onSelectChallenge,
  autoFillCountdown,
  onAddNpc
}) {
  const [nameInput, setNameInput] = useState(localStorage.getItem('codebreach_name') || '');
  const [roomInput, setRoomInput] = useState('');
  const [duration, setDuration] = useState(480); // 8 mins
  const [copied, setCopied] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleCopyCode = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    sound.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinExisting = (e) => {
    e.preventDefault();
    if (!nameInput.trim() || !roomInput.trim()) return;
    setIsJoining(true);
    onJoin(nameInput.trim(), roomInput.trim().toUpperCase());
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Top Hero Banner */}
      <div className="text-center mb-10 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono mb-2 glow-rose">
          <Terminal className="w-3.5 h-3.5" />
          <span>PROJECT NIMBUS DISASTER RECOVERY PROTOCOL</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black font-heading tracking-tight text-white">
          CODE<span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-500">BREACH</span>
        </h1>
        <p className="text-lg text-slate-300 max-w-2xl mx-auto font-light leading-relaxed">
          The collaborative debugging social deduction game.
          <span className="text-rose-400 font-semibold block mt-1">One of you is secretly sabotaging the pull request.</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Room Controls & Settings (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Room Status Card */}
          <div className="glass-panel-glow rounded-2xl p-6 relative overflow-hidden">
            <div className="flex items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs uppercase font-mono text-cyan-400 tracking-wider">SECURE ROOM DISPATCH</span>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-3xl font-mono font-black tracking-widest text-white">{roomId}</span>
                  <button
                    onClick={handleCopyCode}
                    className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-mono border border-slate-700"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono text-slate-400 block">LOBBY SIZE</span>
                <span className="text-2xl font-mono font-bold text-indigo-400">{players.length} / 6</span>
              </div>
            </div>

            {/* Challenge Selection */}
            <div className="space-y-3 mb-6">
              <label className="text-xs font-mono uppercase text-slate-300 tracking-wider flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Select Incident Scenario
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onSelectChallenge?.('auth')}
                  className={`p-4 rounded-xl text-left transition-all cursor-pointer ${
                    challengeId === 'auth'
                      ? 'glass-panel-glow border-cyan-500 glow-cyan'
                      : 'glass-card-interactive hover:border-cyan-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-heading font-bold text-sm text-white">Nimbus Auth Gateway</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">MEDIUM</span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">
                    Broken token expiry boundary, status code mismatch, and guest permission crashes.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectChallenge?.('pipeline')}
                  className={`p-4 rounded-xl text-left transition-all cursor-pointer ${
                    challengeId === 'pipeline'
                      ? 'glass-panel-rose border-rose-500 glow-rose'
                      : 'glass-card-interactive-rose hover:border-rose-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-heading font-bold text-sm text-white">Nimbus Telemetry Stream</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">HARD</span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">
                    Priority sort comparator bugs, reduce initialization crash, and alert filter leaks.
                  </p>
                </button>
              </div>
            </div>

            {/* Shift Duration Setting */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400" /> Shift Duration (Timer)</span>
                <span className="text-cyan-400 font-bold">{Math.floor(duration / 60)} minutes</span>
              </div>
              <div className="flex gap-2">
                {[300, 480, 600, 720].map((secs) => (
                  <button
                    key={secs}
                    type="button"
                    onClick={() => { setDuration(secs); sound.playClick(); }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all cursor-pointer ${
                      duration === secs
                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-950/60'
                        : 'glass-card-interactive text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {Math.floor(secs / 60)}m
                  </button>
                ))}
              </div>
            </div>

            {/* 15-Second Matchmaking & NPC Auto-Fill Status Banner */}
            {players.length < 4 && (
              <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-indigo-950/50 via-purple-950/40 to-slate-900/80 border border-indigo-500/30 glow-indigo space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                    <span className="text-xs font-mono font-bold tracking-wider text-cyan-300 uppercase">
                      Online Matchmaking Active
                    </span>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold">
                    {autoFillCountdown !== undefined && autoFillCountdown !== null && autoFillCountdown > 0
                      ? `AI Auto-Fill in ${autoFillCountdown}s`
                      : 'AI Squad Activated'}
                  </span>
                </div>

                <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-rose-400 h-full transition-all duration-1000"
                    style={{
                      width: `${Math.max(0, Math.min(100, (1 - (autoFillCountdown ?? 15) / 15) * 100))}%`
                    }}
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-slate-300">
                  <span>
                    Waiting for players to join. If squad isn't filled in 15s, autonomous AI agents join.
                  </span>
                  <button
                    type="button"
                    onClick={onAddNpc}
                    disabled={players.length >= 6}
                    className="self-start sm:self-auto px-3 py-1 rounded-lg bg-indigo-600/70 hover:bg-indigo-600 text-white font-mono text-xs border border-indigo-400/50 flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-40 shrink-0"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add AI Squadmate</span>
                  </button>
                </div>
              </div>
            )}

            {/* Start Game Button */}
            <div className="space-y-3">
              <button
                onClick={() => onStart(duration)}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-heading font-black text-lg tracking-wide shadow-xl shadow-rose-600/30 hover:shadow-rose-600/50 transition-all flex items-center justify-center gap-3 cursor-pointer group"
              >
                <Play className="w-5 h-5 fill-current transition-transform group-hover:scale-110" />
                <span>COMMENCE SHIFT (START GAME)</span>
              </button>

              {players.length === 1 && (
                <p className="text-center text-xs text-amber-400/90 font-mono flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Solo Sandbox Mode enabled. AI squadmates will auto-fill in {autoFillCountdown || 15}s or click "Add AI Squadmate"!
                </p>
              )}
            </div>
          </div>

          {/* Join Another Room Form */}
          <div className="glass-panel rounded-2xl p-5">
            <h3 className="text-sm font-mono uppercase text-slate-300 mb-3 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-400" /> Switch / Join Another Room
            </h3>
            <form onSubmit={handleJoinExisting} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Enter 6-char Room Code"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                maxLength={6}
                className="px-4 py-2.5 rounded-xl glass-input font-mono uppercase tracking-wider text-sm text-white focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={!roomInput.trim()}
                className="px-5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white font-medium text-sm border border-slate-600/70 cursor-pointer disabled:opacity-50 transition-all shadow-sm"
              >
                Join Room
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Player Manifest & Role Guide (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Roster */}
          <div className="glass-panel rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
              <h3 className="font-heading font-bold text-white flex items-center gap-2 text-base">
                <Users className="w-4 h-4 text-cyan-400" /> Engineering Squad ({players.length}/6)
              </h3>
              <div className="flex items-center gap-2">
                {players.length < 6 && (
                  <button
                    onClick={onAddNpc}
                    className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-cyan-300 text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
                    title="Add AI teammate"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>+AI</span>
                  </button>
                )}
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Live
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              {players.map((p, idx) => {
                const isMe = p.id === myId;
                const isBot = !!p.isNpc;
                const initials = p.name.slice(0, 2).toUpperCase();
                return (
                  <div
                    key={p.id || idx}
                    className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                      isMe 
                        ? 'glass-card-interactive border-indigo-500/60 shadow-indigo-950/40' 
                        : isBot
                        ? 'glass-card-interactive border-cyan-500/30'
                        : 'glass-card-interactive'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-sm ${
                        isMe 
                          ? 'bg-indigo-600 text-white shadow-sm' 
                          : isBot 
                          ? 'bg-cyan-950 border border-cyan-500/40 text-cyan-300'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {isBot ? <Bot className="w-4 h-4 text-cyan-400" /> : initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-white">{p.name}</span>
                          {isMe && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">YOU</span>
                          )}
                          {isBot && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                              <Zap className="w-2.5 h-2.5" /> AI NPC
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {isBot
                            ? (p.personality || 'Autonomous Agent')
                            : idx === 0 ? 'Lead Engineer (Host)' : 'Staff Engineer'}
                        </span>
                      </div>
                    </div>

                    <span className="text-xs font-mono text-emerald-400/90 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Ready
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* The Two Roles Graphic Card (As shown in user diagrams) */}
          <div className="glass-panel rounded-2xl p-5 space-y-4">
            <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-slate-300 text-center">
              THE TWO ROLES (ASYMMETRIC DEDUCTION)
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {/* Engineer Card */}
              <div className="p-3.5 rounded-xl glass-card-interactive border-blue-500/40 space-y-2 text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-blue-600/25 border border-blue-500/50 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-400" />
                </div>
                <h4 className="font-heading font-bold text-sm text-blue-300">Engineer</h4>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Genuinely fixing the codebase and racing the test suite.
                </p>
                <div className="pt-2 border-t border-white/10 text-[10px] text-blue-300/80 font-mono">
                  Wins: All tests pass, OR Saboteur voted out in time.
                </div>
              </div>

              {/* Saboteur Card */}
              <div className="p-3.5 rounded-xl glass-card-interactive-rose border-rose-500/40 space-y-2 text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-rose-600/25 border border-rose-500/50 flex items-center justify-center">
                  <Bug className="w-5 h-5 text-rose-400" />
                </div>
                <h4 className="font-heading font-bold text-sm text-rose-300">Saboteur</h4>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Secretly keeps code broken while pretending to help.
                </p>
                <div className="pt-2 border-t border-white/10 text-[10px] text-rose-300/80 font-mono">
                  Wins: Timer ends with tests failing & never caught.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
