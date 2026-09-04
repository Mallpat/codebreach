import React, { useState } from 'react';
import { Shield, Bug, Users, Volume2, VolumeX, Copy, Check, Clock, AlertTriangle } from 'lucide-react';
import { sound } from '../utils/audio';

export function Navbar({ gameState, myRole, myPlayerName }) {
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = useState(sound.muted);

  const copyRoomCode = () => {
    if (!gameState?.roomId) return;
    navigator.clipboard.writeText(gameState.roomId);
    setCopied(true);
    sound.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSound = () => {
    const isMuted = sound.toggleMute();
    setMuted(isMuted);
  };

  const formatTimer = (seconds) => {
    if (seconds === undefined || seconds === null) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseBadge = () => {
    if (!gameState) return null;
    switch (gameState.phase) {
      case 'lobby':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-300 border border-slate-700">LOBBY</span>;
      case 'handoff':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 animate-pulse">INCIDENT BRIEFING</span>;
      case 'work':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">THE WORK SESSION</span>;
      case 'standup':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">DAILY STANDUP</span>;
      case 'deadline':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">THE DEADLINE</span>;
      case 'end':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/40">POSTMORTEM</span>;
      default:
        return null;
    }
  };

  return (
    <header className="border-b border-white/[0.08] bg-[#070b14]/75 backdrop-blur-xl sticky top-0 z-40 px-4 py-2.5 transition-all shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.06)]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-black text-lg tracking-wider text-white">CODE<span className="text-rose-500">BREACH</span></span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded glass-pill text-cyan-400 border-cyan-500/30">v1.0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Shift Timer & Phase */}
        {gameState && gameState.phase !== 'lobby' && (
          <div className="flex items-center gap-3">
            {getPhaseBadge()}
            {gameState.timer !== undefined && gameState.timer !== null && (
              <span className={`px-3 py-1 rounded-lg font-mono font-bold text-sm flex items-center gap-1.5 border glass-panel ${
                gameState.timer <= 60 
                  ? 'border-rose-500/60 text-rose-400 animate-pulse glow-rose' 
                  : 'border-cyan-500/30 text-cyan-300'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTimer(gameState.timer)}</span>
              </span>
            )}
          </div>
        )}

        {/* Right: Room Code & Player Pill & Audio */}
        <div className="flex items-center gap-2.5">
          {gameState?.roomId && (
            <button
              onClick={copyRoomCode}
              title="Click to copy room code"
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg glass-card-interactive text-xs font-mono text-slate-300 cursor-pointer group"
            >
              <span className="text-slate-400">ROOM:</span>
              <span className="font-bold text-cyan-400 tracking-wider group-hover:text-cyan-300">{gameState.roomId}</span>
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            </button>
          )}

          {gameState?.players && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg glass-pill text-xs text-slate-300 font-mono">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>{gameState.players.length} online</span>
            </div>
          )}

          {myRole && gameState?.phase !== 'end' && (
            <div className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 border ${
              myRole === 'saboteur'
                ? 'bg-rose-950/50 text-rose-300 border-rose-500/60 shadow-sm shadow-rose-950'
                : 'bg-cyan-950/50 text-cyan-300 border-cyan-500/50'
            }`}>
              {myRole === 'saboteur' ? (
                <>
                  <Bug className="w-3 h-3 text-rose-400" />
                  <span>SABOTEUR</span>
                </>
              ) : (
                <>
                  <Shield className="w-3 h-3 text-cyan-400" />
                  <span>ENGINEER</span>
                </>
              )}
            </div>
          )}

          <button
            onClick={toggleSound}
            title={muted ? 'Unmute audio' : 'Mute audio'}
            className="p-1.5 rounded-lg glass-card-interactive text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </div>
    </header>
  );
}
